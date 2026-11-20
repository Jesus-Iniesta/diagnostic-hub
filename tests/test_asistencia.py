"""Asistencia: el máximo es 100%, sin fila es 0, solo se une por nombre único.

python -m tests.test_asistencia
"""

import io

import openpyxl

from app.services.excel_utils import ArchivoExcelError
from app.services.indice_fi_service import (
    CATEGORIAS_DEFAULT,
    VALORES_DEFAULT,
    calcular_indice,
)
from app.services.upload_asistencia_service import (
    emparejar_asistencia,
    leer_asistencia,
    plantilla_asistencia,
)

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


def excel(filas) -> bytes:
    wb = openpyxl.Workbook()
    for fila in filas:
        wb.active.append(fila)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def config(usar: bool) -> dict:
    return {"valores": dict(VALORES_DEFAULT), "categorias": [dict(c) for c in CATEGORIAS_DEFAULT], "usar_asistencia": usar}


def alumnos(*nombres):
    return {i: {"nombre": n, "partes": ("", "", "")} for i, n in enumerate(nombres, start=1)}


# --- Plantilla y lectura ---
check("plantilla: columnas exactas", [c.value for c in openpyxl.load_workbook(io.BytesIO(plantilla_asistencia())).active[1]], ["Nombre", "Asistencias"])
filas = leer_asistencia(excel([["nombre", "ASISTENCIAS"], ["Ana Pérez López", 20], [None, 5], ["Luis Gómez Ruiz", 10]]))
check("lectura: ignora filas sin nombre", [(f["indice"], f["nombre"], f["asistencias"]) for f in filas], [(0, "Ana Pérez López", 20), (2, "Luis Gómez Ruiz", 10)])
try:
    leer_asistencia(excel([["Nombre", "Faltas"], ["Ana Pérez", 1]]))
    check("lectura: falta la columna Asistencias", "sin error", "ArchivoExcelError")
except ArchivoExcelError:
    check("lectura: falta la columna Asistencias", "ArchivoExcelError", "ArchivoExcelError")
try:
    leer_asistencia(excel([["Nombre", "Asistencias"], ["Ana Pérez", "muchas"]]))
    check("lectura: Asistencias no numérico", "sin error", "ArchivoExcelError")
except ArchivoExcelError:
    check("lectura: Asistencias no numérico", "ArchivoExcelError", "ArchivoExcelError")

# --- Porcentajes y emparejamiento ---
candidatos = alumnos("Ana Pérez López", "Luis Gómez Ruiz", "Marta Díaz Soto", "Pedro Ruiz Vega", "Pedro Ruiz Vega")
filas = [
    {"indice": 0, "nombre": "PÉREZ LÓPEZ, ANA", "asistencias": 20},
    {"indice": 1, "nombre": "Luis Gómez Ruiz", "asistencias": 10},
    {"indice": 2, "nombre": "Pedro Ruiz Vega", "asistencias": 15},  # homónimo
    {"indice": 3, "nombre": "Marta Díaz", "asistencias": 5},  # incompleto
]
encontrados, no_registrados = emparejar_asistencia(filas, candidatos)
check("el máximo del archivo es 100%", encontrados[1], 100.0)
check("regla de 3 contra el máximo", encontrados[2], 50.0)
check("alumno sin fila: no tiene resultado", 3 in encontrados, False)
check("homónimo no se une", (4 in encontrados, 5 in encontrados), (False, False))
check("homónimo e incompleto van a no registrados", [f["indice"] for f in no_registrados], [2, 3])
check("el máximo cuenta aunque el alumno no esté registrado", emparejar_asistencia([{"indice": 0, "nombre": "Pedro Ruiz Vega", "asistencias": 40}, *filas[:2]], candidatos)[0], {1: 50.0, 2: 25.0})
check("nadie asistió: 0%", emparejar_asistencia([{"indice": 0, "nombre": "Ana Pérez López", "asistencias": 0}], candidatos)[0], {1: 0.0})

# --- Índice FI ---
# Con asistencia activa vale 1.0 sobre el índice; sin fila (None) suma 0.
base = calcular_indice({}, config(True))
check("100% suma el valor completo", calcular_indice({"asistencia": 100.0}, config(True))["indice"] - base["indice"], 1.0)
check("50% suma la mitad", calcular_indice({"asistencia": 50.0}, config(True))["asistencia"]["total"], 0.5)
check("alumno sin fila suma 0", calcular_indice({"asistencia": None}, config(True))["asistencia"]["total"], 0.0)
check("componente apagado no suma", calcular_indice({"asistencia": 100.0}, config(False))["asistencia"]["total"], 0.0)
check("componente apagado no cuenta para el máximo", calcular_indice({"asistencia": 100.0}, config(False))["maximo"], 10.0)
check("máximo con asistencia suma su valor", calcular_indice({}, config(True))["maximo"], 11.0)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
