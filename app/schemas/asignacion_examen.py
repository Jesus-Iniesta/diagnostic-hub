from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.alumno import AlumnoRead
from app.schemas.examen import ExamenRead
from app.schemas.intento_presentacion import IntentoPresentacionRead


class AsignacionExamenBase(BaseModel):
    examen_id: int
    alumno_id: int
    asignado_por: int
    estado: int = 1


class AsignacionExamenCreate(AsignacionExamenBase):
    pass


class AsignacionExamenUpdate(BaseModel):
    estado: int | None = None


class AsignacionExamenRead(AsignacionExamenBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha_asignacion: datetime
    examen: ExamenRead
    alumno: AlumnoRead
    intentos: list[IntentoPresentacionRead] = []