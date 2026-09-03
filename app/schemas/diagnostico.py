from pydantic import BaseModel, ConfigDict, Field


class RespuestaCorrectaBase(BaseModel):
    materia: str = Field(min_length=1, max_length=20)
    codigo: str = Field(min_length=1, max_length=10)
    respuesta_correcta: str = Field(pattern=r"^[abcd]$")
    periodo: str = Field(min_length=1, max_length=10)


class RespuestaCorrectaCreate(RespuestaCorrectaBase):
    pass


class RespuestaCorrectaRead(RespuestaCorrectaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class RespuestaCorrectaBatch(BaseModel):
    respuestas: list[RespuestaCorrectaCreate]


class RespuestaPorCodigo(BaseModel):
    codigo: str
    respuesta: str


class RespuestaAlumnoPorMateria(BaseModel):
    codigo: str
    respuesta: str
    correcta: bool


class DiagnosticoAlumnoResultado(BaseModel):
    alumno_id: int
    nombre_completo: str
    numero_cuenta: str | None
    numero_folio: str | None
    correo: str
    ingenieria: str
    respuestas_algebra: list[RespuestaAlumnoPorMateria] | None = None
    respuestas_trigonometria: list[RespuestaAlumnoPorMateria] | None = None
    respuestas_geometria: list[RespuestaAlumnoPorMateria] | None = None
    respuestas_calculo: list[RespuestaAlumnoPorMateria] | None = None
    puntaje_algebra: float | None = None
    puntaje_trigonometria: float | None = None
    puntaje_geometria: float | None = None
    puntaje_calculo: float | None = None
    promedio_diagnostico: float | None = None


class DiagnosticoNoEncontrado(BaseModel):
    nombre_original: str
    correo: str | None
    cuenta: str | None
    folio: str | None
    materia: str
    motivo: str
    candidatos: list[dict] = []


class ResultadoProcesamientoDiagnostico(BaseModel):
    materia: str
    periodo: str
    total_filas: int
    encontrados: int
    no_encontrados: int
    resultados: list[DiagnosticoAlumnoResultado]
    no_encontrados_detalle: list[DiagnosticoNoEncontrado]


class CorregirMatchingItem(BaseModel):
    indice: int
    alumno_id: int


class CorregirMatchingPayload(BaseModel):
    materia: str
    periodo: str
    correcciones: list[CorregirMatchingItem]


class BuscarAlumnoResult(BaseModel):
    id: int
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    correo: str | None
    numero_cuenta: str | None
    numero_folio: str | None
    ingenieria: str | None


class CrearAlumnoDiagnostico(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido_paterno: str = Field(min_length=1, max_length=100)
    apellido_materno: str = Field(min_length=1, max_length=100)
    correo_personal: str = Field(min_length=5, max_length=200)
    numero_cuenta: str | None = Field(default=None, max_length=7)
    numero_folio: str | None = Field(default=None, max_length=9)
    ingenieria_clave: str | None = Field(default=None, max_length=10)
    periodo: str = Field(min_length=1, max_length=10)
