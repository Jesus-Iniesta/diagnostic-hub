"""Genera los archivos de prueba de tests/test_excel_formatos.py.

Cada subida tiene el mismo contenido en .xlsx (openpyxl) y en .xls (xlwt), para
comprobar que las dos versiones se procesan igual. Solo hace falta correrlo si
cambian los datos; necesita xlwt, que no está en requirements.txt:

    pip install --target <carpeta> xlwt
    PYTHONPATH=<carpeta> python -m tests.fixtures.excel.generar
"""

from datetime import datetime
from pathlib import Path

import openpyxl
import xlwt

CARPETA = Path(__file__).parent
FECHA = datetime(2024, 8, 10, 9, 30)  # dentro del periodo 2024B

CORREO_DEMO = "alumno@integrativa.test"  # alumno de los seeds
CUENTA_DEMO = 1724300


def _padron() -> tuple[str, list[list]]:
    encabezados = [f"col{i}" for i in range(30)]
    fila = [None] * 30
    fila[6] = "Ingeniería en Computación (ICO)"
    fila[7] = "2024B"
    fila[8] = "zz.prueba.excel@gmail.com"
    fila[9] = 9.1
    fila[10] = 88.5
    fila[11] = 15
    fila[12] = 202499901
    fila[13] = 2499901
    fila[15] = "Sí"
    fila[16] = "No"
    fila[17] = "PRUEBA"
    fila[18] = "EXCEL"
    fila[19] = "ZETA"
    fila[26] = "zz.prueba.excel@alumno.uaemex.mx"
    sin_correo = list(fila)
    sin_correo[8] = None
    sin_correo[12], sin_correo[13] = 202499902, 2499902
    return "Hoja1", [encabezados, fila, sin_correo]


def _respuestas(codigos: list[str]) -> list[str]:
    return ["a" if i % 2 else "b" for i, _ in enumerate(codigos)]


def _cuestionario() -> tuple[str, list[list]]:
    codigos = [f"{letra}{n}" for letra in "ATGC" for n in range(1, 11)]
    encabezados = [
        "Marca temporal", "Dirección de correo electrónico", "Puntuación",
        "Folio", "Número de cuenta", "Usuario",
    ] + [f"Pregunta ({c})" for c in codigos]
    demo = [FECHA, CORREO_DEMO, "20 / 40", None, CUENTA_DEMO, None] + _respuestas(codigos)
    nuevo = [FECHA, "zz.nuevo.cuestionario@gmail.com", "5 / 40", 202499903, None, "ICO_118"] + [
        "c" for _ in codigos
    ]
    return "Respuestas", [encabezados, demo, nuevo]


def _examen_final() -> tuple[str, list[list]]:
    codigos = [f"FA{i}" for i in range(1, 21)]
    encabezados = ["Timestamp", "Email", "Score", "Name", "Cuenta", "Folio", "Hora"] + codigos
    demo = [FECHA, CORREO_DEMO, "12 / 20", "Demo, Alumno Integrativa", CUENTA_DEMO, None, None]
    demo += _respuestas(codigos)
    solo_nombre = [FECHA, None, "3 / 20", "Demo, Alumno Integrativa", None, None, None]
    solo_nombre += ["d" for _ in codigos]
    return "Respuestas", [encabezados, demo, solo_nombre]


def _webassign() -> tuple[str, list[list]]:
    filas: list[list] = [["Reporte de calificaciones"], ["Albiter Bernal, Vladimir Angel"]]
    filas += [["x"] for _ in range(7)]  # filas 2..8: encabezados del reporte
    demo = ["Demo, Alumno", CORREO_DEMO] + [None] * 5
    demo += [10, 20, 15.5, None, 5, 25] + [30, 40, 20, 10, 30, 120] + [20, 30, 25, 10, 30, 40]
    sin_correo = ["Mora Rey, Dario", "zz.nadie.webassign@gmail.com"] + [None] * 5 + [1] * 18
    profesor = ["Albiter Bernal, Vladimir Angel", "prof@x.com"] + [None] * 23
    filas += [demo, sin_correo, profesor, ["Totals"]]
    return "AlbiterBernalVladimirAngel", filas


def _lista_grupo() -> tuple[str, list[list]]:
    encabezados = [
        "CUENTA", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRE", "PLAN DE ESTUDIOS",
        "ORGANISMO", "CORREO INSTITUCIONAL", "ESTADO DEL ALUMNO",
    ]
    demo = [CUENTA_DEMO, "DEMO", "INTEGRATIVA", "ALUMNO", "ICO-F19", "FI", None, "INSCRITO"]
    nadie = [2499904, "NADIE", "NO", "EXISTE", "ICO-F19", "FI", "zz.nadie@alumno.uaemex.mx", "INSCRITO"]
    incompleta = [2499905, "", "SOLO", "NOMBRE", 0, "FI", 0, "INSCRITO"]
    return "LINC05", [encabezados, demo, nadie, incompleta]


ARCHIVOS = {
    "padron": _padron,
    "cuestionario": _cuestionario,
    "examen_final": _examen_final,
    "webassign": _webassign,
    "lista_grupo": _lista_grupo,
}


def _guardar_xlsx(ruta: Path, hoja: str, filas: list[list]) -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = hoja
    for fila in filas:
        ws.append(fila)
    wb.save(ruta)


def _guardar_xls(ruta: Path, hoja: str, filas: list[list]) -> None:
    wb = xlwt.Workbook()
    ws = wb.add_sheet(hoja)
    estilo_fecha = xlwt.easyxf(num_format_str="YYYY-MM-DD HH:MM:SS")
    for i, fila in enumerate(filas):
        for j, valor in enumerate(fila):
            if valor is None:
                continue
            if isinstance(valor, datetime):
                ws.write(i, j, valor, estilo_fecha)
            else:
                ws.write(i, j, valor)
    wb.save(str(ruta))


if __name__ == "__main__":
    for nombre, datos in ARCHIVOS.items():
        hoja, filas = datos()
        _guardar_xlsx(CARPETA / f"{nombre}.xlsx", hoja, filas)
        _guardar_xls(CARPETA / f"{nombre}.xls", hoja, filas)
        print("generado", nombre)
