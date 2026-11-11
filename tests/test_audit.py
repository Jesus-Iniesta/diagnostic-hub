"""Registro de accesos en el log."""

import logging

import pytest

from app.core import audit


@pytest.fixture
def lineas():
    capturadas: list[str] = []

    class H(logging.Handler):
        def emit(self, record):
            capturadas.append(record.getMessage())

    h = H()
    audit.logger.addHandler(h)
    yield capturadas
    audit.logger.removeHandler(h)


def test_registra_evento_con_todos_los_datos(lineas):
    audit.registrar_acceso("login", "exito", "alumno", "1724300", "10.0.0.5")
    assert lineas == ["acceso evento=login resultado=exito rol=alumno usuario=1724300 ip=10.0.0.5"]


def test_fallo_sin_rol_conocido(lineas):
    audit.registrar_acceso("login", "fallo", None, "x@y.mx", "1.1.1.1")
    assert "rol=desconocido" in lineas[0] and "resultado=fallo" in lineas[0]


def test_usuario_no_puede_falsear_el_log(lineas):
    audit.registrar_acceso("login", "fallo", None, "a\nacceso evento=login resultado=exito x=1", "1.1.1.1")
    assert len(lineas) == 1 and "\n" not in lineas[0]
    assert lineas[0].count("resultado=") == 1 or "resultado_exito" in lineas[0]
