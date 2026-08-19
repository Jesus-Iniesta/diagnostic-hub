from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configuracion import Configuracion

REGISTRO_HABILITADO_KEY = "registro_habilitado"


class ConfiguracionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, key: str) -> str | None:
        result = await self.db.execute(
            select(Configuracion).where(Configuracion.key == key)
        )
        row = result.scalar_one_or_none()
        return row.value if row else None

    async def set(self, key: str, value: str) -> None:
        result = await self.db.execute(
            select(Configuracion).where(Configuracion.key == key)
        )
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            self.db.add(Configuracion(key=key, value=value))
        await self.db.commit()

    async def is_registro_habilitado(self) -> bool:
        value = await self.get(REGISTRO_HABILITADO_KEY)
        return (value or "false").lower() == "true"