import logging
import unicodedata

import xlrd
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.webassign_repository import WebAssignRepository
from app.services.normalizacion import normalizar_nombre
from app.services.upload_diagnostico_service import (
    find_alumno,
    find_candidates_legacy,
    load_all_alumnos,
)

logger = logging.getLogger(__name__)

MATERIA_MAX = {
    "algebra": {"trabajo": 102.0, "examen": 29.0},
    "trigonometria": {"trabajo": 196.0, "examen": 150.0},
    "geometria": {"trabajo": 166.0, "examen": 51.0},
}

EXERCISE_COLS = {
    "algebra": {"trabajo": list(range(7, 12)), "examen": 12},
    "trigonometria": {"trabajo": list(range(13, 18)), "examen": 18},
    "geometria": {"trabajo": list(range(19, 24)), "examen": 24},
}

CARRERAS = ["ICI", "ICO", "IEL", "IIA", "IME", "ISES"]


def clean_email(raw: str | None) -> str | None:
    if not raw:
        return None
    email = raw.strip().lower()
    if email.count("@") > 1:
        email = email.rsplit("@", 1)[0]
    if email.endswith(".con"):
        email = email[:-4] + ".com"
    return email if email.count("@") == 1 else None


def clean_score(raw) -> float | None:
    if raw in (None, "", "ND", "NS", "N/A", "-", 0):
        return None
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw or raw in ("ND", "NS", "N/A", "-"):
            return None
        try:
            raw = float(raw)
        except ValueError:
            return None
    if isinstance(raw, (int, float)):
        return float(raw)
    return None


def calculate_materia_score(
    raw_scores: list[float | None],
    exam_raw: float | None,
    materia: str,
) -> tuple[float | None, float | None]:
    maxes = MATERIA_MAX[materia]

    valid_exercises = [s for s in raw_scores if s is not None]
    if valid_exercises:
        total_exercise = sum(valid_exercises)
        trabajo = round(total_exercise / maxes["trabajo"] * 10, 2)
        trabajo = min(trabajo, 10.0)
    else:
        trabajo = None

    if exam_raw is not None:
        examen = round(exam_raw / maxes["examen"] * 10, 2)
        examen = min(examen, 10.0)
    else:
        examen = None

    return trabajo, examen


def _es_fila_profesor(nombre: str, nombre_profesor: str, nombre_hoja: str) -> bool:
    if not nombre:
        return False
    if normalizar_nombre(nombre) and normalizar_nombre(nombre) == normalizar_nombre(nombre_profesor):
        return True
    normalize = unicodedata.normalize("NFKD", nombre)
    limpio = "".join(
        c for c in normalize
        if not unicodedata.combining(c) and not c.isspace() and c not in ",."
    ).upper()
    return bool(nombre_hoja) and limpio == nombre_hoja.upper()


def parse_webassign_excel(
    file_bytes: bytes, carrera: str
) -> tuple[list[dict], dict]:
    wb = xlrd.open_workbook(file_contents=file_bytes)
    ws = wb.sheet_by_index(0)

    nombre_profesor = str(ws.cell_value(1, 0)) if ws.nrows > 1 else ""
    nombre_hoja = ws.name

    rows_data: list[dict] = []

    for i in range(9, ws.nrows):
        name = ws.cell_value(i, 0)
        if not name or name in ("", "Totals", "Fullname"):
            continue
        if _es_fila_profesor(str(name), nombre_profesor, nombre_hoja):
            continue

        raw_email = ws.cell_value(i, 1)
        email = clean_email(raw_email)

        materia_scores: dict[str, dict] = {}
        for materia, cols in EXERCISE_COLS.items():
            exercise_scores = []
            for col in cols["trabajo"]:
                val = clean_score(ws.cell_value(i, col))
                exercise_scores.append(val)
            exam_val = clean_score(ws.cell_value(i, cols["examen"]))
            materia_scores[materia] = {
                "trabajo_raw": exercise_scores,
                "examen_raw": exam_val,
            }

        rows_data.append({
            "nombre_original": name.strip(),
            "email": email,
            "materias": materia_scores,
            "indice": i,
        })

    return rows_data, {}


def parse_webassign_name(raw_name: str) -> tuple[str, str]:
    """Parse 'Apellido, Nombre' to 'Nombre Apellido'."""
    name = raw_name.strip()
    if "," in name:
        parts = name.split(",", 1)
        apellido = parts[0].strip()
        nombre = parts[1].strip()
        return f"{nombre} {apellido}"
    return name


async def procesar_webassign(
    db: AsyncSession,
    file_bytes: bytes,
    carrera: str,
    periodo: str,
) -> dict:
    if carrera not in CARRERAS:
        raise ValueError(f"Carrera no válida: {carrera}")

    email_map, cuenta_map, folio_map, alumno_details = await load_all_alumnos(db)

    rows_data, _ = parse_webassign_excel(file_bytes, carrera)

    repo = WebAssignRepository(db)
    resultados = []
    no_encontrados = []

    for row in rows_data:
        email = row["email"]
        nombre_original = row["nombre_original"]
        nombre_normalizado = parse_webassign_name(nombre_original)

        alumno_id = find_alumno(
            email, None, None, email_map, cuenta_map, folio_map
        )

        if alumno_id is None:
            candidates = find_candidates_legacy(nombre_normalizado, alumno_details)
            if len(candidates) == 1:
                alumno_id = candidates[0]["alumno_id"]
            else:
                no_encontrados.append({
                    "nombre_original": nombre_original,
                    "correo": email,
                    "motivo": "No se encontró alumno con email",
                    "candidatos": candidates,
                    "indice": row["indice"],
                })
                continue

        detail = alumno_details[alumno_id]
        scores = {}
        for materia in ("algebra", "trigonometria", "geometria"):
            ms = row["materias"][materia]
            trabajo, examen = calculate_materia_score(
                ms["trabajo_raw"], ms["examen_raw"], materia
            )
            scores[f"{materia}_trabajo"] = trabajo
            scores[f"{materia}_examen"] = examen

        promedio_vals = [
            v for v in scores.values() if v is not None
        ]
        promedio = round(sum(promedio_vals) / len(promedio_vals), 2) if promedio_vals else None

        await repo.upsert_resultado(
            alumno_id=alumno_id,
            periodo=periodo,
            carrera=carrera,
            algebra_trabajo=scores["algebra_trabajo"],
            algebra_examen=scores["algebra_examen"],
            trigonometria_trabajo=scores["trigonometria_trabajo"],
            trigonometria_examen=scores["trigonometria_examen"],
            geometria_trabajo=scores["geometria_trabajo"],
            geometria_examen=scores["geometria_examen"],
        )

        resultados.append({
            "alumno_id": alumno_id,
            "nombre_completo": detail["nombre"],
            "numero_cuenta": detail.get("cuenta"),
            "correo": detail.get("correo"),
            "ingenieria": detail.get("ingenieria"),
            "carrera": carrera,
            **scores,
            "promedio": promedio,
        })

    return {
        "carrera": carrera,
        "periodo": periodo,
        "total_filas": len(rows_data),
        "encontrados": len(resultados),
        "no_encontrados": len(no_encontrados),
        "resultados": resultados,
        "no_encontrados_detalle": no_encontrados,
    }
