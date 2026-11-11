"""Lista de tokens revocados al cerrar sesión, en memoria.

Guarda el `jti` de cada token junto con su expiración, para olvidarlo cuando el
token ya habría caducado. Se pierde al reiniciar y no se comparte entre varios
workers (igual que el límite de intentos de login).
"""

import time

_revocados: dict[str, float] = {}


def revocar(jti: str, exp: float) -> None:
    _purgar()
    _revocados[jti] = exp


def esta_revocado(jti: str | None) -> bool:
    return jti is not None and jti in _revocados


def _purgar() -> None:
    ahora = time.time()
    for jti in [j for j, exp in _revocados.items() if exp <= ahora]:
        del _revocados[jti]


def limpiar() -> None:
    _revocados.clear()
