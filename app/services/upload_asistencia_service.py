"""Carga de asistencia por periodo: Excel con las columnas Nombre y Asistencias.

El alumno con más asistencias del archivo es el 100%; el de los demás es su
conteo entre ese máximo, por 100. Un alumno sin fila no tiene resultado y
cuenta 0%. Solo se empareja por nombre y solo si coincide con UN alumno del
periodo (emparejar_nombre.IDENTICO); homónimos, nombres incompletos y nombres
desconocidos quedan como no registrados (se asignan a mano con "Corregir").
No se registran alumnos nuevos.
"""

from __future__ import annotations

import io

import openpyxl
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.resultado_asistencia import ResultadoAsistencia
from app.services.emparejar_nombre import IDENTICO, buscar_por_nombre
from app.services.excel_utils import ArchivoExcelError, leer_filas
from app.services.registro_automatico_service import (
    guardar_filas_no_registradas,
    quitar_filas_no_registradas,
)
from app.services.upload_diagnostico_service import find_candidates_legacy, load_all_alumnos
from app.services.upload_webassign_service import candidatos_del_periodo

EXAMEN = "asistencia"
COLUMNAS = ("Nombre", "Asistencias")
MOTIVO_SIN_COINCIDENCIA = "El nombre no coincide con ningún alumno del periodo."


def plantilla_asistencia() -> bytes:
    wb = openpyxl.Workbook()
    wb.active.append(list(COLUMNAS))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def leer_asistencia(contenido: bytes) -> list[dict]:
    """Filas con nombre: [{"indice", "nombre", "asistencias"}].

    `indice` es la posición de la fila sin contar el encabezado (como en las
    demás cargas). Las filas sin nombre se ignoran.
    """
    filas = leer_filas(contenido)
    encabezado = [str(c or "").strip().lower() for c in (filas[0] if filas else [])]
    try:
        col_nombre, col_asist = (encabezado.index(c.lower()) for c in COLUMNAS)
    except ValueError:
        raise ArchivoExcelError(f"El archivo debe tener las columnas {' y '.join(COLUMNAS)}.")

    resultado = []
    for indice, fila in enumerate(filas[1:]):
        valor = lambda c: fila[c] if c < len(fila) else None  # noqa: E731
        nombre = str(valor(col_nombre) or "").strip()
        if not nombre:
            continue
        try:
            asistencias = float(valor(col_asist) or 0)
        except (TypeError, ValueError):
            asistencias = -1
        if asistencias < 0:
            raise ArchivoExcelError(f"Fila {indice + 2}: Asistencias debe ser un número mayor o igual a 0.")
        resultado.append({"indice": indice, "nombre": nombre, "asistencias": asistencias})
    return resultado


def porcentaje(asistencias: float, maximo: float) -> float:
    """100 para el máximo; 0 si nadie asistió."""
    return round(asistencias / maximo * 100, 2) if maximo else 0.0


def emparejar_asistencia(
    filas: list[dict], candidatos: dict[int, dict]
) -> tuple[dict[int, float], list[dict]]:
    """({alumno_id: porcentaje}, filas no registradas). Si un alumno viene dos veces se queda la mayor."""
    maximo = max((f["asistencias"] for f in filas), default=0)
    encontrados: dict[int, float] = {}
    no_registrados: list[dict] = []
    for f in filas:
        tipo, ids, motivo = buscar_por_nombre(f["nombre"], None, candidatos)
        if tipo == IDENTICO:
            pct = porcentaje(f["asistencias"], maximo)
            encontrados[ids[0]] = max(pct, encontrados.get(ids[0], 0.0))
        else:
            no_registrados.append({**f, "motivo": motivo or MOTIVO_SIN_COINCIDENCIA})
    return encontrados, no_registrados


async def _guardar(db: AsyncSession, periodo: str, porcentajes: dict[int, float]) -> None:
    previos = (
        await db.execute(
            select(ResultadoAsistencia).where(
                ResultadoAsistencia.periodo == periodo,
                ResultadoAsistencia.alumno_id.in_(porcentajes),
            )
        )
    ).scalars().all()
    por_alumno = {r.alumno_id: r for r in previos}
    for alumno_id, pct in porcentajes.items():
        if alumno_id in por_alumno:
            por_alumno[alumno_id].porcentaje = pct
        else:
            db.add(ResultadoAsistencia(alumno_id=alumno_id, periodo=periodo, porcentaje=pct))


async def procesar_asistencia(db: AsyncSession, contenido: bytes, periodo: str) -> dict:
    """Idempotente: reemplaza la asistencia del periodo con lo que trae el archivo."""
    filas = leer_asistencia(contenido)
    *_, detalles = await load_all_alumnos(db)
    encontrados, no_registrados = emparejar_asistencia(filas, candidatos_del_periodo(detalles, periodo))

    await db.execute(delete(ResultadoAsistencia).where(ResultadoAsistencia.periodo == periodo))
    await _guardar(db, periodo, encontrados)
    await guardar_filas_no_registradas(
        db,
        periodo,
        EXAMEN,
        [{"indice": f["indice"], "nombre": f["nombre"]} for f in no_registrados],
    )
    await db.commit()

    return {
        "periodo": periodo,
        "total_filas": len(filas),
        "encontrados": len(encontrados),
        "no_encontrados": len(no_registrados),
        "no_encontrados_detalle": [
            {
                "nombre_original": f["nombre"],
                "correo": None,
                "motivo": f["motivo"],
                "candidatos": find_candidates_legacy(f["nombre"], detalles),
                "indice": f["indice"],
            }
            for f in no_registrados
        ],
    }


async def corregir_matching_asistencia(
    db: AsyncSession, contenido: bytes, periodo: str, correcciones: list[dict]
) -> dict:
    """Asigna a mano filas del archivo a un alumno, con el porcentaje que les toca."""
    filas = leer_asistencia(contenido)
    maximo = max((f["asistencias"] for f in filas), default=0)
    asignaciones = {c["indice"]: c["alumno_id"] for c in correcciones}

    porcentajes: dict[int, float] = {}
    for f in filas:
        alumno_id = asignaciones.get(f["indice"])
        if alumno_id is not None and await db.get(Alumno, alumno_id) is not None:
            porcentajes[alumno_id] = max(
                porcentaje(f["asistencias"], maximo), porcentajes.get(alumno_id, 0.0)
            )
            await quitar_filas_no_registradas(db, periodo, EXAMEN, [f["indice"]])

    await _guardar(db, periodo, porcentajes)
    await db.commit()
    return {"encontrados": len(porcentajes)}
