from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.materia import Materia


class MateriaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self) -> list[Materia]:
        result = await self.db.execute(
            select(Materia).where(Materia.activo).order_by(Materia.nombre)
        )
        return list(result.scalars().all())

    async def get_by_clave(self, clave: str) -> Materia | None:
        result = await self.db.execute(
            select(Materia).where(Materia.clave == clave)
        )
        return result.scalars().first()
