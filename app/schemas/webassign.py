from pydantic import BaseModel


class WebAssignAlumnoResultado(BaseModel):
    alumno_id: int
    nombre_completo: str
    numero_cuenta: str | None
    correo: str | None
    ingenieria: str | None
    carrera: str
    algebra_trabajo: float | None = None
    algebra_examen: float | None = None
    trigonometria_trabajo: float | None = None
    trigonometria_examen: float | None = None
    geometria_trabajo: float | None = None
    geometria_examen: float | None = None
    promedio: float | None = None


class WebAssignNoEncontrado(BaseModel):
    nombre_original: str
    correo: str | None
    motivo: str
    candidatos: list[dict] = []


class ResultadoProcesamientoWebAssign(BaseModel):
    carrera: str
    periodo: str
    total_filas: int
    encontrados: int
    no_encontrados: int
    resultados: list[WebAssignAlumnoResultado]
    no_encontrados_detalle: list[WebAssignNoEncontrado]


class CorregirMatchingWebAssignItem(BaseModel):
    indice: int
    alumno_id: int


class CorregirMatchingWebAssignPayload(BaseModel):
    carrera: str
    periodo: str
    correcciones: list[CorregirMatchingWebAssignItem]


class WebAssignStatusCarrera(BaseModel):
    carrera: str
    total_alumnos: int


class WebAssignStatus(BaseModel):
    total_registros: int
    por_carrera: list[WebAssignStatusCarrera]
