from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.role import Role
from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

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