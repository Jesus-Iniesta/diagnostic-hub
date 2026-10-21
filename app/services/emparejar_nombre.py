"""Reglas para encontrar por nombre a un alumno de WebAssign.

WebAssign solo trae el nombre ("Apellidos, Nombre") y un correo; a veces el
correo es el institucional y no el que el alumno usó en los otros exámenes.
Cuando el correo no lo encuentra se compara su nombre con los alumnos del
periodo:

- IDENTICO: el nombre completo (sin acentos, mayúsculas ni orden) es igual al
  de UN solo alumno. Medido con 2024B acierta siempre: se junta.
- POSIBLE: el nombre está incompleto y coincide con uno solo, el nombre es
  igual al de varios (homónimos) o el correo institucional tiene la forma del
  nombre de un alumno (rgonzalezc009 = Roberto González Calderón). No se
  junta: se registra provisional y se marca como posible duplicado.
- NINGUNO: nada coincide.

Este módulo no toca la base de datos.
"""

from __future__ import annotations

import re
import unicodedata

from app.services.normalizacion import normalizar_nombre

IDENTICO = "identico"
POSIBLE = "posible"
NINGUNO = "ninguno"

DOMINIO_INSTITUCIONAL = "alumno.uaemex.mx"

MOTIVO_NOMBRE_INCOMPLETO = "Nombre parecido en WebAssign"
MOTIVO_HOMONIMO = "Mismo nombre que otro alumno en WebAssign"
MOTIVO_CORREO_INSTITUCIONAL = "Su correo institucional corresponde a este nombre"


def es_institucional(correo: str | None) -> bool:
    return bool(correo) and correo.endswith("@" + DOMINIO_INSTITUCIONAL)


def _palabras(texto: str | None) -> list[str]:
    s = unicodedata.normalize("NFKD", str(texto or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return [w for w in re.split(r"[^a-z]+", s) if w]


def usuarios_institucionales(partes: tuple[str, str, str] | None, completo: str | None) -> set[str]:
    """Usuarios de correo institucional que corresponden al nombre (sin el número).

    Forma: inicial del nombre + primer apellido + inicial del segundo apellido.
    Con nombre, paterno y materno separados se arma directo; con el nombre en
    un solo texto (examen final) se prueban los dos órdenes.
    """
    nombre, paterno, materno = (_palabras(p) for p in (partes or ("", "", "")))
    usuarios: set[str] = set()
    if nombre and paterno:
        if not materno and len(paterno) >= 2:
            # WebAssign guarda los dos apellidos juntos.
            paterno, materno = paterno[:1], paterno[1:]
        usuarios.add(nombre[0][0] + paterno[0] + (materno[0][0] if materno else ""))
        return usuarios
    w = _palabras(completo)
    if len(w) >= 3:
        usuarios.add(w[0][0] + w[-2] + w[-1][0])  # Nombre(s) Paterno Materno
        usuarios.add(w[2][0] + w[0] + w[1][0])  # Paterno Materno Nombre(s)
    elif len(w) == 2:
        usuarios.add(w[0][0] + w[1])
        usuarios.add(w[1][0] + w[0])
    return usuarios


def usuario_de_correo(correo: str | None) -> str | None:
    """'rgonzalezc009@alumno.uaemex.mx' -> 'rgonzalezc'."""
    if not es_institucional(correo):
        return None
    letras = re.sub(r"\d+$", "", correo.split("@", 1)[0])
    return letras if re.fullmatch(r"[a-z]{3,}", letras) else None


def buscar_por_nombre(
    nombre: str | None, correo: str | None, candidatos: dict[int, dict]
) -> tuple[str, list[int], str | None]:
    """(IDENTICO|POSIBLE|NINGUNO, alumnos, motivo) para una fila de WebAssign.

    `candidatos` son los alumnos del periodo: {id: {"nombre", "partes"}}.
    """
    clave = normalizar_nombre(nombre)
    if clave:
        palabras = set(clave.split())
        iguales, parecidos = [], []
        for aid, d in candidatos.items():
            otra = normalizar_nombre(d.get("nombre"))
            if not otra:
                continue
            if otra == clave:
                iguales.append(aid)
            else:
                otras = set(otra.split())
                if palabras < otras or otras < palabras:
                    parecidos.append(aid)
        if len(iguales) == 1:
            return IDENTICO, iguales, None
        if iguales:
            return POSIBLE, iguales, MOTIVO_HOMONIMO
        if len(parecidos) == 1:
            return POSIBLE, parecidos, MOTIVO_NOMBRE_INCOMPLETO

    usuario = usuario_de_correo(correo)
    if usuario:
        por_correo = [
            aid
            for aid, d in candidatos.items()
            if usuario in usuarios_institucionales(d.get("partes"), d.get("nombre"))
        ]
        if por_correo:
            return POSIBLE, por_correo, MOTIVO_CORREO_INSTITUCIONAL
    return NINGUNO, [], None
