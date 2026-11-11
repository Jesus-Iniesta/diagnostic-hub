"""Contraseña mínima de 12 caracteres para el personal."""

import pytest
from pydantic import ValidationError

from app.api.v1.auth import CambiarPasswordPayload
from app.api.v1.users import UsuarioPersonalCreate, UsuarioPersonalUpdate

BASE = dict(nombre="Ana", apellido_paterno="Perez", correo_personal="ana@x.mx", rol="profesor")


def test_crear_rechaza_contrasena_corta():
    with pytest.raises(ValidationError, match="al menos 12 caracteres"):
        UsuarioPersonalCreate(**BASE, password="x" * 11)


def test_crear_acepta_12():
    assert UsuarioPersonalCreate(**BASE, password="x" * 12).password == "x" * 12


def test_actualizar_rechaza_corta_pero_acepta_omitida():
    with pytest.raises(ValidationError, match="al menos 12 caracteres"):
        UsuarioPersonalUpdate(password="x" * 11)
    assert UsuarioPersonalUpdate().password is None


def test_cambiar_password_exige_12():
    with pytest.raises(ValidationError, match="al menos 12 caracteres"):
        CambiarPasswordPayload(actual="a", nueva="x" * 11)
