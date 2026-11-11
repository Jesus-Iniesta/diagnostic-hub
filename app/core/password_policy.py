"""Política de contraseñas del personal (administrador, profesor, acreditador).

Los alumnos entran con su número de cuenta, sin contraseña, así que no les aplica.
"""

LARGO_MINIMO_PASSWORD = 12

MENSAJE_PASSWORD_CORTA = (
    f"La contraseña debe tener al menos {LARGO_MINIMO_PASSWORD} caracteres."
)


def validar_password(valor: str) -> str:
    """Para usar en field_validator: lanza ValueError (422 en FastAPI) si es muy corta."""
    if len(valor) < LARGO_MINIMO_PASSWORD:
        raise ValueError(MENSAJE_PASSWORD_CORTA)
    return valor
