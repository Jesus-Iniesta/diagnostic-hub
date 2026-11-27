"""Resumen de un alumno para el administrador: sus datos, su Índice FI y sus
calificaciones de cada examen en un periodo.

El índice sale de indices_alumnos, el mismo cálculo de la carta de
recomendación y del CREANI, para que las cifras coincidan en todas partes.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.carga_periodo_service import MATERIAS_FINAL as NOMBRES_MATERIA
from app.services.indice_fi_service import (
    MATERIAS_DIAGNOSTICO,
    MATERIAS_FINAL,
    MATERIAS_WEBASSIGN,
    MAX_ACIERTOS_CUESTIONARIO,
    MAX_FINAL,
    MAX_WEBASSIGN,
    indices_alumnos,
)


def _componentes(indice: dict) -> list[dict]:
    """Lo que aporta cada examen al índice (escala 0-10) y si lo presentó."""
    filas = indice["filas"]
    componentes = [
        ("Examen diagnóstico", indice["diagnostico"], filas["cuestionario"] is not None),
        ("Tareas WebAssign", indice["webassign_tareas"], filas["webassign"] is not None),
        ("Exámenes WebAssign", indice["webassign_examen"], filas["webassign"] is not None),
        ("Examen final", indice["final"], filas["final"] is not None),
    ]
    resultado = [
        {"nombre": nombre, "obtenido": c["total"], "valor": c["valor"], "presentado": presentado}
        for nombre, c, presentado in componentes
    ]
    asistencia = indice["asistencia"]
    if asistencia["usar"]:
        resultado.insert(0, {
            "nombre": "Asistencia",
            "obtenido": asistencia["total"],
            "valor": asistencia["valor"],
            "presentado": asistencia["total"] > 0,
        })
    return resultado


def _calificaciones(filas: dict) -> dict:
    """Calificaciones tal como vienen en cada examen (sin ponderar); None si no lo presentó."""
    cuestionario, webassign, final = filas["cuestionario"], filas["webassign"], filas["final"]
    return {
        "diagnostico": None if cuestionario is None else {
            "maximo": MAX_ACIERTOS_CUESTIONARIO,
            "materias": [
                {
                    "materia": NOMBRES_MATERIA[m],
                    "c1": getattr(cuestionario, f"aciertos_c1_{m}"),
                    "c2": getattr(cuestionario, f"aciertos_c2_{m}"),
                }
                for m in MATERIAS_DIAGNOSTICO
            ],
        },
        "webassign": None if webassign is None else {
            "maximo": MAX_WEBASSIGN,
            "carrera": webassign.carrera,
            "materias": [
                {
                    "materia": NOMBRES_MATERIA[m],
                    "tareas": getattr(webassign, f"{m}_trabajo"),
                    "examen": getattr(webassign, f"{m}_examen"),
                }
                for m in MATERIAS_WEBASSIGN
            ],
        },
        "final": None if final is None else {
            "maximo": MAX_FINAL,
            "promedio": final.promedio_diagnostico,
            "materias": [
                {"materia": NOMBRES_MATERIA[m], "calificacion": getattr(final, f"puntaje_{m}")}
                for m in MATERIAS_FINAL
            ],
        },
    }


async def resultados_alumno(db: AsyncSession, alumno_id: int, periodo: str | None) -> dict:
    """Índice y calificaciones del periodo indicado o, sin periodo, del más
    reciente en que el alumno tiene resultados."""
    indice = (await indices_alumnos(db, [alumno_id], periodo))[alumno_id]
    categoria = indice["categoria"]
    return {
        "periodo": indice["periodo"],
        "tiene_resultados": indice["tiene_resultados"],
        "indice": indice["indice"] if indice["tiene_resultados"] else None,
        "maximo": indice["maximo"],
        "categoria": categoria["nombre"] if indice["tiene_resultados"] and categoria else None,
        "componentes": _componentes(indice),
        "calificaciones": _calificaciones(indice["filas"]),
    }
