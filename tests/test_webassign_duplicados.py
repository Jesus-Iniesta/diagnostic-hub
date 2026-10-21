"""Pruebas de WebAssign: alumno con dos filas, emparejamiento solo por correo
y registro automático de quien no se encontró.

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


# ── emparejar_nombre ─────────────────────────────────────────────
from app.services.emparejar_nombre import (  # noqa: E402
    IDENTICO,
    NINGUNO,
    POSIBLE,
    buscar_por_nombre,
    usuario_de_correo,
    usuarios_institucionales,
)

check("usuario del correo", usuario_de_correo("rgonzalezc009@alumno.uaemex.mx"), "rgonzalezc")
check("correo no institucional", usuario_de_correo("rgonzalezc009@gmail.com"), None)
check("forma con apellidos separados",
      usuarios_institucionales(("Roberto", "González", "Calderón"), None), {"rgonzalezc"})
check("forma con los apellidos juntos (WebAssign)",
      usuarios_institucionales(("Roberto", "González Calderón", ""), None), {"rgonzalezc"})
check("forma con el nombre en un texto",
      "rgonzalezc" in usuarios_institucionales(None, "Roberto González Calderón"), True)
CAND = {1: {"nombre": "Roberto González Calderón"}, 2: {"nombre": "Ana Ruiz Paz"},
        3: {"nombre": "Luis Mora"}, 4: {"nombre": "Luis Mora"}}
check("idéntico en otro orden", buscar_por_nombre("Gonzalez Calderon, ROBERTO", None, CAND)[:2], (IDENTICO, [1]))
check("homónimos: no se junta", buscar_por_nombre("Mora, Luis", None, CAND)[:2], (POSIBLE, [3, 4]))
check("incompleto: posible", buscar_por_nombre("Ruiz, Ana", None, CAND)[:2], (POSIBLE, [2]))
check("por correo institucional",
      buscar_por_nombre("Otro, Nombre", "rgonzalezc009@alumno.uaemex.mx", CAND)[:2], (POSIBLE, [1]))
check("nada", buscar_por_nombre("Otro, Nombre", "x@gmail.com", CAND)[:2], (NINGUNO, []))


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


def detalle(nombre, periodo="2025-2"):
    return {"nombre": nombre, "cuenta": None, "folio": None, "correo": None,
            "ingenieria": "ICO", "periodo_ingreso": periodo, "provisional": False}


class RegistradorEnMemoria:
    """Busca solo por correo y registra con id 100, 101, ... a quien no existe."""

    def __init__(self, db, registro, periodo):
        self.registro = registro
        self.creados: list[dict] = []
        self.ids_creados: set[int] = set()

    async def buscar_o_registrar(self, *, correos=(), nombre=None, ingenieria=None, **_):
        correo = next((c for c in correos if c), None)
        if correo is None:
            return None
        if correo in self.registro.email_map:
            return self.registro.email_map[correo]
        nuevo = 100 + len(self.creados)
        self.registro.email_map[correo] = nuevo
        self.registro.alumno_details[nuevo] = detalle(" ".join(p for p in nombre if p))
        self.registro.alumno_details[nuevo]["ingenieria"] = ingenieria
        self.ids_creados.add(nuevo)
        self.creados.append({"alumno_id": nuevo, "correo": correo})
        return nuevo

    async def completar(self, *args, **kwargs):
        return None

    def resumen(self):
        return {"registrados_nuevos": len(self.creados)}


async def correr(filas, guardados, correos_guardados=None, parejas=None):
    """Procesa `filas` como ICO. `guardados`: {alumno_id: resultado previo}.

    `correos_guardados` y `parejas` reciben los correos que se guardan de los
    alumnos encontrados por nombre y los posibles duplicados que se marcan.
    """
    correos_guardados = [] if correos_guardados is None else correos_guardados
    parejas = [] if parejas is None else parejas

    async def fake_load(db):
        email_map = {"ana@x.com": 1, "ana2@x.com": 1, "beto@x.com": 2, "caro@x.com": 3}
        return email_map, {}, {}, {
            1: detalle("Ana Ruiz Paz"), 2: detalle("Beto Lara Sol"),
            3: detalle("Caro Vega Luna"), 4: detalle("Dario Mora Rey"),
            5: detalle("Hugo Paz Lee", periodo="2024-1"),
        }

    async def fake_get(self, alumno_id, periodo):
        return guardados.get(alumno_id)

    async def fake_upsert(self, alumno_id, periodo, carrera, **scores):
        guardados[alumno_id] = SimpleNamespace(carrera=carrera, **scores)

    async def fake_guardar(*args, **kwargs):
        return None

    async def fake_guardar_correo(db, registro, alumno_id, correo, indice):
        correos_guardados.append((alumno_id, correo))

    async def fake_marcar(db, alumno_id, otro_id, motivo):
        parejas.append((alumno_id, otro_id, motivo))
        return True

    with (
        patch.object(svc, "load_all_alumnos", fake_load),
        patch.object(svc, "parse_webassign_excel", lambda b, c: (filas, {})),
        patch.object(svc, "RegistroAutomatico", RegistradorEnMemoria),
        patch.object(svc, "guardar_filas_no_registradas", fake_guardar),
        patch.object(svc, "guardar_correo_webassign", fake_guardar_correo),
        patch.object(svc, "marcar_posible_duplicado", fake_marcar),
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
    fila(14, "nadie@x.com", "Nuevo Gil, Eli", algebra_examen=29.0),  # se registra
    fila(15, None, "Sin Correo, Fito", algebra_examen=29.0),  # sin correo
]
res = asyncio.run(correr(filas, guardados))

check("total filas", res["total_filas"], 6)
check("encontrados (un resultado por alumno)", res["encontrados"], 2)
check("registrados nuevos", res["registrados_nuevos"], 1)
check("alumnos en resultados", [r["alumno_id"] for r in res["resultados"]], [1, 2, 100])
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
check("nadie con ese nombre: se registra nuevo", (4 in guardados, 100 in guardados), (False, True))
check("nuevo con la carrera elegida", res["resultados"][2]["ingenieria"], "ICO")
check("sin correo: no se pudo registrar", [n["indice"] for n in nf], [15])
check("motivo sin correo", nf[0]["motivo"], "Le faltó escribir su número de cuenta o folio.")
check("sin candidatos", nf[0]["candidatos"], [])

# ── Por nombre cuando el correo no lo encuentra ──────────────────
guardados, correos_guardados, parejas = {}, [], []
res = asyncio.run(correr([
    # Idéntico (otro orden y sin acentos) y único: se junta y guarda el correo.
    fila(30, "dmorar001@alumno.uaemex.mx", "Mora Rey, Darío", algebra_examen=29.0),
    # Incompleto, uno solo: provisional + posible duplicado con Ana.
    fila(31, "otra.ana@x.com", "Ruiz, Ana"),
    # Correo institucional con la forma de "Beto Lara Sol": posible duplicado.
    fila(32, "blaras007@alumno.uaemex.mx", "Zeta, Zoe"),
    # Mismo nombre pero de otro periodo: no se junta.
    fila(33, "hugo@x.com", "Paz Lee, Hugo"),
    # Nada parecido: solo provisional.
    fila(34, "nadie2@x.com", "Nadie, Nada"),
], guardados, correos_guardados, parejas))
check("idéntico: se junta con Dario", 4 in guardados, True)
check("idéntico: guarda su correo", correos_guardados, [(4, "dmorar001@alumno.uaemex.mx")])
check("unidos por nombre", res["unidos_por_nombre"], 1)
check("los demás se registran", res["registrados_nuevos"], 4)
check("posibles duplicados (incompleto y correo institucional)",
      [(a, b) for a, b, _ in parejas], [(100, 1), (101, 2)])
check("motivos", [m for _, _, m in parejas],
      ["Nombre parecido en WebAssign", "Su correo institucional corresponde a este nombre"])
check("otro periodo: no se junta", 5 in guardados, False)

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
