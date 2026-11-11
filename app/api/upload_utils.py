"""Utilidades compartidas por los endpoints de carga de Excel."""

import logging

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

MAX_EXCEL_BYTES = 10 * 1024 * 1024  # 10 MB
_CHUNK = 1024 * 1024

MENSAJE_ERROR_INTERNO = (
    "No se pudo procesar el archivo. Revisa que tenga el formato correcto "
    "e inténtalo de nuevo; si el problema continúa, contacta a soporte."
)


async def leer_archivo(file: UploadFile, max_bytes: int = MAX_EXCEL_BYTES) -> bytes:
    """Lee el archivo subido; rechaza (413) los que pasan de `max_bytes` sin cargarlos completos."""
    partes: list[bytes] = []
    total = 0
    while chunk := await file.read(_CHUNK):
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"El archivo es demasiado grande. El máximo permitido es {max_bytes // (1024 * 1024)} MB.",
            )
        partes.append(chunk)
    return b"".join(partes)


def error_interno(exc: Exception) -> HTTPException:
    """500 con mensaje genérico; el detalle de la excepción solo va al log."""
    logger.error("Error al procesar archivo", exc_info=exc)
    return HTTPException(status_code=500, detail=MENSAJE_ERROR_INTERNO)
