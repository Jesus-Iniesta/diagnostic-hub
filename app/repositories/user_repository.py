from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.role import Role
from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        role_name: str | None = None,
        busqueda: str | None = None,
        activo: bool | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[User], int]:
        conditions = []

        if role_name:
            conditions.append(Role.name == role_name)

        if busqueda:
            term = f"%{busqueda}%"
            conditions.append(
                or_(
                    User.nombre.ilike(term),
                    User.apellido_paterno.ilike(term),
                    User.apellido_materno.ilike(term),
                    User.correo_personal.ilike(term),
                )
            )

        if activo is not None:
            conditions.append(User.activo == activo)

        query = select(User)
        if role_name:
            query = query.join(Role, User.role_id == Role.id)

        result = await self.db.execute(
            query.where(*conditions)
            .options(selectinload(User.role).selectinload(Role.permissions))
            .order_by(User.id)
            .offset(offset)
            .limit(limit)
        )
        items = list(result.scalars().unique().all())

        count_query = select(func.count()).select_from(User)
        if role_name:
            count_query = count_query.join(Role, User.role_id == Role.id)
        count_query = count_query.where(*conditions)
        total = (await self.db.execute(count_query)).scalar_one()

        return items, total

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role).selectinload(Role.permissions))
            .where(
                or_(
                    User.correo_personal == email,
                    User.correo_institucional == email,
                )
            )
        )
        return result.scalars().first()

    async def get_by_rfc(self, rfc: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role).selectinload(Role.permissions))
            .where(User.rfc == rfc)
        )
        return result.scalars().first()

    async def get_user_for_login(self, identifier: str) -> User | None:
        email_user = await self.get_by_email(identifier)
        if email_user and email_user.role and email_user.role.name != "profesor":
            return email_user

        rfc_user = await self.get_by_rfc(identifier)
        if rfc_user and rfc_user.role and rfc_user.role.name == "profesor":
            return rfc_user

        return None

    async def get_alumno_por_numero_cuenta(self, numero: str) -> Alumno | None:
        result = await self.db.execute(
            select(Alumno)
            .options(selectinload(Alumno.usuario).selectinload(User.role))
            .where(
                or_(
                    Alumno.numero_cuenta == numero,
                    Alumno.numero_folio == numero,
                )
            )
        )
        return result.scalars().first()