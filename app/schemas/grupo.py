from pydantic import BaseModel


class GrupoCreate(BaseModel):
    nombre: str
    materia_clave: str
    periodo: str


class GrupoAlumnoAdd(BaseModel):
    numero_cuenta: str


class GrupoResponse(BaseModel):
    id: int
    nombre: str
    materia_clave: str
    materia_nombre: str
    periodo: str
    activo: bool
    nombre_archivo: str | None = None
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


class MateriaResponse(BaseModel):
    id: int
    clave: str
    nombre: str

    model_config = {"from_attributes": True}


class NivelDistribucion(BaseModel):
    nivel: str
    cantidad: int
    porcentaje: float


class IngenieriaDistribucion(BaseModel):
    ingenieria: str
    cantidad: int


class PromedioMaterias(BaseModel):
    algebra: float | None = None
    trigonometria: float | None = None
    geometria: float | None = None
    calculo: float | None = None


class GrupoEstadisticas(BaseModel):
    grupo_id: int
    nombre: str
    total_alumnos: int
    evaluados: int
    promedio: float | None = None
    distribucion_nivel: list[NivelDistribucion]
    distribucion_ingenieria: list[IngenieriaDistribucion]
    promedio_materias: PromedioMaterias
