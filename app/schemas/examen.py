from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.modulo import ModuloRead
from app.schemas.user import UserRead


class ExamenBase(BaseModel):
    creado_por_id: int
    titulo: str
    descripcion: str | None = None
    periodo: str
    total_preguntas: int
    estado: bool = True
    fecha_aplicacion: date | None = None
    fecha_cierre: date | None = None


class ExamenCreate(ExamenBase):
    pass


class ExamenUpdate(BaseModel):
    creado_por_id: int | None = None
    titulo: str | None = None
    descripcion: str | None = None
    periodo: str | None = None
    total_preguntas: int | None = None
    estado: bool | None = None
    fecha_aplicacion: date | None = None
    fecha_cierre: date | None = None


class ExamenRead(ExamenBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    creado_por: UserRead
    modulos: list[ModuloRead] = []