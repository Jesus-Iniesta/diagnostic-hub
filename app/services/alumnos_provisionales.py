"""Reglas para alumnos provisionales.

Un alumno provisional se crea cuando una fila del cuestionario diagnóstico no
coincide con nadie del padrón (porque el alumno nunca llenó el formulario de
datos). Así sus calificaciones no se pierden: los exámenes que se suban después
lo encuentran por los correos/folio/cuenta que se guardaron, y el nombre se
completa con el primer archivo que lo traiga (examen final o WebAssign).

Si más adelante se sube el padrón con ese alumno, se completa el MISMO registro
en lugar de crear uno nuevo.

Este módulo no toca la base de datos (ver alumnos_provisionales_service.py).
"""

from __future__ import annotations

import re
import unicodedata

CREAR = "crear"
COMPLETAR = "completar"
DUPLICADO = "duplicado"

_USUARIO_RE = re.compile(r"^\s*([A-Za-z]{2,5})[_\-\s]?\s*(\d+)\s*$")


def _sin_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _palabras(texto: str) -> list[str]:
    s = _sin_acentos(texto).upper()
    return [w for w in re.split(r"[^A-Z]+", s) if w and w not in ("INGENIERIA", "EN", "DE", "Y")]


def clave_ingenieria_fila(
    ingenieria_raw: object | None,
    usuario_raw: object | None,
    ingenierias: dict[str, str],
) -> str | None:
    """Clave de ingeniería de una fila del cuestionario, o None si no se reconoce.

    `ingenierias` es {clave: nombre}. Se intenta, en orden:
    1. La clave entre paréntesis: "Ingeniería Civil (ICI)".
    2. El prefijo del usuario: "ICO_094".
    3. El nombre: "Ingeniería en Computación" (sin acentos ni "Ingeniería en").
    """
    claves = {c.upper(): c for c in ingenierias}
    texto = str(ingenieria_raw or "")

    m = re.search(r"\(\s*([A-Za-z]{2,5})\s*\)", texto)
    if m and m.group(1).upper() in claves:
        return claves[m.group(1).upper()]

    m = _USUARIO_RE.match(str(usuario_raw or ""))
    if m and m.group(1).upper() in claves:
        return claves[m.group(1).upper()]

    buscadas = _palabras(texto.split("(")[0])
    if buscadas:
        for clave, nombre in ingenierias.items():
            if _palabras(nombre) == buscadas:
                return clave
    return None


def lugar_desde_usuario(usuario_raw: object | None) -> int | None:
    """'ICO_094' -> 94 (lugar en el examen de admisión)."""
    m = _USUARIO_RE.match(str(usuario_raw or ""))
    return int(m.group(2)) if m else None


def destino_fila_padron(
    duenos: set[int], provisionales: set[int]
) -> tuple[str, int | None]:
    """Qué hacer con una fila del padrón según a quién apuntan sus datos.

    `duenos` son los alumnos a los que apuntan su correo, correo institucional,
    cuenta y folio. Solo se completa un provisional si TODOS sus datos apuntan a
    ese mismo provisional; si apuntan a un alumno del padrón o a varios, se
    deja como duplicado para que lo revise el administrador.
    """
    if not duenos:
        return CREAR, None
    if len(duenos) == 1:
        unico = next(iter(duenos))
        if unico in provisionales:
            return COMPLETAR, unico
    return DUPLICADO, None


def nombre_vacio(nombre_completo: str | None) -> bool:
    return not (nombre_completo or "").strip()


def nombre_desde_webassign(raw: object | None) -> tuple[str, str, str] | None:
    """'Abad Hernández, Erik' -> ('Erik', 'Abad Hernández', '')."""
    s = " ".join(str(raw or "").split())
    if "," not in s:
        return nombre_desde_completo(s)
    apellidos, nombres = (p.strip() for p in s.split(",", 1))
    if not apellidos or not nombres:
        return None
    return nombres.title(), apellidos.title(), ""


def nombre_desde_completo(raw: object | None) -> tuple[str, str, str] | None:
    """Nombre en un solo texto (examen final): se guarda completo en `nombre`.

    No se intenta separar apellidos porque el orden varía; el padrón lo
    corrige cuando se suba. Se descarta si no parece un nombre (p. ej. "1.0").
    """
    s = " ".join(str(raw or "").split())
    if len(re.findall(r"[^\W\d_]{2,}", s)) < 2:
        return None
    return s.title(), "", ""
