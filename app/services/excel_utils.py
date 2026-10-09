"""Lectura de hojas de Excel (.xlsx y .xls) con un mismo formato de valores.

El formato se detecta por el contenido del archivo, no por su nombre:
- .xlsx es un ZIP (empieza con "PK\\x03\\x04") y se lee con openpyxl.
- .xls es un documento OLE2 (empieza con D0 CF 11 E0) y se lee con xlrd.

Las filas salen siempre como las da openpyxl, para que el resto del código no
tenga que saber de qué formato vino:
- celda vacía -> None
- número entero -> int (2421128, no 2421128.0); con decimales -> float
- fecha -> datetime
- texto -> str, booleano -> bool, error de fórmula -> texto del error ("#N/A")

Las subidas que se escribieron para xlrd pueden usar `como_xlrd` para seguir
viendo los valores como antes ("" en vacías y números como float).
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import openpyxl
import xlrd

FIRMA_XLSX = b"PK\x03\x04"
FIRMA_XLS = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


class ArchivoExcelError(ValueError):
    """El archivo no es un Excel que se pueda leer."""


@dataclass
class HojaExcel:
    nombre: str
    filas: list[list]


def formato_excel(file_bytes: bytes) -> str | None:
    """'xlsx', 'xls' o None si el contenido no es de ninguno de los dos."""
    if file_bytes.startswith(FIRMA_XLSX):
        return "xlsx"
    if file_bytes.startswith(FIRMA_XLS):
        return "xls"
    return None


def leer_hoja(file_bytes: bytes, indice: int = 0) -> HojaExcel:
    """Lee la hoja `indice` (la primera por defecto) de un .xlsx o .xls."""
    formato = formato_excel(file_bytes)
    try:
        if formato == "xlsx":
            return _leer_xlsx(file_bytes, indice)
        if formato == "xls":
            return _leer_xls(file_bytes, indice)
    except ArchivoExcelError:
        raise
    except Exception as exc:  # archivo dañado o con un formato que no se reconoce
        raise ArchivoExcelError(f"No se pudo leer el archivo de Excel: {exc}") from exc
    raise ArchivoExcelError("El archivo no es un Excel válido (.xlsx o .xls)")


def leer_filas(file_bytes: bytes, indice: int = 0) -> list[list]:
    """Filas de la hoja `indice` como listas de valores (ver leer_hoja)."""
    return leer_hoja(file_bytes, indice).filas


def como_xlrd(valor: object) -> object:
    """Convierte un valor de leer_hoja a como lo daba xlrd: "" en vacías,
    números como float y booleanos como 1/0."""
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return int(valor)
    if isinstance(valor, int):
        return float(valor)
    return valor


def _leer_xlsx(file_bytes: bytes, indice: int) -> HojaExcel:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    try:
        if indice >= len(wb.sheetnames):
            raise ArchivoExcelError("El archivo no tiene hojas")
        nombre = wb.sheetnames[indice]
        filas = [list(f) for f in wb[nombre].iter_rows(min_row=1, values_only=True)]
    finally:
        wb.close()
    return HojaExcel(nombre=nombre, filas=filas)


def _leer_xls(file_bytes: bytes, indice: int) -> HojaExcel:
    wb = xlrd.open_workbook(file_contents=file_bytes)
    if indice >= wb.nsheets:
        raise ArchivoExcelError("El archivo no tiene hojas")
    hoja = wb.sheet_by_index(indice)
    filas = [
        [_valor_xls(celda, wb.datemode) for celda in hoja.row(i)]
        for i in range(hoja.nrows)
    ]
    return HojaExcel(nombre=hoja.name, filas=filas)


def _valor_xls(celda: xlrd.sheet.Cell, datemode: int) -> object:
    tipo, valor = celda.ctype, celda.value
    if tipo in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
        return None
    if tipo == xlrd.XL_CELL_NUMBER:
        return int(valor) if float(valor).is_integer() else valor
    if tipo == xlrd.XL_CELL_DATE:
        try:
            return xlrd.xldate.xldate_as_datetime(valor, datemode)
        except (xlrd.xldate.XLDateError, OverflowError):
            return valor
    if tipo == xlrd.XL_CELL_BOOLEAN:
        return bool(valor)
    if tipo == xlrd.XL_CELL_ERROR:
        return xlrd.error_text_from_code.get(valor, "#ERROR")
    return valor

