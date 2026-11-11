"""Revocación de tokens al cerrar sesión."""

import asyncio

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.v1.auth import _revocar_token
from app.core import token_blocklist
from app.core.config import settings
from app.core.security import create_access_token, decode_token, get_current_user


@pytest.fixture(autouse=True)
def _limpio():
    token_blocklist.limpiar()
    yield
    token_blocklist.limpiar()


def _request(token: str) -> Request:
    cookie = f"{settings.jwt_cookie_name}={token}".encode()
    return Request({"type": "http", "headers": [(b"cookie", cookie)]})


def test_el_token_trae_jti_unico():
    a, b = create_access_token("1"), create_access_token("1")
    assert decode_token(a)["jti"] != decode_token(b)["jti"]


def test_token_revocado_es_rechazado_antes_de_tocar_la_base():
    token = create_access_token("1")
    _revocar_token(token)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(get_current_user(_request(token), db=None))
    assert exc.value.status_code == 401


def test_otro_token_no_se_ve_afectado():
    revocado, otro = create_access_token("1"), create_access_token("1")
    _revocar_token(revocado)
    assert token_blocklist.esta_revocado(decode_token(revocado)["jti"])
    assert not token_blocklist.esta_revocado(decode_token(otro)["jti"])


def test_revocar_token_basura_no_falla():
    _revocar_token("no-es-un-jwt")


def test_se_olvidan_los_caducados():
    token_blocklist.revocar("viejo", 1.0)
    token_blocklist.revocar("nuevo", 9e12)
    assert not token_blocklist.esta_revocado("viejo")
    assert token_blocklist.esta_revocado("nuevo")
