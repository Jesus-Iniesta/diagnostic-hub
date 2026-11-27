"""Cada pantalla de inicio de sesión solo deja entrar a sus roles."""

import pytest
from fastapi import HTTPException

from app.core.portales import (
    portal_de_rol,
    portal_incorrecto,
    rol_permitido,
    validar_portal,
)


@pytest.mark.parametrize(
    ("portal", "rol", "permitido"),
    [
        ("alumno", "alumno", True),
        ("profesor", "profesor", True),
        ("institucional", "administrador", True),
        ("institucional", "acreditador", True),
        ("profesor", "administrador", False),
        ("profesor", "acreditador", False),
        ("profesor", "alumno", False),
        ("institucional", "profesor", False),
        ("alumno", "profesor", False),
        ("alumno", "administrador", False),
    ],
)
def test_rol_permitido(portal, rol, permitido):
    assert rol_permitido(portal, rol) is permitido


def test_sin_portal_no_se_restringe():
    assert rol_permitido(None, "administrador")


def test_portal_desconocido_es_400():
    assert validar_portal(None) is None
    assert validar_portal("profesor") == "profesor"
    with pytest.raises(HTTPException) as exc:
        validar_portal("otro")
    assert exc.value.status_code == 400


def test_mensaje_indica_el_portal_correcto():
    assert portal_de_rol("acreditador") == "institucional"
    exc = portal_incorrecto("administrador")
    assert exc.status_code == 403
    assert "Acceso institucional" in exc.detail
    assert "Acceso de profesor" in portal_incorrecto("profesor").detail
