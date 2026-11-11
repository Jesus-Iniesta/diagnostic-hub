"""MFA con TOTP para administradores."""

import asyncio
from types import SimpleNamespace

import pyotp
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.v1.auth import (
    MfaVerificarPayload,
    mfa_setup,
    mfa_verificar,
)
from app.core import rate_limit
from app.core.security import (
    create_access_token,
    decode_token,
    mfa_pendiente,
    require_permission,
)


def _user(rol="administrador", secret=None, id=1):
    role = SimpleNamespace(name=rol, permissions=[SimpleNamespace(name="administrar_sistema")])
    return SimpleNamespace(
        id=id, role=role, mfa_secret=secret, correo_personal="admin@x.mx", correo_institucional=None
    )


def _request(verificado=None):
    req = Request({"type": "http", "headers": []})
    if verificado is not None:
        req.state.mfa_verificado = verificado
    return req


class _Db:
    async def commit(self):
        pass


@pytest.fixture(autouse=True)
def _limpio():
    rate_limit.limpiar()
    yield
    rate_limit.limpiar()


def test_token_lleva_la_marca_solo_si_se_pide():
    assert "mfa_verificado" not in decode_token(create_access_token("1"))
    assert decode_token(create_access_token("1", mfa_verificado=False))["mfa_verificado"] is False
    assert decode_token(create_access_token("1", mfa_verificado=True))["mfa_verificado"] is True


def test_admin_con_mfa_sin_verificar_recibe_403():
    dep = require_permission("administrar_sistema")
    with pytest.raises(HTTPException) as exc:
        dep(_request(verificado=False), _user(secret="ABC"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "Se requiere verificación MFA"


def test_admin_con_mfa_verificado_pasa():
    dep = require_permission("administrar_sistema")
    usuario = _user(secret="ABC")
    assert dep(_request(verificado=True), usuario) is usuario


def test_admin_sin_mfa_configurado_flujo_normal():
    dep = require_permission("administrar_sistema")
    usuario = _user(secret=None)
    assert dep(_request(verificado=False), usuario) is usuario


def test_no_admin_nunca_pide_mfa():
    assert not mfa_pendiente(_user(rol="profesor", secret="ABC"), _request(False))


def test_me_informa_mfa_pendiente():
    from app.api.v1.auth import MeRead

    assert MeRead.model_fields["mfa_pendiente"].default is False
    assert mfa_pendiente(_user(secret="ABC"), _request(False))
    assert not mfa_pendiente(_user(secret="ABC"), _request(True))


def test_setup_genera_secreto_y_url_otpauth():
    usuario = _user()
    res = asyncio.run(mfa_setup(db=_Db(), current_user=usuario))
    assert usuario.mfa_secret == res.secreto and len(res.secreto) == 32
    assert res.otpauth_url.startswith("otpauth://totp/TutoNet:")
    assert f"secret={res.secreto}" in res.otpauth_url and "issuer=TutoNet" in res.otpauth_url


def test_setup_dos_veces_da_400():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(mfa_setup(db=_Db(), current_user=_user(secret="ABC")))
    assert (exc.value.status_code, exc.value.detail) == (400, "MFA ya está configurado")


def test_setup_solo_admin():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(mfa_setup(db=_Db(), current_user=_user(rol="profesor")))
    assert exc.value.status_code == 403


class _Resp:
    def __init__(self):
        self.cookies = []

    def set_cookie(self, **kw):
        self.cookies.append(kw)


def test_verificar_codigo_correcto_marca_la_sesion():
    secreto = pyotp.random_base32()
    resp = _Resp()
    asyncio.run(
        mfa_verificar(
            MfaVerificarPayload(codigo=pyotp.TOTP(secreto).now()),
            _request(False), resp, _user(secret=secreto),
        )
    )
    assert decode_token(resp.cookies[0]["value"])["mfa_verificado"] is True


def test_verificar_codigo_incorrecto_da_401():
    secreto = pyotp.random_base32()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            mfa_verificar(MfaVerificarPayload(codigo="000000"), _request(False), _Resp(), _user(secret=secreto))
        )
    assert (exc.value.status_code, exc.value.detail) == (401, "Código incorrecto")


def test_verificar_se_bloquea_tras_5_fallos():
    secreto = pyotp.random_base32()
    usuario = _user(secret=secreto)
    for _ in range(5):
        with pytest.raises(HTTPException):
            asyncio.run(mfa_verificar(MfaVerificarPayload(codigo="000000"), _request(False), _Resp(), usuario))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            mfa_verificar(
                MfaVerificarPayload(codigo=pyotp.TOTP(secreto).now()), _request(False), _Resp(), usuario
            )
        )
    assert exc.value.status_code == 429
