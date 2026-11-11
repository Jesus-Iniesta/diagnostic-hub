"""Registro de accesos (login y logout) en el log; no se guarda en base de datos.

Una línea por evento, con la hora que pone el formateador del log:
    acceso evento=login resultado=exito rol=alumno usuario=1724300 ip=10.0.0.5
Nunca se escribe la contraseña.
"""

import logging

logger = logging.getLogger("tutonet.acceso")
# uvicorn no configura el logger raíz: sin esto los INFO de la app no se verían.
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

EVENTOS = ("login", "logout", "mfa")
RESULTADOS = ("exito", "fallo", "bloqueado")


def _limpio(valor: str | None) -> str:
    """Una sola línea y de largo acotado, para que lo escrito por el cliente no falsee el log."""
    texto = " ".join((valor or "-").split())
    return (texto[:100] or "-").replace("=", "_")


def registrar_acceso(
    evento: str, resultado: str, rol: str | None, usuario: str | None, ip: str
) -> None:
    nivel = logging.INFO if resultado == "exito" else logging.WARNING
    logger.log(
        nivel,
        "acceso evento=%s resultado=%s rol=%s usuario=%s ip=%s",
        evento,
        resultado,
        _limpio(rol or "desconocido"),
        _limpio(usuario),
        _limpio(ip),
    )
