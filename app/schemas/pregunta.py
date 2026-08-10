from pydantic import BaseModel, ConfigDict


class PreguntaBase(BaseModel):
    modulo_id: int
    codigo: str
    enunciado: str | None = None
    opcion_a: str | None = None
    opcion_b: str | None = None
    opcion_c: str | None = None
    opcion_d: str | None = None
    respuesta_correcta: str
    orden: int


class PreguntaCreate(PreguntaBase):
    pass


class PreguntaUpdate(BaseModel):
    modulo_id: int | None = None
    codigo: str | None = None
    enunciado: str | None = None
    opcion_a: str | None = None
    opcion_b: str | None = None
    opcion_c: str | None = None
    opcion_d: str | None = None
    respuesta_correcta: str | None = None
    orden: int | None = None


class PreguntaRead(PreguntaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int