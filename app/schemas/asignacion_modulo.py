from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.modulo import ModuloRead


class AsignacionModuloBase(BaseModel):
    intento_id: int
    modulo_id: int
    puntaje: Decimal | None = None
    correctas: int | None = None
    total: int | None = None


class AsignacionModuloCreate(AsignacionModuloBase):
    pass


class AsignacionModuloUpdate(BaseModel):
    intento_id: int | None = None
    modulo_id: int | None = None
    puntaje: Decimal | None = None
    correctas: int | None = None
    total: int | None = None


class AsignacionModuloRead(AsignacionModuloBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    modulo: ModuloRead