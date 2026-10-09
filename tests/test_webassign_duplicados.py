"""Pruebas de WebAssign: alumno con dos filas y emparejamiento solo por correo.

No necesitan base de datos: python -m tests.test_webassign_duplicados
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import patch

from app.repositories.webassign_repository import WebAssignRepository
from app.services import upload_webassign_service as svc
from app.services.upload_webassign_service import (
    ORIGEN_CARGA_ANTERIOR,
    ORIGEN_ESTA_CARGA,
    ORIGEN_OTRA_CARRERA,
    calcular_avance,
    debe_reemplazar,
)

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


# ── calcular_avance ──────────────────────────────────────────────
check("avance vacío", calcular_avance({}), 0)
check(
    "avance con None",
    calcular_avance({"algebra_trabajo": 5.0, "algebra_examen": None, "geometria_examen": 2.5}),
    7.5,
)

# ── debe_reemplazar ──────────────────────────────────────────────
check("esta carga: más avance", debe_reemplazar(8, 5, ORIGEN_ESTA_CARGA), True)
check("esta carga: menos avance", debe_reemplazar(3, 5, ORIGEN_ESTA_CARGA), False)
check("esta carga: empate se queda la primera", debe_reemplazar(5, 5, ORIGEN_ESTA_CARGA), False)
check("esta carga: fila vacía", debe_reemplazar(0, 5, ORIGEN_ESTA_CARGA), False)
check("otra carrera: más avance", debe_reemplazar(8, 5, ORIGEN_OTRA_CARRERA), True)
check("otra carrera: fila vacía", debe_reemplazar(0, 5, ORIGEN_OTRA_CARRERA), False)
check("carga anterior: corrige a la baja", debe_reemplazar(3, 5, ORIGEN_CARGA_ANTERIOR), True)
check("carga anterior: fila vacía", debe_reemplazar(0, 5, ORIGEN_CARGA_ANTERIOR), False)
check("carga anterior: ambas vacías", debe_reemplazar(0, 0, ORIGEN_CARGA_ANTERIOR), True)


# ── procesar_webassign con repositorio en memoria ────────────────
def fila(indice, email, nombre, algebra_examen=None):
    vacio = {"trabajo_raw": [None] * 5, "examen_raw": None}
    return {
        "nombre_original": nombre,
        "email": email,
        "indice": indice,
        "materias": {
            "algebra": {"trabajo_raw": [None] * 5, "examen_raw": algebra_examen},
            "trigonometria": dict(vacio),
            "geometria": dict(vacio),
        },
    }


def detalle(nombre):
    return {"nombre": nombre, "cuenta": None, "folio": None, "correo": None,
            "ingenieria": "ICO", "periodo_ingreso": "2025-2", "provisional": False}


async def correr(filas, guardados):
    """Procesa `filas` como ICO. `guardados`: {alumno_id: resultado previo}."""

    async def fake_load(db):
        email_map = {"ana@x.com": 1, "ana2@x.com": 1, "beto@x.com": 2, "caro@x.com": 3}
        return email_map, {}, {}, {
            1: detalle("Ana Ruiz Paz"), 2: detalle("Beto Lara Sol"),
            3: detalle("Caro Vega Luna"), 4: detalle("Dario Mora Rey"),
        }

    async def fake_get(self, alumno_id, periodo):
        return guardados.get(alumno_id)

    async def fake_upsert(self, alumno_id, periodo, carrera, **scores):
        guardados[alumno_id] = SimpleNamespace(carrera=carrera, **scores)

    async def fake_nombre(*args, **kwargs):
        return False

    with (
        patch.object(svc, "load_all_alumnos", fake_load),
        patch.object(svc, "parse_webassign_excel", lambda b, c: (filas, {})),
        patch.object(svc, "completar_nombre_si_falta", fake_nombre),
        patch.object(WebAssignRepository, "get_resultado", fake_get),
        patch.object(WebAssignRepository, "upsert_resultado", fake_upsert),
    ):
        return await svc.procesar_webassign(None, b"", "ICO", "2025-2")


def previo(carrera, algebra_examen):
    campos = dict.fromkeys(svc.CAMPOS_CALIFICACION)
    campos["algebra_examen"] = algebra_examen
    return SimpleNamespace(carrera=carrera, **campos)


guardados = {
    2: previo("ICI", 5.0),   # Beto ya tiene resultado de ICI con avance 5
    3: previo("ICO", 8.0),   # Caro tiene resultado de una carga anterior de ICO
}
filas = [
    fila(10, "ana@x.com", "Ruiz Paz, Ana", algebra_examen=14.5),  # avance 5
    fila(11, "ana2@x.com", "Ruiz Paz, Ana"),                       # vacía: se ignora
    fila(12, "beto@x.com", "Lara Sol, Beto", algebra_examen=29.0),  # 10 > 5: gana
    fila(13, "caro@x.com", "Vega Luna, Caro"),                     # vacía: no pisa
    fila(14, "nadie@x.com", "Mora Rey, Dario", algebra_examen=29.0),  # solo nombre
]
res = asyncio.run(correr(filas, guardados))

check("total filas", res["total_filas"], 5)
check("encontrados (un resultado por alumno)", res["encontrados"], 2)
check("alumnos en resultados", [r["alumno_id"] for r in res["resultados"]], [1, 2])
check("Ana conserva la fila con avance", guardados[1].algebra_examen, 5.0)
check("Beto pasa a ICO", (guardados[2].carrera, guardados[2].algebra_examen), ("ICO", 10.0))
check("Caro conserva su calificación", guardados[3].algebra_examen, 8.0)

dups = {(d["alumno_id"], d["origen"]): d for d in res["filas_duplicadas_ignoradas"]}
check("duplicadas reportadas", sorted(dups), [(1, ORIGEN_ESTA_CARGA), (2, ORIGEN_OTRA_CARRERA), (3, ORIGEN_CARGA_ANTERIOR)])
d = dups[(1, ORIGEN_ESTA_CARGA)]
check("Ana: fila ignorada", (d["indice_ignorada"], d["avance_ignorada"]), (11, 0))
check("Ana: fila conservada", (d["indice_conservada"], d["avance_conservada"]), (10, 5.0))
d = dups[(2, ORIGEN_OTRA_CARRERA)]
check("Beto: se ignora el de ICI", (d["carrera_ignorada"], d["avance_ignorada"]), ("ICI", 5.0))
check("Beto: se conserva la de ICO", (d["carrera_conservada"], d["avance_conservada"]), ("ICO", 10.0))

nf = res["no_encontrados_detalle"]
check("único candidato por nombre no se asigna", [n["indice"] for n in nf], [14])
check("candidato como sugerencia", [c["alumno_id"] for c in nf[0]["candidatos"]], [4])
check("Dario sin resultado", 4 in guardados, False)

# Si la segunda fila trae más avance, sustituye a la primera en esta carga.
guardados = {}
res = asyncio.run(correr([
    fila(20, "ana@x.com", "Ruiz Paz, Ana"),
    fila(21, "ana2@x.com", "Ruiz Paz, Ana", algebra_examen=29.0),
], guardados))
check("segunda fila gana", guardados[1].algebra_examen, 10.0)
check("un solo resultado", len(res["resultados"]), 1)
check("resultado con la fila ganadora", res["resultados"][0]["algebra_examen"], 10.0)
d = res["filas_duplicadas_ignoradas"][0]
check("se ignora la primera", (d["indice_ignorada"], d["indice_conservada"]), (20, 21))

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
