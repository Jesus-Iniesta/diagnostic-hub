"""Límite de intentos de login, en memoria (sin Redis).

- Por IP: máximo `MAX_POR_IP` intentos por ventana de `VENTANA_IP` segundos.
- Por usuario: tras `MAX_FALLOS` fallos consecutivos la cuenta se bloquea
  `BLOQUEO` segundos.

El estado vive en el proceso: se pierde al reiniciar y no se comparte entre
varios workers. Para más de un worker habría que moverlo a Redis.
Las llaves de usuario se guardan también para cuentas que no existen, y la
respuesta de bloqueo es la misma, así no se puede saber si un usuario existe.
"""

from __future__ import annotations

import time
from collections import deque

from fastapi import HTTPException, Request, status

MAX_POR_IP = 10
VENTANA_IP = 60
MAX_FALLOS = 5
BLOQUEO = 15 * 60

MENSAJE = "Demasiados intentos. Inténtalo de nuevo más tarde."

_intentos_ip: dict[str, deque[float]] = {}
_fallos: dict[str, int] = {}
_bloqueados: dict[str, float] = {}


def _demasiados() -> HTTPException:
    return HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=MENSAJE)


def ip_cliente(request: Request) -> str:
    """IP del cliente; detrás del proxy de Railway, la última que éste anotó."""
    reenviada = request.headers.get("x-forwarded-for")
    if reenviada:
        return reenviada.split(",")[-1].strip()
    return request.client.host if request.client else "desconocida"


def _llave(usuario: str) -> str:
    return usuario.strip().lower()


def limpiar() -> None:
    _intentos_ip.clear()
    _fallos.clear()
    _bloqueados.clear()


def _purgar(ahora: float) -> None:
    for llave in [k for k, hasta in _bloqueados.items() if hasta <= ahora]:
        del _bloqueados[llave]
        _fallos.pop(llave, None)
    for ip in [ip for ip, q in _intentos_ip.items() if not q or q[-1] <= ahora - VENTANA_IP]:
        del _intentos_ip[ip]


def verificar_intento(ip: str, usuario: str) -> None:
    """Cuenta el intento de la IP y rechaza (429) si excede el límite o la cuenta está bloqueada."""
    ahora = time.monotonic()
    _purgar(ahora)

    cola = _intentos_ip.setdefault(ip, deque())
    while cola and cola[0] <= ahora - VENTANA_IP:
        cola.popleft()
    if len(cola) >= MAX_POR_IP:
        raise _demasiados()
    cola.append(ahora)

    if _bloqueados.get(_llave(usuario), 0) > ahora:
        raise _demasiados()


def registrar_fallo(usuario: str) -> None:
    llave = _llave(usuario)
    _fallos[llave] = _fallos.get(llave, 0) + 1
    if _fallos[llave] >= MAX_FALLOS:
        _bloqueados[llave] = time.monotonic() + BLOQUEO


def registrar_exito(usuario: str) -> None:
    llave = _llave(usuario)
    _fallos.pop(llave, None)
    _bloqueados.pop(llave, None)
