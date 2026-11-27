"""Pantallas de inicio de sesión (portales) y los roles que pueden entrar por cada una.

El frontend manda el portal desde el que se intenta entrar; si el rol del usuario
no le corresponde, no se crea la sesión y se le indica por dónde debe entrar.
"""

from fastapi import HTTPException, status

# Portal -> roles que pueden usarlo.
PORTALES: dict[str, frozenset[str]] = {
    "alumno": frozenset({"alumno"}),
    "profesor": frozenset({"profesor"}),
    "institucional": frozenset({"administrador", "acreditador"}),
}

# Cómo se llama en pantalla cada portal, para decirle al usuario cuál usar.
NOMBRES_PORTAL: dict[str, str] = {
    "alumno": "Acceso de alumnos",
    "profesor": "Acceso de profesor",
    "institucional": "Acceso institucional",
}


def validar_portal(portal: str | None) -> str | None:
    """None si no se indicó portal; 400 si no existe."""
    if portal is None or portal in PORTALES:
        return portal
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Portal de acceso no válido")


def portal_de_rol(rol: str | None) -> str | None:
    return next((p for p, roles in PORTALES.items() if rol in roles), None)


def rol_permitido(portal: str | None, rol: str | None) -> bool:
    """Sin portal no se restringe (clientes de la API y pruebas)."""
    return portal is None or rol in PORTALES[portal]


def portal_incorrecto(rol: str | None) -> HTTPException:
    """403 que indica desde qué pantalla debe entrar la cuenta."""
    correcto = portal_de_rol(rol)
    detalle = (
        f"Esta cuenta no puede entrar desde aquí. Inicia sesión desde «{NOMBRES_PORTAL[correcto]}»."
        if correcto
        else "Esta cuenta no puede entrar desde aquí."
    )
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detalle)
