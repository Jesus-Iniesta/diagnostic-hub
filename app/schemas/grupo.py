from pydantic import BaseModel


class GrupoCreate(BaseModel):
    nombre: str
    ingenieria_clave: str
    periodo: str


class GrupoAlumnoAdd(BaseModel):
    numero_cuenta: str


class GrupoResponse(BaseModel):
    id: int
    nombre: str
    ingenieria_clave: str
    ingenieria_nombre: str
    periodo: str
    activo: bool
    total_alumnos: int = 0
    alumnos_con_resultados: int = 0

    model_config = {"from_attributes": True}


class GrupoAlumnoResponse(BaseModel):
    alumno_id: int
    nombre: str
    numero_cuenta: str
    ingenieria_clave: str
    puntaje: float | None = None
    nivel: str | None = None

    model_config = {"from_attributes": True}


class GrupoResumen(BaseModel):
    grupo_id: int
    nombre: str
    total_alumnos: int
    evaluados: int
    promedio: float | None = None
    alumnos_con_resultados: int
