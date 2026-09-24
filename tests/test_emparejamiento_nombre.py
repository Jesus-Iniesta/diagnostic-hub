import io
import asyncio
from unittest.mock import patch

import openpyxl

from app.core.database import async_session
from app.repositories.diagnostico_repository import DiagnosticoRepository
from app.services.normalizacion import normalizar_nombre
from app.services.upload_diagnostico_service import (
    find_candidates,
    find_candidates_legacy,
    procesar_examen_diagnostico,
)
from app.services.upload_webassign_service import parse_webassign_excel

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


DETALLE = {
    "alumno_id": 0,
    "nombre": "X",
    "cuenta": "2221316",
    "correo": "x@x.com",
}


def detalle(nombre, aid, cuenta="2221316", correo="x@x.com"):
    d = dict(DETALLE)
    d["nombre"] = nombre
    d["alumno_id"] = aid
    d["cuenta"] = cuenta
    d["correo"] = correo
    return aid, d


# ── normalizar_nombre ────────────────────────────────────────────
check("nombre 'Abad Hernández, Erik'", normalizar_nombre("Abad Hernández, Erik"), "ABAD ERIK HERNANDEZ")
check("nombre 'ERIK ABAD HERNANDEZ'", normalizar_nombre("ERIK ABAD HERNANDEZ"), "ABAD ERIK HERNANDEZ")
check("nombre 'Silva'", normalizar_nombre("Silva"), "")
check("nombre '1'", normalizar_nombre("1"), "")

# ── find_candidates (nueva) ──────────────────────────────────────
_, d1 = detalle("Juan Andrick Juarez Arzate", 1)
_, d2 = detalle("Maria Lopez Garcia", 2)
_, d3 = detalle("José Pérez López", 3)
detalles = {1: d1, 2: d2, 3: d3}

check("find_candidates 'Silva'", find_candidates("Silva", detalles), [])
check("find_candidates '1'", find_candidates("1", detalles), [])

res = find_candidates("Juarez Arzate, Juan Andrick", detalles)
check(
    "find_candidates exacta única",
    [(c["alumno_id"], c["sugerido"], c["similitud"]) for c in res],
    [(1, True, 100)],
)

_, d4 = detalle("Maria Lopez Garcia", 4)
detalles_dos = {2: d2, 4: d4}
res = find_candidates("Garcia Lopez Maria", detalles_dos)
check(
    "find_candidates 2 exactas",
    sorted((c["alumno_id"], c["sugerido"], c["similitud"]) for c in res),
    [(2, False, 100), (4, False, 100)],
)

res = find_candidates("Jose Perez Lopes", detalles)
check(
    "find_candidates difflib",
    [(c["alumno_id"], c["sugerido"], c["similitud"] >= 80) for c in res],
    [(3, False, True)],
)

# ── find_candidates_legacy (mismo comportamiento previo) ─────────
res = find_candidates_legacy("Juarez", detalles)
check("legacy 'Juarez'", [c["alumno_id"] for c in res], [1])
res = find_candidates_legacy("Lopez", detalles)
check("legacy 'Lopez'", [c["alumno_id"] for c in res], [2, 3])
res = find_candidates_legacy("", detalles)
check("legacy ''", res, [])


# ── WebAssign: exclusión de la fila del profesor ─────────────────
class FakeSheet:
    def __init__(self, rows, name):
        self._rows = rows
        self.name = name

    @property
    def nrows(self):
        return len(self._rows)

    def cell_value(self, i, col):
        row = self._rows[i]
        return row[col] if col < len(row) else ""


class FakeWb:
    def __init__(self, sheet):
        self._sheet = sheet

    def sheet_by_index(self, idx):
        return self._sheet


def _fila(nombre, email):
    return [nombre, email] + [None] * 23  # cols 2..24 para scores


filas = [
    ["encabezado"],
    ["Albiter Bernal, Vladimir Angel"],  # fila 1 => profesor
    ["x"],
    ["x"],
    ["x"],
    ["x"],
    ["x"],
    ["x"],
    ["x"],
    _fila("Alumno Uno", "a1@x.com"),              # 9 -> se mantiene
    _fila("Albiter Bernal, Vladimir Angel", "p@x.com"),  # 10 -> excluida
    ["Totals"],
    ["Fullname"],
    _fila("AlbiterBernalVladimirAngel", "p2@x.com"),  # 13 -> excluida por hoja
]
fake_wb = FakeWb(FakeSheet(filas, "AlbiterBernalVladimirAngel"))

with patch("xlrd.open_workbook", return_value=fake_wb):
    rows_data, _ = parse_webassign_excel(b"", "ICO")

check("webassign: filas totales", len(rows_data), 1)
check("webassign: nombre mantenido", [r["nombre_original"] for r in rows_data], ["Alumno Uno"])
check("webassign: correo mantenido", [r["email"] for r in rows_data], ["a1@x.com"])


# ── Diagnóstico: integración (solo lectura de BD, upsert stubeado) ─
def _build_xlsx(rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Timestamp", "Email", "Score", "Name", "Cuenta", "Folio", "Hora"] + [""] * 20)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def diagnostico_test():
    header_blank = [""] * 20
    xlsx = _build_xlsx([
        ["", "", "", "Demo, Alumno Integrativa", "", "", ""] + header_blank,      # sin id, nombre exacto
        ["", "alumno@integrativa.test", "", "Demo, Alumno Integrativa", "", "", ""] + header_blank,  # con email
    ])

    upserted = []

    async def fake_upsert(self, alumno_id, periodo, respuestas_json, materia, puntaje):
        upserted.append((alumno_id, materia, puntaje))

    async with async_session() as db:
        with patch.object(DiagnosticoRepository, "upsert_resultado", new=fake_upsert):
            resultado = await procesar_examen_diagnostico(
                db, xlsx, "algebra", "2026B-E"
            )

    check("diag: encontrados (por email)", len(resultado["resultados"]), 1)
    check("diag: upsert hecho 1 vez", len(upserted), 1)
    no_enc = resultado["no_encontrados_detalle"]
    check("diag: 1 en no_encontrados", len(no_enc), 1)
    check("diag: sin asignación por nombre", no_enc[0]["candidatos"][0]["sugerido"], True)
    check(
        "diag: motivo confirmar",
        no_enc[0]["motivo"],
        "Coincidencia exacta de nombre: confirmar",
    )


asyncio.run(diagnostico_test())

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTODAS LAS PRUEBAS PASARON")