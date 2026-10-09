"""Las subidas leen igual .xlsx y .xls (app/services/excel_utils.py).

python -m tests.test_excel_formatos

Usa los archivos de tests/fixtures/excel (mismo contenido en los dos formatos).
La segunda parte corre cada subida contra la base configurada dentro de una
transacción con rollback: no se guarda nada.
"""

import asyncio
import dataclasses
import io
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select

from app.core.database import async_session
from app.models.user import User
from app.services.excel_utils import (
    ArchivoExcelError,
    como_xlrd,
    formato_excel,
    leer_filas,
    leer_hoja,
)

FIXTURES = Path(__file__).parent / "fixtures" / "excel"
FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


def archivo(nombre: str, ext: str) -> bytes:
    return (FIXTURES / f"{nombre}.{ext}").read_bytes()


# ── excel_utils ──────────────────────────────────────────────────
for nombre in ("padron", "cuestionario", "examen_final", "webassign", "lista_grupo"):
    xlsx, xls = archivo(nombre, "xlsx"), archivo(nombre, "xls")
    check(f"{nombre}: formato xlsx", formato_excel(xlsx), "xlsx")
    check(f"{nombre}: formato xls", formato_excel(xls), "xls")
    a, b = leer_hoja(xlsx), leer_hoja(xls)
    check(f"{nombre}: mismo nombre de hoja", a.nombre, b.nombre)
    # xlwt no guarda celdas vacías al final de la fila: se comparan sin ellas.
    recortar = lambda filas: [list(f[: max((i + 1 for i, v in enumerate(f) if v is not None), default=0)]) for f in filas]  # noqa: E731
    check(f"{nombre}: mismas filas en xls y xlsx", recortar(b.filas), recortar(a.filas))

# Tipos: vacías None, enteros int, decimales float, fechas datetime.
for ext in ("xlsx", "xls"):
    fila = leer_filas(archivo("cuestionario", ext))[1]
    check(f"{ext}: fecha", fila[0], datetime(2024, 8, 10, 9, 30))
    check(f"{ext}: celda vacía", fila[3], None)
    check(f"{ext}: entero", (fila[4], type(fila[4])), (1724300, int))
    fila = leer_filas(archivo("padron", ext))[1]
    check(f"{ext}: decimal", (fila[9], type(fila[9])), (9.1, float))

check("como_xlrd vacía", como_xlrd(None), "")
check("como_xlrd entero", como_xlrd(5), 5.0)
check("como_xlrd booleano", como_xlrd(True), 1)
check("como_xlrd texto", como_xlrd("x"), "x")

for label, contenido in (("texto", b"no soy excel"), ("vacío", b""), ("zip dañado", b"PK\x03\x04basura")):
    try:
        leer_filas(contenido)
        check(f"archivo inválido ({label})", "sin error", "ArchivoExcelError")
    except ArchivoExcelError:
        check(f"archivo inválido ({label})", "ArchivoExcelError", "ArchivoExcelError")


# ── Cada subida procesa igual los dos formatos ───────────────────
def sin_ids(obj):
    """Quita los ids que genera la base (cambian entre corridas)."""
    if dataclasses.is_dataclass(obj):
        obj = dataclasses.asdict(obj)
    if isinstance(obj, dict):
        return {k: sin_ids(v) for k, v in obj.items() if "id" not in k.lower().split("_")}
    if isinstance(obj, (list, tuple)):
        return [sin_ids(v) for v in obj]
    return obj


async def en_rollback(fn):
    async with async_session() as db:
        db.commit = db.flush  # nada se guarda
        try:
            return await fn(db)
        finally:
            await db.rollback()


async def padron(db, data, ext):
    from app.services.upload_alumnos_service import procesar_excel
    return await procesar_excel(db, data)


async def cuestionario(db, data, ext):
    from app.services.upload_cuestionario_service import procesar_cuestionario
    return await procesar_cuestionario(db, data, 1, "2024B")


async def examen_final(db, data, ext):
    from app.services.upload_diagnostico_service import procesar_examen_diagnostico
    return await procesar_examen_diagnostico(db, data, "algebra", "2024B")


async def webassign(db, data, ext):
    from app.services.upload_webassign_service import procesar_webassign
    return await procesar_webassign(db, data, "ICO", "2024B")


async def lista_grupo(db, data, ext):
    from app.api.v1 import profesor_grupos as pg
    nombre = f"LINC05-CALCULO III-02 1.{ext}"
    profesor = await db.scalar(select(User).where(User.id == 2))
    return await pg.cargar_alumnos_excel(1, UploadFile(io.BytesIO(data), filename=nombre), profesor, db)


async def subidas():
    resultados = {}
    for fn in (padron, cuestionario, examen_final, webassign, lista_grupo):
        for ext in ("xlsx", "xls"):
            data = archivo(fn.__name__, ext)
            resultados[fn.__name__, ext] = sin_ids(
                await en_rollback(lambda db: fn(db, data, ext))
            )
        check(
            f"{fn.__name__}: mismo resultado con xls y xlsx",
            resultados[fn.__name__, "xls"] == resultados[fn.__name__, "xlsx"],
            True,
        )
    return {k[0]: v for k, v in resultados.items() if k[1] == "xls"}


r = asyncio.run(subidas(), loop_factory=asyncio.SelectorEventLoop)

check("padrón: 1 alumno nuevo, 1 fila con error", (r["padron"]["exitosos"], r["padron"]["errores"]), (1, 1))
check("cuestionario: 2 filas encontradas", r["cuestionario"]["encontrados"], 2)
check("examen final: 1 por correo, 1 solo por nombre", (r["examen_final"]["encontrados"], r["examen_final"]["no_encontrados"]), (1, 1))
check("webassign: 1 encontrado, 1 sin correo registrado", (r["webassign"]["encontrados"], r["webassign"]["no_encontrados"]), (1, 1))
check("webassign: fila del profesor excluida", r["webassign"]["total_filas"], 2)
check("lista de grupo: 2 alumnos leídos, 1 fila incompleta", (r["lista_grupo"]["total_en_archivo"], r["lista_grupo"]["errores_archivo"]), (2, 1))
check("lista de grupo: cuenta inexistente reportada", [n["numero_cuenta"] for n in r["lista_grupo"]["no_encontrados"]], ["2499904"])

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
