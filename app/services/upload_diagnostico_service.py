from __future__ import annotations

import io
import json
import re
import unicodedata

import openpyxl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.user import User
from app.repositories.diagnostico_repository import DiagnosticoRepository


MATERIA_COLUMNS: dict[str, dict[str, int]] = {
    "algebra": {"prefix": "FA", "start_col": 7, "questions": 20},
    "trigonometria": {"prefix": "FT", "start_col": 7, "questions": 20},
    "geometria": {"prefix": "FG", "start_col": 7, "questions": 20},
    "calculo": {"prefix": "FC", "start_col": 7, "questions": 20},
}

COL_TIMESTAMP = 0
COL_EMAIL = 1
COL_SCORE = 2
COL_NAME = 3
COL_CUENTA = 4
COL_FOLIO = 5
COL_HOUR = 6


def normalize_name(raw: str) -> str:
    if not raw:
        return ""
    s = str(raw).strip()
    s = re.sub(r"\s+", " ", s)
    return s


def normalize_name_display(raw: str) -> str:
    if not raw:
        return ""
    s = str(raw).strip()
    s = re.sub(r"\s+", " ", s)
    nfkd = unicodedata.normalize("NFKD", s)
    without_accents = "".join(c for c in nfkd if not unicodedata.combining(c))
    return without_accents.title()


def normalize_name_for_match(raw: str) -> str:
    if not raw:
        return ""
    s = str(raw).strip().lower()
    s = re.sub(r"\s+", " ", s)
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalize_email(raw: object | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    return s if "@" in s else None


def normalize_cuenta(raw: object | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    digits = re.sub(r"\D", "", s)
    return digits if len(digits) == 7 else None


def normalize_folio(raw: object | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    digits = re.sub(r"\D", "", s)
    return digits if len(digits) == 9 else None


def extract_answer_key_from_raw(raw: object | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None

    s_lower = s.lower()

    m = re.search(r"la\s+opci[oó]n\s+([abcd])\)", s_lower)
    if m:
        return m.group(1)

    m = re.search(r"\(([abcd])\)", s_lower)
    if m:
        return m.group(1)

    m = re.search(r"\b([abcd])\)", s_lower)
    if m:
        return m.group(1)

    if s_lower in ("a", "b", "c", "d"):
        return s_lower

    num_map = {"1": "a", "2": "b", "3": "c", "4": "d"}
    if s in num_map:
        return num_map[s]

    if len(s) == 1 and s_lower in ("a", "b", "c", "d"):
        return s_lower

    return None


def calculate_section_score(
    answers: list[str | None],
    correct_key: list[str],
    section_start: int,
    section_size: int = 5,
) -> float:
    correct = 0
    for i in range(section_start, min(section_start + section_size, len(answers))):
        if i < len(correct_key) and answers[i] == correct_key[i]:
            correct += 1
    return round(correct * 0.5, 2)


def calculate_exam_score(
    answers: list[str | None],
    correct_key: list[str],
) -> float:
    correct = 0
    for i in range(len(answers)):
        if i < len(correct_key) and answers[i] == correct_key[i]:
            correct += 1
    return round(correct * 0.5, 2)


def generate_answer_codes(prefix: str, count: int = 20) -> list[str]:
    codes = []
    for i in range(count):
        section = i // 5 + 1
        pos = i % 5 + 1
        codes.append(f"{prefix}{section}{pos}")
    return codes


async def load_all_alumnos(
    db: AsyncSession,
) -> tuple[
    dict[str, int],
    dict[str, int],
    dict[str, int],
    dict[str, dict],
]:
    email_map: dict[str, int] = {}
    cuenta_map: dict[str, int] = {}
    folio_map: dict[str, int] = {}
    alumno_details: dict[int, dict] = {}

    stmt = (
        select(Alumno, User)
        .join(User, Alumno.usuario_id == User.id)
        .options(selectinload(Alumno.ingenieria))
    )
    result = await db.execute(stmt)
    rows = result.all()

    for alumno, user in rows:
        if user.correo_personal:
            email_map[user.correo_personal.lower().strip()] = alumno.id
        if alumno.numero_cuenta:
            cuenta_map[alumno.numero_cuenta] = alumno.id
        if alumno.numero_folio:
            folio_map[alumno.numero_folio] = alumno.id
        alumno_details[alumno.id] = {
            "nombre": f"{user.nombre} {user.apellido_paterno} {user.apellido_materno}",
            "cuenta": alumno.numero_cuenta,
            "folio": alumno.numero_folio,
            "correo": user.correo_personal,
            "ingenieria": alumno.ingenieria.clave if alumno.ingenieria else "",
        }

    return email_map, cuenta_map, folio_map, alumno_details


def find_alumno(
    email: str | None,
    cuenta: str | None,
    folio: str | None,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
) -> int | None:
    if email and email in email_map:
        return email_map[email]
    if cuenta and cuenta in cuenta_map:
        return cuenta_map[cuenta]
    if folio and folio in folio_map:
        return folio_map[folio]
    return None


def find_candidates(
    name: str,
    alumno_details: dict[int, dict],
    limit: int = 5,
) -> list[dict]:
    if not name:
        return []
    normalized = normalize_name_for_match(name)
    candidates = []
    for aid, info in alumno_details.items():
        db_name = normalize_name_for_match(info["nombre"])
        if normalized in db_name or db_name in normalized:
            candidates.append({
                "alumno_id": aid,
                "nombre": info["nombre"],
                "cuenta": info["cuenta"],
                "correo": info["correo"],
            })
            if len(candidates) >= limit:
                break
    return candidates


async def procesar_examen_diagnostico(
    db: AsyncSession,
    file_bytes: bytes,
    materia: str,
    periodo: str,
) -> dict:
    if materia not in MATERIA_COLUMNS:
        raise ValueError(f"Materia no válida: {materia}")

    config = MATERIA_COLUMNS[materia]
    prefix = config["prefix"]
    question_count = config["questions"]

    repo = DiagnosticoRepository(db)
    correct_key_dict = await repo.get_respuestas_correctas(materia, periodo)
    answer_codes = generate_answer_codes(prefix, question_count)

    if not correct_key_dict:
        correct_key = [""] * question_count
    else:
        correct_key = [correct_key_dict.get(code, "").lower() for code in answer_codes]

    email_map, cuenta_map, folio_map, alumno_details = await load_all_alumnos(db)

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    resultados = []
    no_encontrados = []

    for idx, row in enumerate(rows):
        raw_email = row[COL_EMAIL] if len(row) > COL_EMAIL else None
        raw_name = row[COL_NAME] if len(row) > COL_NAME else None
        raw_cuenta = row[COL_CUENTA] if len(row) > COL_CUENTA else None
        raw_folio = row[COL_FOLIO] if len(row) > COL_FOLIO else None

        email = normalize_email(raw_email)
        cuenta = normalize_cuenta(raw_cuenta)
        folio = normalize_folio(raw_folio)
        nombre_original = normalize_name(str(raw_name) if raw_name else "")

        answers = []
        for qi in range(question_count):
            col_idx = config["start_col"] + qi
            raw_answer = row[col_idx] if len(row) > col_idx else None
            key = extract_answer_key_from_raw(raw_answer)
            answers.append(key)

        alumno_id = find_alumno(email, cuenta, folio, email_map, cuenta_map, folio_map)

        if alumno_id is None:
            candidates = find_candidates(nombre_original, alumno_details)
            if len(candidates) == 1:
                alumno_id = candidates[0]["alumno_id"]
            else:
                no_encontrados.append({
                    "nombre_original": nombre_original,
                    "correo": email,
                    "cuenta": cuenta,
                    "folio": folio,
                    "materia": materia,
                    "motivo": "No se encontró alumno con email, cuenta o folio",
                    "candidatos": candidates,
                    "indice": idx,
                })
                continue

        detail = alumno_details[alumno_id]
        respuestas_details = []
        correctas_count = 0
        for qi, code in enumerate(answer_codes):
            is_correct = answers[qi] is not None and answers[qi] == correct_key[qi]
            if is_correct:
                correctas_count += 1
            respuestas_details.append({
                "codigo": code,
                "respuesta": answers[qi] or "",
                "correcta": is_correct,
            })

        puntaje = calculate_exam_score(answers, correct_key)

        respuestas_json = json.dumps(respuestas_details, ensure_ascii=False)

        await repo.upsert_resultado(
            alumno_id=alumno_id,
            periodo=periodo,
            respuestas_json=respuestas_json,
            materia=materia,
            puntaje=puntaje,
        )

        resultados.append({
            "alumno_id": alumno_id,
            "nombre_completo": detail["nombre"],
            "numero_cuenta": detail["cuenta"],
            "numero_folio": detail["folio"],
            "correo": detail["correo"],
            "ingenieria": detail["ingenieria"],
            "respuestas": respuestas_details,
            "puntaje": puntaje,
        })

    await db.commit()

    return {
        "materia": materia,
        "periodo": periodo,
        "total_filas": len(rows),
        "encontrados": len(resultados),
        "no_encontrados": len(no_encontrados),
        "resultados": resultados,
        "no_encontrados_detalle": no_encontrados,
    }


async def corregir_matching_diagnostico(
    db: AsyncSession,
    materia: str,
    periodo: str,
    file_bytes: bytes,
    correcciones: list[dict],
) -> dict:
    if materia not in MATERIA_COLUMNS:
        raise ValueError(f"Materia no válida: {materia}")

    config = MATERIA_COLUMNS[materia]
    prefix = config["prefix"]
    question_count = config["questions"]

    repo = DiagnosticoRepository(db)
    correct_key_dict = await repo.get_respuestas_correctas(materia, periodo)
    answer_codes = generate_answer_codes(prefix, question_count)

    if not correct_key_dict:
        correct_key = [""] * question_count
    else:
        correct_key = [correct_key_dict.get(code, "").lower() for code in answer_codes]

    _, cuenta_map, folio_map, alumno_details = await load_all_alumnos(db)

    correction_map = {c["indice"]: c["alumno_id"] for c in correcciones}

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    resultados = []

    for idx, row in enumerate(rows):
        if idx not in correction_map:
            continue

        alumno_id = correction_map[idx]
        if alumno_id not in alumno_details:
            continue

        answers = []
        for qi in range(question_count):
            col_idx = config["start_col"] + qi
            raw_answer = row[col_idx] if len(row) > col_idx else None
            key = extract_answer_key_from_raw(raw_answer)
            answers.append(key)

        detail = alumno_details[alumno_id]
        respuestas_details = []
        for qi, code in enumerate(answer_codes):
            is_correct = answers[qi] is not None and answers[qi] == correct_key[qi]
            respuestas_details.append({
                "codigo": code,
                "respuesta": answers[qi] or "",
                "correcta": is_correct,
            })

        puntaje = calculate_exam_score(answers, correct_key)
        respuestas_json = json.dumps(respuestas_details, ensure_ascii=False)

        await repo.upsert_resultado(
            alumno_id=alumno_id,
            periodo=periodo,
            respuestas_json=respuestas_json,
            materia=materia,
            puntaje=puntaje,
        )

        resultados.append({
            "alumno_id": alumno_id,
            "nombre_completo": detail["nombre"],
            "numero_cuenta": detail["cuenta"],
            "numero_folio": detail["folio"],
            "correo": detail["correo"],
            "ingenieria": detail["ingenieria"],
            "respuestas": respuestas_details,
            "puntaje": puntaje,
        })

    await db.commit()

    return {
        "materia": materia,
        "periodo": periodo,
        "total_filas": len(resultados),
        "encontrados": len(resultados),
        "no_encontrados": 0,
        "resultados": resultados,
        "no_encontrados_detalle": [],
    }


async def get_resultados_consolidados(
    db: AsyncSession, periodo: str
) -> list[dict]:
    repo = DiagnosticoRepository(db)
    resultados = await repo.get_resultados_by_periodo(periodo)

    alumno_ids = [r.alumno_id for r in resultados]
    if not alumno_ids:
        return []

    stmt = (
        select(Alumno, User)
        .join(User, Alumno.usuario_id == User.id)
        .where(Alumno.id.in_(alumno_ids))
        .options(selectinload(Alumno.ingenieria))
    )
    result = await db.execute(stmt)
    rows = result.all()

    alumno_map = {}
    for alumno, user in rows:
        alumno_map[alumno.id] = {
            "alumno_id": alumno.id,
            "nombre_completo": f"{user.nombre} {user.apellido_paterno} {user.apellido_materno}",
            "numero_cuenta": alumno.numero_cuenta,
            "numero_folio": alumno.numero_folio,
            "correo": user.correo_personal,
            "ingenieria": alumno.ingenieria.clave if alumno.ingenieria else "",
        }

    consolidated = []
    for r in resultados:
        info = alumno_map.get(r.alumno_id, {})
        consolidated.append({
            **info,
            "puntaje_algebra": r.puntaje_algebra,
            "puntaje_trigonometria": r.puntaje_trigonometria,
            "puntaje_geometria": r.puntaje_geometria,
            "puntaje_calculo": r.puntaje_calculo,
            "promedio_diagnostico": r.promedio_diagnostico,
        })

    return consolidated


def generate_excel_resultados(consolidated: list[dict], periodo: str) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Resultados Diagnóstico"

    headers = [
        "Nombre", "No. Cuenta", "No. Folio", "Correo", "Ingeniería",
        "Álgebra", "Trigonometría", "Geometría", "Cálculo", "Promedio",
    ]
    ws.append(headers)

    for row in consolidated:
        ws.append([
            row.get("nombre_completo", ""),
            row.get("numero_cuenta", ""),
            row.get("numero_folio", ""),
            row.get("correo", ""),
            row.get("ingenieria", ""),
            row.get("puntaje_algebra"),
            row.get("puntaje_trigonometria"),
            row.get("puntaje_geometria"),
            row.get("puntaje_calculo"),
            row.get("promedio_diagnostico"),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    wb.close()
    return buf.getvalue()
