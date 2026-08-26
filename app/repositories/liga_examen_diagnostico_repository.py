from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.liga_examen_diagnostico import LigaExamenDiagnostico
from app.schemas.liga_examen_diagnostico import (
    LigaExamenDiagnosticoCreate,
    LigaExamenDiagnosticoUpdate,
)


class LigaExamenDiagnosticoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self, solo_visibles: bool = False
    ) -> tuple[list[LigaExamenDiagnostico], int]:
        conditions = []
        if solo_visibles:
            conditions.append(LigaExamenDiagnostico.visible == True)  # noqa: E712

        query = select(LigaExamenDiagnostico)
        count_query = select(func.count()).select_from(LigaExamenDiagnostico)

        if conditions:
            query = query.where(*conditions)
            count_query = count_query.where(*conditions)

        result = await self.db.execute(
            query.order_by(LigaExamenDiagnostico.orden, LigaExamenDiagnostico.id)
        )
        items = list(result.scalars().all())

        total = (await self.db.execute(count_query)).scalar_one()

        return items, total

    async def get_by_id(self, liga_id: int) -> LigaExamenDiagnostico | None:
        result = await self.db.execute(
            select(LigaExamenDiagnostico).where(LigaExamenDiagnostico.id == liga_id)
        )
        return result.scalars().first()

    async def create(self, data: LigaExamenDiagnosticoCreate) -> LigaExamenDiagnostico:
        liga = LigaExamenDiagnostico(**data.model_dump())
        self.db.add(liga)
        await self.db.commit()
        await self.db.refresh(liga)
        return liga

    async def update(
        self, liga_id: int, data: LigaExamenDiagnosticoUpdate
    ) -> LigaExamenDiagnostico | None:
        liga = await self.get_by_id(liga_id)
        if liga is None:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(liga, key, value)
        await self.db.commit()
        await self.db.refresh(liga)
        return liga

    async def delete(self, liga_id: int) -> bool:
        liga = await self.get_by_id(liga_id)
        if liga is None:
            return False
        await self.db.delete(liga)
        await self.db.commit()
        return True
