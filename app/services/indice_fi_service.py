"""Índice FI UAEMex: configuración por periodo, validación y cálculo.

El índice junta cuatro componentes (asistencia, examen diagnóstico, WebAssign y
examen final). Cada componente se reparte en partes iguales y cada parte se
calcula con regla de 3: (obtenido / máximo de la parte) * valor de la parte.
"""

from __future__ import annotations

import json
import math
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configuracion import Configuracion
from app.repositories.configuracion_repository import ConfiguracionRepository

INDICE_FI_KEY_PREFIX = "indice_fi:"

COMPONENTES = ("asistencia", "diagnostico", "webassign", "final")

VALORES_DEFAULT: dict[str, float] = {
    "asistencia": 1.0,
    "diagnostico": 3.0,
    "webassign": 3.0,
    "final": 4.0,
}

# Por ahora la asistencia no se usa: vale 0 y no cuenta para el máximo.
USAR_ASISTENCIA_DEFAULT = False

CATEGORIAS_DEFAULT: list[dict] = [
    {
        "nombre": "Alto",
        "minimo": 9.0,
        "maximo": 10.0,
        "comentario": (
            "Tu desempeño en el curso de nivelación es sobresaliente. Dominas los "
            "fundamentos matemáticos y cuentas con una base sólida para tus "
            "asignaturas de ingeniería."
        ),
    },
    {
        "nombre": "Bueno",
        "minimo": 7.0,
        "maximo": 8.9,
        "comentario": (
            "Tienes un buen desempeño y una base sólida. Reforzando los temas "
            "puntuales con menor puntaje puedes alcanzar un nivel sobresaliente."
        ),
    },
    {
        "nombre": "Medio",
        "minimo": 4.5,
        "maximo": 6.9,
        "comentario": (
            "Tu desempeño muestra áreas por reforzar. Te recomendamos practicar con "
            "constancia y buscar el apoyo de tus profesores y asesorías."
        ),
    },
    {
        "nombre": "Bajo",
        "minimo": 2.5,
        "maximo": 4.4,
        "comentario": (
            "Necesitas reforzar las bases matemáticas. Con práctica diaria y "
            "tutorías puedes mejorar considerablemente."
        ),
    },
    {
        "nombre": "Muy bajo",
        "minimo": 0.0,
        "maximo": 2.4,
        "comentario": (
            "Es un punto de partida. Dedica tiempo regular al estudio, no tengas "
            "miedo de preguntar y acércate a las asesorías que ofrece la Facultad."
        ),
    },
]

MATERIAS_DIAGNOSTICO = ("algebra", "trigonometria", "geometria", "calculo")
MATERIAS_WEBASSIGN = ("algebra", "trigonometria", "geometria")
MATERIAS_FINAL = ("algebra", "trigonometria", "geometria", "calculo")

# Máximo posible de cada parte.
MAX_ACIERTOS_CUESTIONARIO = 10  # 10 preguntas por materia en cada cuestionario
MAX_WEBASSIGN = 10.0  # trabajo y examen ya vienen en escala 0-10
MAX_FINAL = 10.0  # 20 preguntas * 0.5

# Tolerancia para comparar decimales escritos por el coordinador.
_EPS = 1e-6


def periodo_actual() -> str:
    hoy = date.today()
    return f"{hoy.year}{'A' if hoy.month <= 6 else 'B'}"


def componentes_activos(usar_asistencia: bool) -> tuple[str, ...]:
    return COMPONENTES if usar_asistencia else tuple(c for c in COMPONENTES if c != "asistencia")


def maximo_indice(valores: dict[str, float], usar_asistencia: bool) -> float:
    return round(sum(valores[c] for c in componentes_activos(usar_asistencia)), 4)


def fmt_num(valor: float) -> str:
    """9 -> '9.0', 8.9 -> '8.9', 2.25 -> '2.25'."""
    texto = f"{valor:.2f}"
    return texto[:-1] if texto.endswith("0") else texto


# ---------------------------------------------------------------- validación


def validar_config(
    valores: dict[str, float], categorias: list[dict], usar_asistencia: bool
) -> tuple[list[str], dict[int, list[str]]]:
    """Errores generales y errores por categoría (índice en la lista recibida)."""
    generales: list[str] = []
    por_categoria: dict[int, list[str]] = {}

    def agregar(i: int, msg: str) -> None:
        por_categoria.setdefault(i, []).append(msg)

    for c in componentes_activos(usar_asistencia):
        v = valores.get(c)
        if v is None or v < 0:
            generales.append("Los valores de los componentes no pueden ser negativos.")
            break
    maximo = maximo_indice(valores, usar_asistencia) if not generales else 0.0
    if not generales and maximo <= 0:
        generales.append("La suma de los valores de los componentes debe ser mayor que 0.")

    if not categorias:
        generales.append("Agrega al menos una categoría.")
        return generales, por_categoria

    for i, cat in enumerate(categorias):
        if not (cat.get("nombre") or "").strip():
            agregar(i, "Escribe el nombre de la categoría.")
        if cat["minimo"] > cat["maximo"] + _EPS:
            agregar(i, "El valor mínimo es mayor que el máximo.")

    # Las que tienen mínimo > máximo ya llevan su alerta; si entraran a la cadena
    # marcarían huecos y encimes falsos en las demás.
    orden = sorted(
        (i for i, c in enumerate(categorias) if c["minimo"] <= c["maximo"] + _EPS),
        key=lambda i: (categorias[i]["minimo"], i),
    )
    if not orden:
        return generales, por_categoria
    for anterior, actual in zip(orden, orden[1:]):
        prev = categorias[anterior]
        cat = categorias[actual]
        esperado = round(prev["maximo"] + 0.1, 4)
        nombre_prev = (prev.get("nombre") or "").strip() or "la categoría anterior"
        if cat["minimo"] <= prev["maximo"] + _EPS:
            agregar(
                actual,
                f"Se encima con «{nombre_prev}» ({fmt_num(prev['minimo'])}–"
                f"{fmt_num(prev['maximo'])}): el mínimo debe ser {fmt_num(esperado)}.",
            )
        elif abs(cat["minimo"] - esperado) > _EPS:
            agregar(
                actual,
                f"Hay un hueco después de «{nombre_prev}» (termina en "
                f"{fmt_num(prev['maximo'])}): el mínimo debe ser {fmt_num(esperado)}.",
            )

    primera = categorias[orden[0]]
    if abs(primera["minimo"]) > _EPS:
        agregar(orden[0], "La categoría más baja debe empezar en 0.")
    ultima = max(orden, key=lambda i: (categorias[i]["maximo"], i))
    if maximo > 0 and abs(categorias[ultima]["maximo"] - maximo) > _EPS:
        agregar(
            ultima,
            f"La categoría más alta debe terminar en {fmt_num(maximo)} "
            "(el máximo del índice).",
        )

    return generales, por_categoria


# -------------------------------------------------------------- persistencia


def _normalizar(raw: dict) -> dict:
    valores = {c: float(raw.get("valores", {}).get(c, VALORES_DEFAULT[c])) for c in COMPONENTES}
    categorias = [
        {
            "nombre": str(c.get("nombre", "")),
            "minimo": float(c.get("minimo", 0)),
            "maximo": float(c.get("maximo", 0)),
            "comentario": str(c.get("comentario", "")),
        }
        for c in raw.get("categorias", [])
    ]
    # Sin la llave (guardada antes de existir el interruptor) se toma el valor por defecto.
    usar_asistencia = bool(raw.get("usar_asistencia", USAR_ASISTENCIA_DEFAULT))
    return {"valores": valores, "categorias": categorias, "usar_asistencia": usar_asistencia}


async def obtener_config(db: AsyncSession, periodo: str) -> dict:
    """Configuración del periodo; si no tiene, la del periodo anterior más cercano."""
    propia = await ConfiguracionRepository(db).get(f"{INDICE_FI_KEY_PREFIX}{periodo}")
    if propia:
        return {**_normalizar(json.loads(propia)), "heredado_de": None, "es_default": False}

    rows = await db.execute(
        select(Configuracion.key, Configuracion.value).where(
            Configuracion.key.like(f"{INDICE_FI_KEY_PREFIX}%")
        )
    )
    anteriores = sorted(
        (
            (key[len(INDICE_FI_KEY_PREFIX):], value)
            for key, value in rows.all()
            if key[len(INDICE_FI_KEY_PREFIX):] < periodo
        ),
        reverse=True,
    )
    if anteriores:
        origen, value = anteriores[0]
        return {**_normalizar(json.loads(value)), "heredado_de": origen, "es_default": False}

    return {
        "valores": dict(VALORES_DEFAULT),
        "categorias": [dict(c) for c in CATEGORIAS_DEFAULT],
        "usar_asistencia": USAR_ASISTENCIA_DEFAULT,
        "heredado_de": None,
        "es_default": True,
    }


async def guardar_config(
    db: AsyncSession,
    periodo: str,
    valores: dict[str, float],
    categorias: list[dict],
    usar_asistencia: bool,
) -> None:
    await ConfiguracionRepository(db).set(
        f"{INDICE_FI_KEY_PREFIX}{periodo}",
        json.dumps(
            {"valores": valores, "categorias": categorias, "usar_asistencia": usar_asistencia},
            ensure_ascii=False,
        ),
    )


# -------------------------------------------------------------------- cálculo


def redondear_indice(valor: float) -> float:
    """A 1 decimal; un .x5 exacto se queda abajo (8.96 -> 9.0, 8.95 -> 8.9).

    Es la misma cuenta que la fórmula del CREANI: -INT(0.5 - ROUND(x*10, 6)) / 10.
    El ROUND a 6 decimales quita el ruido de punto flotante (8.95 = 8.9499999...).
    """
    return -math.floor(0.5 - round(valor * 10, 6)) / 10


def categoria_para(indice: float, categorias: list[dict]) -> dict | None:
    """La categoría con el mínimo más alto que no rebasa el índice (igual que en Excel)."""
    if not categorias:
        return None
    orden = sorted(categorias, key=lambda c: c["minimo"], reverse=True)
    for cat in orden:
        if indice >= cat["minimo"] - _EPS:
            return cat
    return orden[-1]


def _parte(obtenido: float | None, maximo: float, valor_parte: float) -> float:
    if obtenido is None:
        return 0.0
    return obtenido / maximo * valor_parte


def calcular_indice(datos: dict, config: dict) -> dict:
    """Desglose del índice de un alumno.

    `datos` usa las llaves de reportes_service._load_data: aciertos_c1_<materia>,
    aciertos_c2_<materia>, <materia>_trabajo, <materia>_examen y puntaje_<materia>.
    Lo que no hizo cuenta 0. La asistencia no se registra en el sistema (la llena
    el coordinador en el CREANI), así que aquí siempre vale 0; si no se usa,
    tampoco cuenta para el máximo.
    """
    valores = config["valores"]
    usar_asistencia = config["usar_asistencia"]

    parte_diag = valores["diagnostico"] / 8
    cuestionarios = {}
    for n in (1, 2):
        materias = {
            m: _parte(datos.get(f"aciertos_c{n}_{m}"), MAX_ACIERTOS_CUESTIONARIO, parte_diag)
            for m in MATERIAS_DIAGNOSTICO
        }
        cuestionarios[f"c{n}"] = {"materias": materias, "total": sum(materias.values())}
    diagnostico = {
        **cuestionarios,
        "total": cuestionarios["c1"]["total"] + cuestionarios["c2"]["total"],
        "valor": valores["diagnostico"],
    }

    parte_wa = valores["webassign"] / 6
    wa_materias = {}
    for m in MATERIAS_WEBASSIGN:
        trabajo = _parte(datos.get(f"{m}_trabajo"), MAX_WEBASSIGN, parte_wa)
        examen = _parte(datos.get(f"{m}_examen"), MAX_WEBASSIGN, parte_wa)
        wa_materias[m] = {"trabajo": trabajo, "examen": examen, "total": trabajo + examen}
    webassign = {
        "materias": wa_materias,
        "total": sum(x["total"] for x in wa_materias.values()),
        "valor": valores["webassign"],
    }

    parte_final = valores["final"] / 4
    final_materias = {
        m: _parte(datos.get(f"puntaje_{m}"), MAX_FINAL, parte_final) for m in MATERIAS_FINAL
    }
    final = {
        "materias": final_materias,
        "total": sum(final_materias.values()),
        "valor": valores["final"],
    }

    asistencia = 0.0
    suma = asistencia + diagnostico["total"] + webassign["total"] + final["total"]
    indice = redondear_indice(suma)
    return {
        "asistencia": {
            "total": asistencia,
            "valor": valores["asistencia"] if usar_asistencia else 0.0,
            "usar": usar_asistencia,
        },
        "diagnostico": diagnostico,
        "webassign": webassign,
        "final": final,
        "indice": indice,
        "maximo": maximo_indice(valores, usar_asistencia),
        "categoria": categoria_para(indice, config["categorias"]),
    }


# ------------------------------------------------------------- Excel (CREANI)


def formula_indice(celdas_suma: list[str]) -> str:
    suma = "+".join(celdas_suma)
    return f"=-INT(0.5-ROUND(({suma})*10,6))/10"


def formula_categoria(celda_indice: str, categorias: list[dict]) -> str:
    if not categorias:
        return '=""'
    orden = sorted(categorias, key=lambda c: c["minimo"], reverse=True)

    def texto(cat: dict) -> str:
        return '"' + cat["nombre"].replace('"', '""') + '"'

    expr = texto(orden[-1])
    for cat in reversed(orden[:-1]):
        minimo = f"{cat['minimo']:.4f}".rstrip("0").rstrip(".")
        expr = f"IF({celda_indice}>={minimo},{texto(cat)},{expr})"
    return f"={expr}"
