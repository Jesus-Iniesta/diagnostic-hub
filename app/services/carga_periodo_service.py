"""Carga completa del periodo: archivos guardados y "Procesar todo".

Los archivos de exámenes se guardan por (periodo, examen) sin procesarse. Al
"Procesar todo" el frontend llama, en orden, a procesar_archivo para cada
examen guardado (cuestionarios -> finales -> WebAssign), luego a
juntar_repetidos y luego otra vez a procesar_archivo con los mismos archivos
(segunda vuelta). Se hace archivo por archivo para poder mostrar en cuál va.

Procesar es idempotente: los resultados se guardan uno por alumno y periodo,
así que repetir un archivo no duplica nada.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.archivo_periodo import ArchivoPeriodo
from app.services.unir_alumnos_service import nombres_compatibles, unir_alumnos
from app.services.upload_webassign_service import CARRERAS

MATERIAS_FINAL = {
    "algebra": "Álgebra",
    "trigonometria": "Trigonometría",
    "geometria": "Geometría",
    "calculo": "Cálculo",
}

# En el orden en que se procesan.
EXAMENES: list[tuple[str, str]] = [
    ("cuestionario_1", "Cuestionario 1"),
    ("cuestionario_2", "Cuestionario 2"),
    *((f"final_{m}", f"Final {nombre}") for m, nombre in MATERIAS_FINAL.items()),
    *((f"webassign_{c}", f"WebAssign {c}") for c in CARRERAS),
]
ETIQUETAS = dict(EXAMENES)
ORDEN = {examen: i for i, (examen, _) in enumerate(EXAMENES)}


class CargaPeriodoError(ValueError):
    pass


def validar_examen(examen: str) -> str:
    if examen not in ETIQUETAS:
        raise CargaPeriodoError(f"Examen no válido: {examen}")
    return examen


def _periodo(periodo: str) -> str:
    p = (periodo or "").strip()
    if not p:
        raise CargaPeriodoError("Indica el periodo.")
    return p


def _info(archivo: ArchivoPeriodo) -> dict:
    return {
        "examen": archivo.examen,
        "etiqueta": ETIQUETAS.get(archivo.examen, archivo.examen),
        "nombre_archivo": archivo.nombre_archivo,
        "subido_en": archivo.subido_en.isoformat(),
    }


async def listar_archivos(db: AsyncSession, periodo: str) -> list[dict]:
    rows = (
        await db.execute(
            select(ArchivoPeriodo).where(ArchivoPeriodo.periodo == _periodo(periodo))
        )
    ).scalars().all()
    return sorted((_info(a) for a in rows), key=lambda a: ORDEN.get(a["examen"], 99))


async def guardar_archivo(
    db: AsyncSession, periodo: str, examen: str, nombre_archivo: str, contenido: bytes
) -> dict:
    """Guarda el archivo; si ya había uno del mismo examen, lo reemplaza."""
    periodo = _periodo(periodo)
    validar_examen(examen)
    archivo = await db.scalar(
        select(ArchivoPeriodo).where(
            ArchivoPeriodo.periodo == periodo, ArchivoPeriodo.examen == examen
        )
    )
    if archivo is None:
        archivo = ArchivoPeriodo(periodo=periodo, examen=examen)
        db.add(archivo)
    archivo.nombre_archivo = nombre_archivo[:255]
    archivo.contenido = contenido
    archivo.subido_en = datetime.now()
    await db.commit()
    return _info(archivo)


async def _contenido(db: AsyncSession, periodo: str, examen: str) -> bytes:
    archivo = await db.scalar(
        select(ArchivoPeriodo).where(
            ArchivoPeriodo.periodo == periodo, ArchivoPeriodo.examen == examen
        )
    )
    if archivo is None:
        raise CargaPeriodoError(f"No hay archivo guardado de {ETIQUETAS[examen]}.")
    return archivo.contenido


async def procesar_archivo(db: AsyncSession, periodo: str, examen: str) -> dict:
    """Procesa un archivo guardado igual que en su pestaña y resume el resultado."""
    from app.services.upload_cuestionario_service import procesar_cuestionario
    from app.services.upload_diagnostico_service import procesar_examen_diagnostico
    from app.services.upload_webassign_service import procesar_webassign

    periodo = _periodo(periodo)
    validar_examen(examen)
    contenido = await _contenido(db, periodo, examen)

    tipo, _, clave = examen.partition("_")
    if tipo == "cuestionario":
        r = await procesar_cuestionario(db, contenido, int(clave), periodo)
    elif tipo == "final":
        r = await procesar_examen_diagnostico(db, contenido, clave, periodo)
    else:
        r = await procesar_webassign(db, contenido, clave, periodo)
        await db.commit()

    return {
        "examen": examen,
        "etiqueta": ETIQUETAS[examen],
        "total_filas": r["total_filas"],
        "encontrados": r["encontrados"],
        "registrados_nuevos": r.get("registrados_nuevos", 0),
        "no_registrados": r["no_encontrados"],
    }


def _identificadores_archivo(examen: str, contenido: bytes) -> list[tuple[list, list, list]]:
    """(correos, cuentas, folios) de cada fila, ya normalizados."""
    from app.services.excel_utils import leer_filas
    from app.services import upload_cuestionario_service as cuest
    from app.services import upload_diagnostico_service as diag
    from app.services.upload_webassign_service import parse_webassign_excel

    tipo, _, clave = examen.partition("_")
    filas: list[tuple[list, list, list]] = []
    if tipo == "cuestionario":
        headers, rows = cuest._leer_workbook(contenido)
        cols = cuest.detectar_columnas_cuestionario(headers)
        for row in rows:
            cuentas, folios = cuest._identificadores_fila(row, cols)
            filas.append((cuest._correos_fila(row, cols), cuentas, folios))
    elif tipo == "final":
        for row in leer_filas(contenido)[1:]:
            valor = lambda i: row[i] if len(row) > i else None  # noqa: E731
            cuenta, folio = diag.clasificar_columnas_cuenta_folio(
                valor(diag.COL_CUENTA), valor(diag.COL_FOLIO)
            )
            correo = diag.normalize_email(valor(diag.COL_EMAIL))
            filas.append(([correo] if correo else [], [cuenta] if cuenta else [], [folio] if folio else []))
    else:
        rows, _ = parse_webassign_excel(contenido, clave)
        for r in rows:
            filas.append(([r["email"]] if r["email"] else [], [], []))
    return filas


def decidir_union(
    duenos: list[int], alumno_details: dict[int, dict], periodo_key: str
) -> int | None:
    """Con qué alumno se queda un grupo que resultó ser la misma persona.

    `duenos` son los alumnos (distintos) a los que apuntan los correos, cuenta
    y folio de UNA fila. Solo se juntan si todos son del periodo, a lo más uno
    viene del padrón (los demás son provisionales) y sus nombres no se
    contradicen. Devuelve el que se conserva (el del padrón o el más antiguo),
    o None si no se deben juntar.
    """
    from app.services.upload_diagnostico_service import normalizar_periodo

    if len(duenos) < 2 or any(d not in alumno_details for d in duenos):
        return None
    for d in duenos:
        p = str(alumno_details[d].get("periodo_ingreso") or "")
        if (normalizar_periodo(p) or "".join(p.upper().split())) != periodo_key:
            return None
    normales = [d for d in duenos if not alumno_details[d].get("provisional")]
    if len(normales) > 1:
        return None
    nombres = [alumno_details[d].get("nombre") for d in duenos]
    for i, a in enumerate(nombres):
        for b in nombres[i + 1:]:
            if not nombres_compatibles(a, b):
                return None
    return normales[0] if normales else min(duenos)


async def juntar_repetidos(db: AsyncSession, periodo: str) -> dict:
    """Junta a los alumnos que una misma fila identifica como la misma persona.

    Pasa cuando una fila trae un dato de un alumno y otro de un alumno distinto
    (p. ej. el correo con que se registró en el cuestionario y la cuenta con
    que se registró en el examen final). Ver decidir_union.
    """
    from app.services.upload_diagnostico_service import load_all_alumnos, normalizar_periodo

    periodo = _periodo(periodo)
    periodo_key = normalizar_periodo(periodo) or "".join(periodo.upper().split())
    archivos = (
        await db.execute(select(ArchivoPeriodo).where(ArchivoPeriodo.periodo == periodo))
    ).scalars().all()

    email_map, cuenta_map, folio_map, details = await load_all_alumnos(db)
    mapas = (email_map, cuenta_map, folio_map)
    juntados: list[dict] = []

    for archivo in sorted(archivos, key=lambda a: ORDEN.get(a.examen, 99)):
        for fila in _identificadores_archivo(archivo.examen, archivo.contenido):
            duenos: list[int] = []
            for valores, mapa in zip(fila, mapas):
                for v in valores:
                    aid = mapa.get(v)
                    if aid is not None and aid not in duenos:
                        duenos.append(aid)
            conservar = decidir_union(duenos, details, periodo_key)
            if conservar is None:
                continue
            for otro in duenos:
                if otro == conservar:
                    continue
                await unir_alumnos(db, conservar, otro)
                for mapa in mapas:
                    for k, v in mapa.items():
                        if v == otro:
                            mapa[k] = conservar
                quedan, sale = details[conservar], details.pop(otro)
                if not (quedan.get("nombre") or "").strip():
                    quedan["nombre"] = sale.get("nombre") or ""
                quedan["provisional"] = bool(quedan.get("provisional") and sale.get("provisional"))
                juntados.append(
                    {
                        "alumno_id": conservar,
                        "eliminado_id": otro,
                        "nombre": quedan.get("nombre") or sale.get("nombre") or "",
                        "examen": ETIQUETAS.get(archivo.examen, archivo.examen),
                    }
                )

    await db.commit()
    return {"juntados": len(juntados), "detalle": juntados}
