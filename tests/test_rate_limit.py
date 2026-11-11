"""Límite de intentos de login (en memoria)."""

import pytest
from fastapi import HTTPException

from app.core import rate_limit as rl


@pytest.fixture(autouse=True)
def _limpio():
    rl.limpiar()
    yield
    rl.limpiar()


def test_ip_limitada_a_10_por_minuto():
    for i in range(10):
        rl.verificar_intento("1.1.1.1", f"u{i}")
    with pytest.raises(HTTPException) as exc:
        rl.verificar_intento("1.1.1.1", "otro")
    assert exc.value.status_code == 429
    rl.verificar_intento("2.2.2.2", "otro")  # otra IP no se ve afectada


def test_bloqueo_tras_5_fallos_consecutivos():
    for _ in range(5):
        rl.registrar_fallo("Ana@x.mx")
    with pytest.raises(HTTPException) as exc:
        rl.verificar_intento("1.1.1.1", "ana@x.mx")
    assert exc.value.status_code == 429


def test_exito_reinicia_los_fallos():
    for _ in range(4):
        rl.registrar_fallo("ana")
    rl.registrar_exito("ana")
    rl.registrar_fallo("ana")
    rl.verificar_intento("1.1.1.1", "ana")


def test_mismo_mensaje_exista_o_no_el_usuario():
    for u in ("existe", "no-existe"):
        for _ in range(5):
            rl.registrar_fallo(u)
    mensajes = set()
    for u in ("existe", "no-existe"):
        with pytest.raises(HTTPException) as exc:
            rl.verificar_intento("1.1.1.1", u)
        mensajes.add((exc.value.status_code, exc.value.detail))
    assert len(mensajes) == 1
