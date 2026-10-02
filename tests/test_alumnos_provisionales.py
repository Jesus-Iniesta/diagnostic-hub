"""Pruebas de las reglas de alumnos provisionales.

No necesitan base de datos: python -m tests.test_alumnos_provisionales
"""

from app.services.alumnos_provisionales import (
    COMPLETAR,
    CREAR,
    DUPLICADO,
    clave_ingenieria_fila,
    destino_fila_padron,
    lugar_desde_usuario,
    nombre_desde_completo,
    nombre_desde_webassign,
    nombre_vacio,
)

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


ING = {
    "ICO": "Ingeniería en Computación",
    "IEL": "Ingeniería en Electrónica",
    "IME": "Ingeniería Mecánica",
    "ISES": "Ingeniería en Sistemas Eléctricos y Sustentabilidad",
    "ICI": "Ingeniería Civil",
    "IIA": "Ingeniería en Inteligencia Artificial",
}

# --- ingeniería: paréntesis, usuario, nombre ---
check("paréntesis", clave_ingenieria_fila("Ingeniería Civil (ICI)", None, ING), "ICI")
check("paréntesis gana al usuario", clave_ingenieria_fila("Ingeniería Civil (ICI)", "ICO_01", ING), "ICI")
check("usuario ICO_094", clave_ingenieria_fila("Ingeniería en Computación ", "ICO_094", ING), "ICO")
check("usuario con O en vez de 0 no sirve -> nombre", clave_ingenieria_fila("Ingeniería Mecánica", "IME_01O", ING), "IME")
check("solo nombre, sin acentos", clave_ingenieria_fila("ingenieria en computacion", None, ING), "ICO")
check("nombre distinto al catálogo (Electrónica sin 'en')", clave_ingenieria_fila("Ingeniería Electrónica (IEL)", None, ING), "IEL")
check("nada reconocible", clave_ingenieria_fila("Otra cosa", "XYZ_1", ING), None)
check("vacío", clave_ingenieria_fila(None, None, ING), None)

# --- lugar desde usuario ---
check("lugar ICO_094", lugar_desde_usuario("ICO_094"), 94)
check("lugar ICI_9", lugar_desde_usuario("ICI_9"), 9)
check("lugar inválido", lugar_desde_usuario("IME_01O"), None)

# --- padrón: crear / completar / duplicado ---
prov = {10, 11}
check("sin dueños -> crear", destino_fila_padron(set(), prov), (CREAR, None))
check("un provisional -> completar", destino_fila_padron({10}, prov), (COMPLETAR, 10))
check("alumno normal -> duplicado", destino_fila_padron({5}, prov), (DUPLICADO, None))
check("provisional + normal -> duplicado", destino_fila_padron({5, 10}, prov), (DUPLICADO, None))
check("dos provisionales -> duplicado", destino_fila_padron({10, 11}, prov), (DUPLICADO, None))

# --- nombres ---
check("vacío", nombre_vacio("   "), True)
check("no vacío", nombre_vacio("Ana"), False)
check("webassign", nombre_desde_webassign("Abad Hernández, Erik"), ("Erik", "Abad Hernández", ""))
check("webassign en mayúsculas", nombre_desde_webassign("VILLEGAS DE NOVA, EDUARDO"), ("Eduardo", "Villegas De Nova", ""))
check("webassign incompleto", nombre_desde_webassign("Alamo, "), None)
check("final", nombre_desde_completo("  Juan Andrick  Juarez Arzate "), ("Juan Andrick Juarez Arzate", "", ""))
check("final basura '1.0'", nombre_desde_completo("1.0"), None)
check("final una palabra", nombre_desde_completo("Ana"), None)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTODAS LAS PRUEBAS PASARON")
