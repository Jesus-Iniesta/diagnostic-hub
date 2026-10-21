"""Unir dos registros de alumno que son la misma persona.

Lo usa el administrador (lista de alumnos) y la segunda vuelta de "Procesar
todo". Todo pasa al alumno que se conserva: resultados, correos, cuenta, folio,
grupos y los datos que le falten; el otro alumno (y su usuario) se borra.

Si los dos tienen resultado del mismo examen en el mismo periodo se conserva el
del alumno que se queda y solo se llenan las partes que le falten.
"""

from __future__ import annotations

from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.asignacion_examen import AsignacionExamen
from app.models.grupo_alumno import grupo_alumno
from app.models.identificador_alumno import IdentificadorAlumno
from app.models.resultado_cuestionario_diagnostico import (
    ResultadoCuestionarioDiagnostico,
)
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.resultado_webassign import ResultadoWebAssign
from app.models.user import User
from app.services.normalizacion import normalizar_correo, normalizar_nombre


class UnionError(ValueError):
    pass


# Campos del formulario/padrón que se copian si el que se conserva no los tiene.
CAMPOS_ALUMNO = (
    "ingenieria_id",
    "promedio_bachillerato",
    "indice_uaem",
    "lugar_admision",
    "escuela_procedencia",
    "tiene_internet",
    "tiene_computadora",
    "vulnerabilidad_economica",
    "es_foraneo",
    "convivencia",
)

_NO_COPIAR = {"id", "alumno_id", "periodo", "created_at", "updated_at"}


def nombres_compatibles(a: str | None, b: str | None) -> bool:
    """True si un nombre está vacío o sus palabras están contenidas en el otro.

    'Erik Abad' y 'Abad Hernández, Erik' son compatibles; 'Ana Ruiz' y
    'Beto Lara' no. Solo sirve para NO juntar automáticamente a dos personas
    distintas; nunca se junta a nadie por tener el mismo nombre.
    """
    pa = set(normalizar_nombre(a).split())
    pb = set(normalizar_nombre(b).split())
    if not pa or not pb:
        return True
    return pa <= pb or pb <= pa


def _columnas(modelo) -> list[str]:
    return [c.key for c in modelo.__table__.columns if c.key not in _NO_COPIAR]


async def _pasar_resultados(db: AsyncSession, conservar_id: int, eliminar_id: int) -> int:
    """Mueve los resultados; devuelve cuántos movió o combinó."""
    from app.services.upload_webassign_service import CAMPOS_CALIFICACION, calcular_avance

    movidos = 0
    for modelo in (ResultadoDiagnostico, ResultadoCuestionarioDiagnostico, ResultadoWebAssign):
        otros = (
            await db.execute(select(modelo).where(modelo.alumno_id == eliminar_id))
        ).scalars().all()
        for otro in otros:
            propio = await db.scalar(
                select(modelo).where(
                    modelo.alumno_id == conservar_id, modelo.periodo == otro.periodo
                )
            )
            movidos += 1
            if propio is None:
                otro.alumno_id = conservar_id
                continue
            if modelo is ResultadoWebAssign:
                # Una fila de WebAssign es un todo (una carrera): gana la de más avance.
                avance = lambda r: calcular_avance({c: getattr(r, c) for c in CAMPOS_CALIFICACION})  # noqa: E731
                if avance(otro) > avance(propio):
                    for col in _columnas(modelo):
                        setattr(propio, col, getattr(otro, col))
            else:
                for col in _columnas(modelo):
                    if getattr(propio, col) is None and getattr(otro, col) is not None:
                        setattr(propio, col, getattr(otro, col))
            if modelo is ResultadoDiagnostico:
                validos = [
                    p
                    for p in (
                        propio.puntaje_algebra,
                        propio.puntaje_trigonometria,
                        propio.puntaje_geometria,
                        propio.puntaje_calculo,
                    )
                    if p is not None
                ]
                propio.promedio_diagnostico = sum(validos) / len(validos) if validos else None
            await db.delete(otro)
    await db.flush()
    return movidos


async def _agregar_identificador(
    db: AsyncSession, alumno_id: int, tipo: str, valor: str | None
) -> None:
    if not valor:
        return
    existe = await db.scalar(
        select(IdentificadorAlumno.id).where(
            IdentificadorAlumno.tipo == tipo, IdentificadorAlumno.valor == valor
        )
    )
    if existe is None:
        db.add(
            IdentificadorAlumno(alumno_id=alumno_id, tipo=tipo, valor=valor, fuente="union")
        )


async def unir_alumnos(db: AsyncSession, conservar_id: int, eliminar_id: int) -> dict:
    """Pasa todo de `eliminar_id` a `conservar_id` y borra `eliminar_id`.

    No hace commit. Lanza UnionError si no se pueden unir.
    """
    if conservar_id == eliminar_id:
        raise UnionError("Elige dos alumnos distintos.")
    conservar = await db.get(Alumno, conservar_id)
    eliminar = await db.get(Alumno, eliminar_id)
    if conservar is None or eliminar is None:
        raise UnionError("Alguno de los alumnos ya no existe.")
    user_c = await db.get(User, conservar.usuario_id)
    user_e = await db.get(User, eliminar.usuario_id)

    # Exámenes asignados en la plataforma: no se puede tener dos veces el mismo.
    asignaciones = (
        await db.execute(select(AsignacionExamen).where(AsignacionExamen.alumno_id == eliminar_id))
    ).scalars().all()
    if asignaciones:
        propios = set(
            (
                await db.execute(
                    select(AsignacionExamen.examen_id).where(
                        AsignacionExamen.alumno_id == conservar_id
                    )
                )
            ).scalars()
        )
        if any(a.examen_id in propios for a in asignaciones):
            raise UnionError(
                "Los dos alumnos tienen asignado el mismo examen en la plataforma; no se pueden unir."
            )
        for a in asignaciones:
            a.alumno_id = conservar_id

    resultados = await _pasar_resultados(db, conservar_id, eliminar_id)

    await db.execute(
        IdentificadorAlumno.__table__.update()
        .where(IdentificadorAlumno.alumno_id == eliminar_id)
        .values(alumno_id=conservar_id)
    )

    grupos_otro = set(
        (await db.execute(select(grupo_alumno.c.grupo_id).where(grupo_alumno.c.alumno_id == eliminar_id))).scalars()
    )
    grupos_propios = set(
        (await db.execute(select(grupo_alumno.c.grupo_id).where(grupo_alumno.c.alumno_id == conservar_id))).scalars()
    )
    await db.execute(delete(grupo_alumno).where(grupo_alumno.c.alumno_id == eliminar_id))
    for gid in grupos_otro - grupos_propios:
        await db.execute(insert(grupo_alumno).values(grupo_id=gid, alumno_id=conservar_id))

    # Datos del que se borra (se liberan sus valores únicos antes de pasarlos).
    datos = {
        "nombre": (user_e.nombre, user_e.apellido_paterno, user_e.apellido_materno),
        "correo_personal": user_e.correo_personal,
        "correo_institucional": user_e.correo_institucional,
        "cuenta": eliminar.numero_cuenta,
        "folio": eliminar.numero_folio,
        "provisional": eliminar.es_provisional,
        "alumno": {c: getattr(eliminar, c) for c in CAMPOS_ALUMNO},
    }
    await db.delete(eliminar)
    await db.flush()
    await db.delete(user_e)
    await db.flush()

    if not " ".join(
        (user_c.nombre or "", user_c.apellido_paterno or "", user_c.apellido_materno or "")
    ).strip():
        user_c.nombre, user_c.apellido_paterno, user_c.apellido_materno = datos["nombre"]

    for campo in ("correo_personal", "correo_institucional"):
        correo = datos[campo]
        if not correo:
            continue
        if getattr(user_c, campo) is None:
            setattr(user_c, campo, correo)
        elif normalizar_correo(correo) not in {
            normalizar_correo(user_c.correo_personal),
            normalizar_correo(user_c.correo_institucional),
        }:
            await _agregar_identificador(db, conservar_id, "correo", normalizar_correo(correo))

    for campo, tipo in (("numero_cuenta", "cuenta"), ("numero_folio", "folio")):
        valor = datos["cuenta" if tipo == "cuenta" else "folio"]
        if not valor:
            continue
        if getattr(conservar, campo) is None:
            setattr(conservar, campo, valor)
        elif getattr(conservar, campo) != valor:
            # Ya tenía otro: se guarda para que las cargas lo sigan encontrando.
            await _agregar_identificador(db, conservar_id, tipo, valor)

    for campo, valor in datos["alumno"].items():
        if getattr(conservar, campo) is None and valor is not None:
            setattr(conservar, campo, valor)
    conservar.es_provisional = bool(conservar.es_provisional and datos["provisional"])

    await db.flush()
    return {"alumno_id": conservar_id, "eliminado_id": eliminar_id, "resultados_movidos": resultados}
