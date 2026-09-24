import io

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.resultado_cuestionario_diagnostico import (
    ResultadoCuestionarioDiagnostico,
)
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.resultado_webassign import ResultadoWebAssign
from app.models.user import User

HEADER_FILL = PatternFill(start_color="1C1954", end_color="1C1954", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=10)
SUBHEADER_FILL = PatternFill(start_color="E8EAF6", end_color="E8EAF6", fill_type="solid")
SUBHEADER_FONT = Font(bold=True, size=10)
DATA_FONT = Font(size=10)
THIN_BORDER = Border(
    left=Side(style="thin", color="D0D0D0"),
    right=Side(style="thin", color="D0D0D0"),
    top=Side(style="thin", color="D0D0D0"),
    bottom=Side(style="thin", color="D0D0D0"),
)


def _fmt_score(value: float | None) -> float:
    return value if value is not None else 0.0


def _diag_materia(c1: int | None, c2: int | None) -> float:
    """Calificación de diagnóstico (0-10) = (aciertos_c1 + aciertos_c2) * 0.5."""
    aciertos = (c1 if c1 is not None else 0) + (c2 if c2 is not None else 0)
    return aciertos * 0.5


def _fmt_wa(value: float | None, tiene_wa: bool) -> float | str:
    if not tiene_wa:
        return 0
    if value is None or value == 0:
        return "No trabajó"
    return value


def _style_header(ws, row, max_col):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = THIN_BORDER


def _style_data(ws, row, max_col):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = DATA_FONT
        cell.border = THIN_BORDER
        if col > 1:
            cell.alignment = Alignment(horizontal="center")


CREANI_FILL_AZUL = PatternFill(start_color="A6CAEC", end_color="A6CAEC", fill_type="solid")
CREANI_FILL_NARANJA = PatternFill(start_color="F6C6AD", end_color="F6C6AD", fill_type="solid")
CREANI_FILL_VERDE = PatternFill(start_color="84E291", end_color="84E291", fill_type="solid")
CREANI_FILL_VERDE_CLARO = PatternFill(start_color="D9F2D0", end_color="D9F2D0", fill_type="solid")
CREANI_FONT = Font(name="Aptos Narrow", size=11)
CREANI_FONT_BOLD = Font(name="Aptos Narrow", size=11, bold=True)
CREANI_THIN = Side(style="thin")
CREANI_MEDIUM = Side(style="medium")

CREANI_COL_FILL = {
    1: None, 2: None, 3: None, 4: None,
    5: CREANI_FILL_AZUL, 6: CREANI_FILL_NARANJA, 7: CREANI_FILL_VERDE,
    8: CREANI_FILL_VERDE_CLARO, 9: None,
    10: CREANI_FILL_AZUL, 11: CREANI_FILL_AZUL,
    12: CREANI_FILL_NARANJA, 13: CREANI_FILL_NARANJA,
    14: CREANI_FILL_VERDE, 15: CREANI_FILL_VERDE,
    16: CREANI_FILL_AZUL, 17: CREANI_FILL_NARANJA, 18: CREANI_FILL_VERDE,
    19: CREANI_FILL_VERDE_CLARO, 20: None,
}

CREANI_HEADERS = [
    "Nombre", "No. de cuenta", "Grupo", "Licenciatura",
    "Álgebra", "Trig.", "G. Analítica", "Cálc. Dif", "Promedio",
    "Trabajo", "Examen", "Trabajo", "Examen", "Trabajo", "Examen",
    "Álgebra", "Trig.", "G. Analítica", "Cálc. Dif", "Promedio",
]


def _construir_filas_creani(data: list[dict]) -> list[dict]:
    """Único lugar donde se decide de dónde sale cada columna del reporte CREANI."""
    filas = []
    for d in data:
        numero_cuenta: int | str = ""
        if d["numero_cuenta"]:
            try:
                numero_cuenta = int(d["numero_cuenta"])
            except (TypeError, ValueError):
                numero_cuenta = ""
        filas.append({
            "nombre": d["nombre"].upper(),
            "numero_cuenta": numero_cuenta,
            "grupo": 0,  # TEMPORAL: pendiente confirmar con la Coordinación de dónde sale
            "licenciatura": d["ingenieria"] or "",
            "diag_algebra": _diag_materia(d["aciertos_c1_algebra"], d["aciertos_c2_algebra"]),
            "diag_trig": _diag_materia(d["aciertos_c1_trigonometria"], d["aciertos_c2_trigonometria"]),
            "diag_geometria": _diag_materia(d["aciertos_c1_geometria"], d["aciertos_c2_geometria"]),
            "diag_calculo": _diag_materia(d["aciertos_c1_calculo"], d["aciertos_c2_calculo"]),
            "wa_alg_trabajo": d["algebra_trabajo"] or 0,
            "wa_alg_examen": d["algebra_examen"] or 0,
            "wa_trig_trabajo": d["trigonometria_trabajo"] or 0,
            "wa_trig_examen": d["trigonometria_examen"] or 0,
            "wa_ga_trabajo": d["geometria_trabajo"] or 0,
            "wa_ga_examen": d["geometria_examen"] or 0,
            "final_algebra": d["puntaje_algebra"] or 0,
            "final_trig": d["puntaje_trigonometria"] or 0,
            "final_geometria": d["puntaje_geometria"] or 0,
            "final_calculo": d["puntaje_calculo"] or 0,
        })
    filas.sort(key=lambda f: f["nombre"])
    return filas


def _estilo_bloque(ws, rng: str, valor: str, fill=None):
    ws.merge_cells(rng)
    bloque = ws[rng]
    primera = bloque[0][0]
    primera.value = valor
    for fila in bloque:
        for celda in fila:
            celda.font = CREANI_FONT
            celda.alignment = Alignment(horizontal="center", vertical="center")
            if fill is not None:
                celda.fill = fill
    return primera


def _contorno(ws, r1: int, c1: int, r2: int, c2: int):
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            celda = ws.cell(r, c)
            b = celda.border
            celda.border = Border(
                left=CREANI_MEDIUM if c == c1 else b.left,
                right=CREANI_MEDIUM if c == c2 else b.right,
                top=CREANI_MEDIUM if r == r1 else b.top,
                bottom=CREANI_MEDIUM if r == r2 else b.bottom,
            )


def _write_resumen_ws(ws, filas: list[dict]):
    _estilo_bloque(ws, "J1:O1", "WebAssign")
    _estilo_bloque(ws, "E2:I2", "Diagnóstico")
    _estilo_bloque(ws, "J2:K2", "Algebra", CREANI_FILL_AZUL)
    _estilo_bloque(ws, "L2:M2", "Trigonometría", CREANI_FILL_NARANJA)
    _estilo_bloque(ws, "N2:O2", "Geometría Analítica", CREANI_FILL_VERDE)
    _estilo_bloque(ws, "P2:T2", "Final")

    for col, encabezado in enumerate(CREANI_HEADERS, 1):
        celda = ws.cell(3, col)
        celda.value = encabezado
        celda.font = CREANI_FONT_BOLD if col in (9, 20) else CREANI_FONT
        fill = CREANI_COL_FILL[col]
        if fill is not None:
            celda.fill = fill
        celda.border = Border(
            left=CREANI_THIN, right=CREANI_THIN, top=CREANI_THIN, bottom=CREANI_THIN
        )
        if 5 <= col <= 15:
            celda.number_format = "0.0"

    for fila_idx, f in enumerate(filas, 4):
        valores = {
            1: f["nombre"],
            2: f["numero_cuenta"],
            3: f["grupo"],
            4: f["licenciatura"],
            5: f["diag_algebra"],
            6: f["diag_trig"],
            7: f["diag_geometria"],
            8: f["diag_calculo"],
            10: f["wa_alg_trabajo"],
            11: f["wa_alg_examen"],
            12: f["wa_trig_trabajo"],
            13: f["wa_trig_examen"],
            14: f["wa_ga_trabajo"],
            15: f["wa_ga_examen"],
            16: f["final_algebra"],
            17: f["final_trig"],
            18: f["final_geometria"],
            19: f["final_calculo"],
        }
        for col in range(1, 21):
            celda = ws.cell(fila_idx, col)
            if col == 9:
                celda.value = f"=(E{fila_idx}+F{fila_idx}+G{fila_idx}+H{fila_idx})/4"
            elif col == 20:
                celda.value = f"=(P{fila_idx}+Q{fila_idx}+R{fila_idx}+S{fila_idx})/4"
            else:
                celda.value = valores[col]
            celda.font = CREANI_FONT_BOLD if col in (9, 20) else CREANI_FONT
            fill = CREANI_COL_FILL[col]
            if fill is not None:
                celda.fill = fill
            celda.border = Border(
                left=CREANI_THIN, right=CREANI_THIN, top=CREANI_THIN, bottom=CREANI_THIN
            )
            if 5 <= col <= 15:
                celda.number_format = "0.0"
            elif col >= 16:
                celda.number_format = "General"

    ultima = 3 + len(filas)
    _contorno(ws, 3, 1, ultima, 20)
    for col_div in (4, 9, 15):
        for r in range(3, ultima + 1):
            celda = ws.cell(r, col_div)
            celda.border = Border(
                left=celda.border.left,
                right=CREANI_MEDIUM,
                top=celda.border.top,
                bottom=celda.border.bottom,
            )
    _contorno(ws, 1, 10, 1, 15)
    _contorno(ws, 2, 5, 2, 9)
    _contorno(ws, 2, 10, 2, 11)
    _contorno(ws, 2, 12, 2, 13)
    _contorno(ws, 2, 14, 2, 15)
    _contorno(ws, 2, 16, 2, 20)

    ws.auto_filter.ref = f"A3:T{ultima}"
    ws.sheet_format.defaultColWidth = 11.43
    ws.column_dimensions["A"].width = 38.43
    for col in range(2, 21):
        ws.column_dimensions[get_column_letter(col)].width = 11.43


async def _load_data(
    db: AsyncSession, periodo: str, licenciatura: str | None = None
) -> list[dict]:
    periodo_norm = periodo.strip().upper()

    stmt = (
        select(
            Alumno,
            User,
            Ingenieria,
            ResultadoDiagnostico,
            ResultadoWebAssign,
            ResultadoCuestionarioDiagnostico,
        )
        .join(User, Alumno.usuario_id == User.id)
        .outerjoin(Ingenieria, Alumno.ingenieria_id == Ingenieria.id)
        .outerjoin(
            ResultadoDiagnostico,
            (ResultadoDiagnostico.alumno_id == Alumno.id)
            & (ResultadoDiagnostico.periodo == periodo),
        )
        .outerjoin(
            ResultadoWebAssign,
            (ResultadoWebAssign.alumno_id == Alumno.id)
            & (ResultadoWebAssign.periodo == periodo),
        )
        .outerjoin(
            ResultadoCuestionarioDiagnostico,
            (ResultadoCuestionarioDiagnostico.alumno_id == Alumno.id)
            & (ResultadoCuestionarioDiagnostico.periodo == periodo),
        )
        .options(selectinload(Alumno.ingenieria))
    )

    es_generacion = func.upper(func.trim(Alumno.periodo_ingreso)) == periodo_norm
    tiene_diag = ResultadoDiagnostico.id.isnot(None)
    tiene_wa = ResultadoWebAssign.id.isnot(None)
    tiene_diag_c = ResultadoCuestionarioDiagnostico.id.isnot(None)
    stmt = stmt.where(or_(es_generacion, tiene_diag, tiene_wa, tiene_diag_c))

    if licenciatura:
        stmt = stmt.where(Ingenieria.clave == licenciatura)
    result = await db.execute(stmt)
    rows = result.all()

    data = []
    seen = set()
    for alumno, user, ingenieria, diag, wa, cdiag in rows:
        if alumno.id in seen:
            continue
        seen.add(alumno.id)
        data.append({
            "nombre": f"{user.apellido_paterno} {user.apellido_materno} {user.nombre}".strip(),
            "numero_cuenta": alumno.numero_cuenta or "",
            "ingenieria": ingenieria.clave if ingenieria else "",
            "puntaje_algebra": diag.puntaje_algebra if diag else None,
            "puntaje_trigonometria": diag.puntaje_trigonometria if diag else None,
            "puntaje_geometria": diag.puntaje_geometria if diag else None,
            "puntaje_calculo": diag.puntaje_calculo if diag else None,
            "promedio_diagnostico": diag.promedio_diagnostico if diag else None,
            "aciertos_c1_algebra": cdiag.aciertos_c1_algebra if cdiag else None,
            "aciertos_c1_trigonometria": cdiag.aciertos_c1_trigonometria if cdiag else None,
            "aciertos_c1_geometria": cdiag.aciertos_c1_geometria if cdiag else None,
            "aciertos_c1_calculo": cdiag.aciertos_c1_calculo if cdiag else None,
            "aciertos_c2_algebra": cdiag.aciertos_c2_algebra if cdiag else None,
            "aciertos_c2_trigonometria": cdiag.aciertos_c2_trigonometria if cdiag else None,
            "aciertos_c2_geometria": cdiag.aciertos_c2_geometria if cdiag else None,
            "aciertos_c2_calculo": cdiag.aciertos_c2_calculo if cdiag else None,
            "algebra_trabajo": wa.algebra_trabajo if wa else None,
            "algebra_examen": wa.algebra_examen if wa else None,
            "trigonometria_trabajo": wa.trigonometria_trabajo if wa else None,
            "trigonometria_examen": wa.trigonometria_examen if wa else None,
            "geometria_trabajo": wa.geometria_trabajo if wa else None,
            "geometria_examen": wa.geometria_examen if wa else None,
            "carrera_wa": wa.carrera if wa else "",
            "tiene_wa": wa is not None,
        })

    data.sort(key=lambda r: (r["ingenieria"], r["nombre"]))
    return data


def _write_resumen_final(wb: openpyxl.Workbook, data: list[dict]):
    ws = wb.create_sheet("Resumen final")
    _write_resumen_ws(ws, _construir_filas_creani(data))


def _write_resumen_por_licenciatura(
    wb: openpyxl.Workbook,
    data: list[dict],
    licenciaturas: list[tuple[str, str]],
):
    for clave, _ in licenciaturas:
        rows = [d for d in data if d["ingenieria"] == clave]
        if not rows:
            continue
        ws = wb.create_sheet(f"Resumen {clave}")
        _write_resumen_ws(ws, _construir_filas_creani(rows))


def _write_diagnostico(wb: openpyxl.Workbook, data: list[dict]):
    ws = wb.create_sheet("Diagnóstico")
    headers = [
        "Nombre", "No. de cuenta", "Licenciatura",
        "Álgebra", "Trigonometría", "Geometría Analítica",
        "Cálculo Diferencial", "Promedio",
    ]
    ws.append(headers)
    _style_header(ws, 1, len(headers))

    for d in data:
        ws.append([
            d["nombre"],
            d["numero_cuenta"],
            d["ingenieria"],
            _fmt_score(d["puntaje_algebra"]),
            _fmt_score(d["puntaje_trigonometria"]),
            _fmt_score(d["puntaje_geometria"]),
            _fmt_score(d["puntaje_calculo"]),
            _fmt_score(d["promedio_diagnostico"]),
        ])
        _style_data(ws, ws.max_row, len(headers))

    ws.column_dimensions["A"].width = 38
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 10
    for col in range(4, 9):
        ws.column_dimensions[get_column_letter(col)].width = 16


def _write_webassign(wb: openpyxl.Workbook, data: list[dict]):
    ws = wb.create_sheet("WebAssign")
    headers = [
        "Nombre", "No. de cuenta", "Licenciatura", "Carrera",
        "Ál. Trabajo", "Ál. Examen",
        "Tr. Trabajo", "Tr. Examen",
        "G.A. Trabajo", "G.A. Examen",
    ]
    ws.append(headers)
    _style_header(ws, 1, len(headers))

    wa_data = [d for d in data if d["algebra_trabajo"] is not None or d["trigonometria_trabajo"] is not None]

    for d in wa_data:
        ws.append([
            d["nombre"],
            d["numero_cuenta"],
            d["ingenieria"],
            d["carrera_wa"],
            _fmt_wa(d["algebra_trabajo"], d["tiene_wa"]),
            _fmt_wa(d["algebra_examen"], d["tiene_wa"]),
            _fmt_wa(d["trigonometria_trabajo"], d["tiene_wa"]),
            _fmt_wa(d["trigonometria_examen"], d["tiene_wa"]),
            _fmt_wa(d["geometria_trabajo"], d["tiene_wa"]),
            _fmt_wa(d["geometria_examen"], d["tiene_wa"]),
        ])
        _style_data(ws, ws.max_row, len(headers))

    ws.column_dimensions["A"].width = 38
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 10
    ws.column_dimensions["D"].width = 10
    for col in range(5, 11):
        ws.column_dimensions[get_column_letter(col)].width = 14


async def generar_excel_reporte(
    db: AsyncSession, periodo: str, licenciatura: str | None = None
) -> bytes:
    data = await _load_data(db, periodo, licenciatura)

    licenciaturas = sorted({(d["ingenieria"], d["ingenieria"]) for d in data})

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    _write_resumen_final(wb, data)
    _write_resumen_por_licenciatura(wb, data, licenciaturas)
    _write_diagnostico(wb, data)
    _write_webassign(wb, data)

    buf = io.BytesIO()
    wb.save(buf)
    wb.close()
    return buf.getvalue()


async def get_periodos_disponibles(db: AsyncSession) -> list[str]:
    stmt_d = select(ResultadoDiagnostico.periodo).distinct()
    stmt_w = select(ResultadoWebAssign.periodo).distinct()
    stmt_c = select(ResultadoCuestionarioDiagnostico.periodo).distinct()
    periods_d = (await db.execute(stmt_d)).scalars().all()
    periods_w = (await db.execute(stmt_w)).scalars().all()
    periods_c = (await db.execute(stmt_c)).scalars().all()
    return sorted(set(periods_d + periods_w + periods_c), reverse=True)


async def get_stats_reporte(db: AsyncSession, periodo: str) -> dict:
    from sqlalchemy import func

    diag_count = (await db.execute(
        select(func.count()).select_from(ResultadoDiagnostico).where(
            ResultadoDiagnostico.periodo == periodo
        )
    )).scalar_one()

    wa_count = (await db.execute(
        select(func.count()).select_from(ResultadoWebAssign).where(
            ResultadoWebAssign.periodo == periodo
        )
    )).scalar_one()

    wa_by_carrera = (await db.execute(
        select(ResultadoWebAssign.carrera, func.count())
        .where(ResultadoWebAssign.periodo == periodo)
        .group_by(ResultadoWebAssign.carrera)
    )).all()

    diag_by_ing = (await db.execute(
        select(
            Alumno.ingenieria_id,
            func.count(func.distinct(ResultadoDiagnostico.alumno_id)),
        )
        .join(ResultadoDiagnostico, ResultadoDiagnostico.alumno_id == Alumno.id)
        .where(ResultadoDiagnostico.periodo == periodo)
        .group_by(Alumno.ingenieria_id)
    )).all()

    wa_by_ing = (await db.execute(
        select(
            Alumno.ingenieria_id,
            func.count(func.distinct(ResultadoWebAssign.alumno_id)),
        )
        .join(ResultadoWebAssign, ResultadoWebAssign.alumno_id == Alumno.id)
        .where(ResultadoWebAssign.periodo == periodo)
        .group_by(Alumno.ingenieria_id)
    )).all()

    diag_map = dict(diag_by_ing)
    wa_map = dict(wa_by_ing)

    ingenierias = (await db.execute(
        select(Ingenieria).order_by(Ingenieria.nombre)
    )).scalars().all()

    por_licenciatura = [
        {
            "clave": ing.clave,
            "nombre": ing.nombre,
            "diagnosticos": diag_map.get(ing.id, 0),
            "webassign": wa_map.get(ing.id, 0),
        }
        for ing in ingenierias
    ]

    return {
        "periodo": periodo,
        "diagnosticos": diag_count,
        "webassign": wa_count,
        "webassign_por_carrera": {c: n for c, n in wa_by_carrera},
        "por_licenciatura": por_licenciatura,
    }
