"""Índice FI: tareas y exámenes de WebAssign con valor propio, CREANI y carta sin escala.

python -m tests.test_indice_fi
"""

import openpyxl

from app.services.indice_fi_service import (
    CATEGORIAS_DEFAULT,
    VALORES_DEFAULT,
    _normalizar,
    calcular_indice,
    validar_config,
)
from app.services.pdf_service import generar_pdf_resultado
from app.services.reportes_service import INDICE_COL_INICIO, INDICE_HEADERS, _write_indice_ws

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


def config(**valores) -> dict:
    return {
        "valores": {**VALORES_DEFAULT, **valores},
        "categorias": [dict(c) for c in CATEGORIAS_DEFAULT],
        "usar_asistencia": False,
    }


# Tareas perfectas y exámenes de WebAssign en 0, para distinguirlos.
SOLO_TAREAS = {f"{m}_trabajo": 10.0 for m in ("algebra", "trigonometria", "geometria")}
COMPLETO = {
    **SOLO_TAREAS,
    "algebra_examen": 8.0, "trigonometria_examen": 6.0, "geometria_examen": 4.0,
    **{f"aciertos_c{n}_{m}": 5 for n in (1, 2) for m in ("algebra", "trigonometria", "geometria", "calculo")},
    **{f"puntaje_{m}": 7.5 for m in ("algebra", "trigonometria", "geometria", "calculo")},
}

# --- Configuraciones guardadas antes de separar WebAssign ---
vieja = _normalizar({"valores": {"asistencia": 1, "diagnostico": 3, "webassign": 3, "final": 4}, "categorias": []})
check("config vieja: WebAssign a la mitad", (vieja["valores"]["webassign_tareas"], vieja["valores"]["webassign_examen"]), (1.5, 1.5))
check("config vieja: sin la llave anterior", "webassign" in vieja["valores"], False)
nueva = _normalizar({"valores": {"webassign_tareas": 2, "webassign_examen": 1}, "categorias": []})
check("config nueva: respeta sus valores", (nueva["valores"]["webassign_tareas"], nueva["valores"]["webassign_examen"]), (2.0, 1.0))
check("config sin valores: los de por defecto", _normalizar({"categorias": []})["valores"], VALORES_DEFAULT)

# --- Cálculo ---
r = calcular_indice(SOLO_TAREAS, config())
check("tareas perfectas valen su componente", (r["webassign_tareas"]["total"], r["webassign_examen"]["total"]), (1.5, 0.0))
r = calcular_indice(SOLO_TAREAS, config(webassign_tareas=2.0, webassign_examen=1.0))
check("ponderar tareas sin tocar exámenes", (r["webassign_tareas"]["total"], r["indice"], r["maximo"]), (2.0, 2.0, 10.0))
r = calcular_indice({"algebra_examen": 10.0}, config(webassign_tareas=2.0, webassign_examen=1.0))
check("cada examen pesa un tercio de su componente", round(r["webassign_examen"]["materias"]["algebra"], 4), 0.3333)

# Con los valores por defecto el índice es el de antes: WebAssign 3 en 6 partes iguales.
datos_wa = (10 + 10 + 10 + 8 + 6 + 4) / 10 * (3 / 6)
esperado = round(5 * 8 / 10 * (3 / 8) + datos_wa + 7.5 * 4 / 10 * (4 / 4), 1)
r = calcular_indice(COMPLETO, config())
check("por defecto: el índice no cambia", r["indice"], esperado)
check("por defecto: máximo 10", r["maximo"], 10.0)

# --- Validación: la categoría más alta termina en la suma de los cinco componentes ---
generales, por_categoria = validar_config(config()["valores"], config()["categorias"], False)
check("categorías por defecto válidas", (generales, por_categoria), ([], {}))
categorias = [dict(c) for c in CATEGORIAS_DEFAULT]
categorias[0]["maximo"] = 11.0
_, por_categoria = validar_config(config()["valores"], categorias, False)
check("categoría arriba del máximo: rechazada", por_categoria.get(0), [
    "El valor máximo no puede ser mayor a 10.",
    "La categoría más alta debe terminar en 10.0 (el máximo del índice).",
])

# --- CREANI ---
wb = openpyxl.Workbook()
ws = wb.active
_write_indice_ws(ws, [{"indice": calcular_indice(COMPLETO, config(webassign_tareas=2.0, webassign_examen=1.0))}], config(webassign_tareas=2.0, webassign_examen=1.0))
col = {n: INDICE_COL_INICIO + i for i, n in enumerate(INDICE_HEADERS)}
check("CREANI: encabezado de tareas", ws.cell(2, col["Tareas WA Álgebra"]).value, "Tareas WebAssign (sobre 20%)")
check("CREANI: encabezado de exámenes", ws.cell(2, col["Examen WA Álgebra"]).value, "Exámenes WebAssign (sobre 10%)")
check("CREANI: tareas de álgebra", round(ws.cell(4, col["Tareas WA Álgebra"]).value, 4), 0.6667)
formula = ws.cell(4, col["Índice FI UAEMex"]).value
letra = lambda n: openpyxl.utils.get_column_letter(col[n])
check("CREANI: el índice suma ambos totales",
      f"{letra('Tareas WA total')}4" in formula and f"{letra('Examen WA total')}4" in formula, True)

# --- Tope de categorías: 10 y el máximo del índice, lo que sea menor ---
valores_8 = {**VALORES_DEFAULT, "final": 2.0}  # índice máximo 8
_, por_categoria = validar_config(valores_8, [{"nombre": "A", "minimo": 0, "maximo": 9}], False)
check("tope: categoría por encima del máximo del índice",
      "El valor máximo no puede ser mayor a 8." in por_categoria.get(0, []), True)
_, por_categoria = validar_config(VALORES_DEFAULT, [{"nombre": "A", "minimo": 0, "maximo": 10}], False)
check("tope: 10 es válido con índice de 10", por_categoria, {})

# --- Carta sin escala: solo el número del índice ---
indice = calcular_indice(COMPLETO, config())
check("carta: se genera", generar_pdf_resultado("Ana", "1", "ICO", "2031B", None, None, None, indice)[:4], b"%PDF")

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
