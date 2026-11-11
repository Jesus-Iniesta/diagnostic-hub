"""Límite de tamaño y errores genéricos en la carga de Excel."""

import asyncio
import io

import pytest
from fastapi import HTTPException, UploadFile

from app.api.upload_utils import MAX_EXCEL_BYTES, MENSAJE_ERROR_INTERNO, error_interno, leer_archivo


def _archivo(n: int) -> UploadFile:
    return UploadFile(io.BytesIO(b"x" * n), filename="a.xlsx")


def test_acepta_archivo_dentro_del_limite():
    assert len(asyncio.run(leer_archivo(_archivo(MAX_EXCEL_BYTES)))) == MAX_EXCEL_BYTES


def test_rechaza_archivo_mayor_a_10_mb():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(leer_archivo(_archivo(MAX_EXCEL_BYTES + 1)))
    assert exc.value.status_code == 413


def test_error_interno_no_muestra_el_detalle():
    err = error_interno(ValueError("secreto: tabla usuarios"))
    assert err.status_code == 500
    assert err.detail == MENSAJE_ERROR_INTERNO
    assert "secreto" not in err.detail
