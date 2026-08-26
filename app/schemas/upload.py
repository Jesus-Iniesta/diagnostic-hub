from pydantic import BaseModel


class CampoError(BaseModel):
    campo: str
    motivo: str


class FilaResultadoResponse(BaseModel):
    fila: int
    nombre_completo: str
    numero_cuenta: str | None
    estado: str
    motivo: str
    campos_con_error: list[CampoError] = []
    datos_originales: dict = {}


class ResultadoCargaResponse(BaseModel):
    total_filas: int
    exitosos: int
    duplicados: int
    errores: int
    detalle: list[FilaResultadoResponse]


class FilaCorregida(BaseModel):
    fila: int
    datos: dict


class CorreccionUpload(BaseModel):
    filas: list[FilaCorregida]
