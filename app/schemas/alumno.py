from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.ingenieria import IngenieriaRead
from app.schemas.user import UserRead


class AlumnoBase(BaseModel):
    usuario_id: int
    ingenieria_id: int
    numero_cuenta: str | None = None
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
    numero_cuenta: str | None = None
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


class AlumnoListResponse(BaseModel):
    items: list[AlumnoRead]
    total: int
    limit: int
    offset: int


class MateriaResultado(BaseModel):
    materia: str
    nombre: str
    puntaje: float | None
    maximo: float = 10.0
    nivel: str
    retroalimentacion: str


class DiagnosticoAlumnoResponse(BaseModel):
    periodo: str
    promedio: float | None
    nivel_general: str
    retroalimentacion_general: str
    materias: list[MateriaResultado]


class CuestionarioMateriaResultado(BaseModel):
    materia: str
    nombre: str
    aciertos_c1: int | None
    aciertos_c2: int | None
    preguntas_por_cuestionario: int = 10
    calificacion: float | None
    maximo: float = 10.0
    nivel: str


class CuestionarioAlumnoResponse(BaseModel):
    """Examen diagnóstico (cuestionarios 1 y 2) del alumno."""

    periodo: str
    promedio: float | None
    nivel_general: str
    materias: list[CuestionarioMateriaResultado]
