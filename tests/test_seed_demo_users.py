"""Las cuentas de demostración solo se crean con ENVIRONMENT=development."""

import asyncio

import pytest

from app.seeds import service


class _SesionFalsa:
    """Sesión que registra si se intentó escribir."""

    def __init__(self, existentes):
        self.existentes = existentes
        self.agregados = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def scalars(self, _stmt):
        class R:
            def all(_self):
                return self.existentes
        return R()

    def add(self, obj):
        self.agregados.append(obj)


@pytest.mark.parametrize("valor", ["production", "", "staging"])
def test_fuera_de_desarrollo_no_crea_cuentas(monkeypatch, valor):
    sesion = _SesionFalsa(["admin@integrativa.test"])
    monkeypatch.setattr(service, "async_session", lambda: sesion)
    monkeypatch.setattr(service.settings, "environment", valor)
    assert asyncio.run(service.run_seed_users()) == 0
    assert sesion.agregados == []


def test_es_desarrollo(monkeypatch):
    monkeypatch.setattr(service.settings, "environment", " Development ")
    assert service.settings.es_desarrollo
    monkeypatch.setattr(service.settings, "environment", "production")
    assert not service.settings.es_desarrollo
