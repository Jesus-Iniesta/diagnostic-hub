from pydantic import BaseModel


class FilaResultadoResponse(BaseModel):
    fila: int
    nombre_completo: str
    numero_cuenta: str | None
    estado: str
    motivo: str


class ResultadoCargaResponse(BaseModel):
    total_filas: int
    exitosos: int
    duplicados: int
    errores: int
    detalle: list[FilaResultadoResponse]
