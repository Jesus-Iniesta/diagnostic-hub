from pydantic import BaseModel, ConfigDict

from app.schemas.pregunta import PreguntaRead


class ModuloBase(BaseModel):
    examen_id: int
    clave: str
    nombre: str
    orden: int
    total_preguntas: int
    activo: bool = True


class ModuloCreate(ModuloBase):
    pass


class ModuloUpdate(BaseModel):
    examen_id: int | None = None
    clave: str | None = None
    nombre: str | None = None
    orden: int | None = None
    total_preguntas: int | None = None
    activo: bool | None = None


class ModuloRead(ModuloBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preguntas: list[PreguntaRead] = []