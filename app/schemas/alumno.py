from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.ingenieria import IngenieriaRead
from app.schemas.user import UserRead


class AlumnoBase(BaseModel):
    usuario_id: int
    ingenieria_id: int
    numero_folio: str | None = None
    periodo_ingreso: str
    promedio_bachillerato: float | None = None
    indice_uaem: float | None = None
    lugar_admision: int | None = None
    escuela_procedencia: str | None = None
    tiene_internet: bool | None = None
    tiene_computadora: bool | None = None
    vulnerabilidad_economica: bool | None = None
    es_foraneo: bool | None = None
    convivencia: str | None = None


class AlumnoCreate(AlumnoBase):
    pass


class AlumnoUpdate(BaseModel):
    usuario_id: int | None = None
    ingenieria_id: int | None = None
    numero_folio: str | None = None
    periodo_ingreso: str | None = None
    promedio_bachillerato: float | None = None
    indice_uaem: float | None = None
    lugar_admision: int | None = None
    escuela_procedencia: str | None = None
    tiene_internet: bool | None = None
    tiene_computadora: bool | None = None
    vulnerabilidad_economica: bool | None = None
    es_foraneo: bool | None = None
    convivencia: str | None = None


class AlumnoRead(AlumnoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    usuario: UserRead
    ingenieria: IngenieriaRead