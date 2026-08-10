from contextlib import asynccontextmanager

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base import Base
from app.core.database import async_session, engine
from app.core.security import hash_password
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import role_permissions
from app.models.user import AuthMethod, User
from app.seeds.data.permissions import PERMISSIONS
from app.seeds.data.roles import ROLES
from app.seeds.data.users import USERS


@asynccontextmanager
async def atomic_session(db: AsyncSession):
    """Provide a transactional scope around a series of operations."""
    try:
        yield
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


async def run_seed_permissions() -> int:
    async with async_session() as db:
        created = 0
        async with atomic_session(db):
            for data in PERMISSIONS:
                exists = await db.scalar(
                    select(Permission).where(Permission.name == data["name"])
                )
                if not exists:
                    db.add(Permission(name=data["name"], description=data["description"]))
                    created += 1
    return created


async def run_seed_roles() -> int:
    async with async_session() as db:
        created = 0
        linked = 0
        async with atomic_session(db):
            for data in ROLES:
                role = await db.scalar(
                    select(Role).where(Role.name == data["name"])
                )
                if not role:
                    role = Role(name=data["name"], description=data["description"])
                    db.add(role)
                    await db.flush()
                    created += 1
                else:
                    role.description = data["description"]

                existing_permission_ids = set(
                    (
                        await db.execute(
                            select(role_permissions.c.permission_id).where(
                                role_permissions.c.role_id == role.id
                            )
                        )
                    ).scalars()
                )

                for pname in data["permissions"]:
                    perm = await db.scalar(
                        select(Permission).where(Permission.name == pname)
                    )
                    if perm and perm.id not in existing_permission_ids:
                        await db.execute(
                            role_permissions.insert().values(
                                role_id=role.id, permission_id=perm.id
                            )
                        )
                        linked += 1
    return created + linked


async def run_seed_users() -> int:
    async with async_session() as db:
        created = 0
        async with atomic_session(db):
            for data in USERS:
                exists = await db.scalar(
                    select(User).where(User.correo_personal == data["correo_personal"])
                )
                if exists:
                    continue
                role = await db.scalar(
                    select(Role).where(Role.name == data["role"])
                )
                user = User(
                    nombre=data["nombre"],
                    apellido_paterno=data["apellido_paterno"],
                    apellido_materno=data["apellido_materno"],
                    correo_personal=data["correo_personal"],
                    correo_institucional=data["correo_institucional"],
                    auth_method=AuthMethod(data["auth_method"]),
                    hashed_password=hash_password(data["password"]),
                    role_id=role.id if role else None,
                )
                db.add(user)
                created += 1
    return created


async def run_all() -> dict:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    p = await run_seed_permissions()
    r = await run_seed_roles()
    u = await run_seed_users()
    return {"permissions": p, "roles": r, "users": u}