from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LigaExamenDiagnosticoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1)
    descripcion: str | None = None
    visible: bool = True
    orden: int = 0


class LigaExamenDiagnosticoCreate(LigaExamenDiagnosticoBase):
    pass


class LigaExamenDiagnosticoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    url: str | None = Field(default=None, min_length=1)
    descripcion: str | None = None
    visible: bool | None = None
    orden: int | None = None


class LigaExamenDiagnosticoRead(LigaExamenDiagnosticoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LigaExamenDiagnosticoListResponse(BaseModel):
    items: list[LigaExamenDiagnosticoRead]
    total: int
