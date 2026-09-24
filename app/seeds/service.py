from contextlib import asynccontextmanager

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base import Base
from app.core.database import async_session, engine
from app.core.security import hash_password
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.grupo_profesor import grupo_profesor
from app.models.grupo_alumno import grupo_alumno
from app.models.ingenieria import Ingenieria
from app.models.materia import Materia
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import role_permissions
from app.models.user import AuthMethod, User
from app.seeds.data.alumnos import ALUMNOS
from app.seeds.data.grupos import GRUPOS, GRUPO_PROFESORES, GRUPO_ALUMNOS
from app.seeds.data.ingenierias import INGENIERIAS
from app.seeds.data.materias import MATERIAS_DATA
from app.seeds.data.permissions import PERMISSIONS
from app.seeds.data.respuestas_diagnostico import DEFAULT_RESPUESTAS
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
                    if data.get("rfc") and not exists.rfc:
                        exists.rfc = data["rfc"]
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
                    rfc=data.get("rfc"),
                    auth_method=AuthMethod(data["auth_method"]),
                    hashed_password=hash_password(data["password"]),
                    role_id=role.id if role else None,
                )
                db.add(user)
                created += 1
    return created


async def run_seed_ingenierias() -> int:
    async with async_session() as db:
        created = 0
        async with atomic_session(db):
            for data in INGENIERIAS:
                exists = await db.scalar(
                    select(Ingenieria).where(Ingenieria.clave == data["clave"])
                )
                if not exists:
                    db.add(
                        Ingenieria(clave=data["clave"], nombre=data["nombre"])
                    )
                    created += 1
    return created


async def run_seed_materias() -> int:
    async with async_session() as db:
        created = 0
        async with atomic_session(db):
            for clave, nombre in MATERIAS_DATA:
                exists = await db.scalar(
                    select(Materia).where(Materia.clave == clave)
                )
                if not exists:
                    db.add(Materia(clave=clave, nombre=nombre, activo=True))
                    created += 1
    return created


async def run_seed_alumnos() -> int:
    async with async_session() as db:
        created = 0
        async with atomic_session(db):
            for data in ALUMNOS:
                user = await db.scalar(
                    select(User).where(User.correo_personal == data["usuario_correo"])
                )
                if not user:
                    continue
                exists = await db.scalar(
                    select(Alumno).where(
                        or_(
                            Alumno.numero_cuenta == data["numero_cuenta"],
                            Alumno.numero_folio == data.get("numero_folio"),
                        )
                    )
                )
                if exists:
                    continue
                ingenieria = await db.scalar(
                    select(Ingenieria).where(Ingenieria.clave == data["ingenieria_clave"])
                )
                alumno = Alumno(
                    usuario_id=user.id,
                    ingenieria_id=ingenieria.id if ingenieria else None,
                    numero_cuenta=data.get("numero_cuenta"),
                    numero_folio=data.get("numero_folio"),
                    periodo_ingreso=data["periodo_ingreso"],
                )
                db.add(alumno)
                created += 1
    return created


async def run_seed_respuestas_diagnostico(periodo: str = "2022B") -> int:
    from app.models.respuesta_correcta_diagnostico import RespuestaCorrectaDiagnostico

    async with async_session() as db:
        created = 0
        async with atomic_session(db):
            for materia, answers in DEFAULT_RESPUESTAS.items():
                for codigo, respuesta in answers.items():
                    exists = await db.scalar(
                        select(RespuestaCorrectaDiagnostico).where(
                            RespuestaCorrectaDiagnostico.materia == materia,
                            RespuestaCorrectaDiagnostico.codigo == codigo,
                            RespuestaCorrectaDiagnostico.periodo == periodo,
                        )
                    )
                    if exists:
                        continue
                    db.add(RespuestaCorrectaDiagnostico(
                        materia=materia,
                        codigo=codigo,
                        respuesta_correcta=respuesta.lower(),
                        periodo=periodo,
                    ))
                    created += 1
    return created


async def run_seed_grupos() -> dict:
    async with async_session() as db:
        created_grupos = 0
        linked_profesores = 0
        linked_alumnos = 0
        async with atomic_session(db):
            for data in GRUPOS:
                exists = await db.scalar(
                    select(Grupo).where(
                        Grupo.nombre == data["nombre"],
                        Grupo.periodo == data["periodo"],
                    )
                )
                if exists:
                    continue
                materia = await db.scalar(
                    select(Materia).where(
                        Materia.clave == data["materia_clave"]
                    )
                )
                if not materia:
                    continue
                grupo = Grupo(
                    nombre=data["nombre"],
                    materia_id=materia.id,
                    periodo=data["periodo"],
                )
                db.add(grupo)
                await db.flush()
                created_grupos += 1

            for data in GRUPO_PROFESORES:
                grupo = await db.scalar(
                    select(Grupo).where(
                        Grupo.nombre == data["grupo_nombre"],
                        Grupo.periodo == "2026B",
                    )
                )
                user = await db.scalar(
                    select(User).where(
                        User.correo_personal == data["profesor_correo"]
                    )
                )
                if not grupo or not user:
                    continue
                exists = await db.execute(
                    select(grupo_profesor).where(
                        grupo_profesor.c.grupo_id == grupo.id,
                        grupo_profesor.c.user_id == user.id,
                    )
                )
                if exists.first():
                    continue
                await db.execute(
                    grupo_profesor.insert().values(
                        grupo_id=grupo.id, user_id=user.id
                    )
                )
                linked_profesores += 1

            for data in GRUPO_ALUMNOS:
                grupo = await db.scalar(
                    select(Grupo).where(
                        Grupo.nombre == data["grupo_nombre"],
                        Grupo.periodo == "2026B",
                    )
                )
                alumno = await db.scalar(
                    select(Alumno).where(
                        Alumno.numero_cuenta == data["alumno_numero_cuenta"]
                    )
                )
                if not grupo or not alumno:
                    continue
                exists = await db.execute(
                    select(grupo_alumno).where(
                        grupo_alumno.c.grupo_id == grupo.id,
                        grupo_alumno.c.alumno_id == alumno.id,
                        grupo_alumno.c.periodo == data["periodo"],
                    )
                )
                if exists.first():
                    continue
                await db.execute(
                    grupo_alumno.insert().values(
                        grupo_id=grupo.id,
                        alumno_id=alumno.id,
                        periodo=data["periodo"],
                    )
                )
                linked_alumnos += 1

    return {
        "grupos": created_grupos,
        "profesores_vinculados": linked_profesores,
        "alumnos_vinculados": linked_alumnos,
    }


async def run_all() -> dict:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    p = await run_seed_permissions()
    r = await run_seed_roles()
    i = await run_seed_ingenierias()
    m = await run_seed_materias()
    u = await run_seed_users()
    a = await run_seed_alumnos()
    d = await run_seed_respuestas_diagnostico()
    g = await run_seed_grupos()
    return {
        "permissions": p,
        "roles": r,
        "ingenierias": i,
        "materias": m,
        "users": u,
        "alumnos": a,
        "respuestas_diagnostico": d,
        "grupos": g,
    }