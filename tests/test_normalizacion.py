from app.services.normalizacion import (
    clasificar_identificador,
    normalizar_correo,
    normalizar_cuenta,
    normalizar_folio,
    solo_digitos,
)
from app.services.upload_diagnostico_service import clasificar_columnas_cuenta_folio

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


# --- solo_digitos ---
check("solo_digitos(2221316.0)", solo_digitos(2221316.0), "2221316")
check("solo_digitos(1910432.5)", solo_digitos(1910432.5), None)
check('solo_digitos("4.25028991E8")', solo_digitos("4.25028991E8"), "425028991")
check('solo_digitos(" 222-1316 ")', solo_digitos(" 222-1316 "), "2221316")
check('solo_digitos(".")', solo_digitos("."), None)
check('solo_digitos("")', solo_digitos(""), None)
check("solo_digitos(None)", solo_digitos(None), None)
check("solo_digitos(True)", solo_digitos(True), None)
check("solo_digitos(708528120.0)", solo_digitos(708528120.0), "708528120")

# --- normalizar_cuenta ---
check("cuenta 2221316.0", normalizar_cuenta(2221316.0), "2221316")
check("cuenta 2221316", normalizar_cuenta(2221316), "2221316")
check('cuenta "2221316"', normalizar_cuenta("2221316"), "2221316")
check('cuenta " 222-1316 "', normalizar_cuenta(" 222-1316 "), "2221316")
check('cuenta "0442219"', normalizar_cuenta("0442219"), "0442219")
check("cuenta 242102.0", normalizar_cuenta(242102.0), None)
check("cuenta 22213160", normalizar_cuenta(22213160), None)
check("cuenta 1910432.5", normalizar_cuenta(1910432.5), None)
check("cuenta None", normalizar_cuenta(None), None)
check('cuenta ""', normalizar_cuenta(""), None)
check('cuenta "."', normalizar_cuenta("."), None)
check("cuenta True", normalizar_cuenta(True), None)

# --- normalizar_folio ---
check("folio 708528120.0", normalizar_folio(708528120.0), "708528120")
check('folio "425028991"', normalizar_folio("425028991"), "425028991")
check('folio "4.25028991E8"', normalizar_folio("4.25028991E8"), "425028991")
check("folio 1111", normalizar_folio(1111), None)
check("folio 4250333053", normalizar_folio(4250333053), None)

# --- clasificar_identificador ---
check("clasif 2221316.0", clasificar_identificador(2221316.0), ("cuenta", "2221316"))
check("clasif 708528120.0", clasificar_identificador(708528120.0), ("folio", "708528120"))
check('clasif "a@b.com"', clasificar_identificador("a@b.com"), ("correo", None))
check('clasif "Silva"', clasificar_identificador("Silva"), (None, None))
check("clasif None", clasificar_identificador(None), (None, None))

# --- columnas cruzadas: COL_CUENTA vacía y COL_FOLIO = 2221316.0 ---
check(
    "cruzada cuenta vacía, folio=2221316.0",
    clasificar_columnas_cuenta_folio(None, 2221316.0),
    ("2221316", None),
)
check(
    "cruzada cuenta=2221316.0, folio vacío",
    clasificar_columnas_cuenta_folio(2221316.0, None),
    ("2221316", None),
)
check(
    "cruzada cuenta=folio(708528120.0), folio vacío",
    clasificar_columnas_cuenta_folio(708528120.0, None),
    (None, "708528120"),
)
check(
    "ambas columnas con su tipo",
    clasificar_columnas_cuenta_folio(2221316.0, 708528120.0),
    ("2221316", "708528120"),
)
check(
    "swap completo",
    clasificar_columnas_cuenta_folio(708528120.0, 2221316.0),
    ("2221316", "708528120"),
)
check(
    "ambas tipo cuenta -> gana COL_CUENTA",
    clasificar_columnas_cuenta_folio("2221316", 2221316.0),
    ("2221316", None),
)
check(
    "ambas tipo folio -> gana COL_FOLIO",
    clasificar_columnas_cuenta_folio(708528120.0, 708528121.0),
    (None, "708528121"),
)

# --- normalizar_correo ---
check("correo None", normalizar_correo(None), None)
check('correo ""', normalizar_correo(""), None)
check('correo sin @', normalizar_correo("juan.gmail.com"), None)
check('correo basico', normalizar_correo("  Juan.Perez@Gmail.com "), "juan.perez@gmail.com")
check('correo espacios internos', normalizar_correo("juan perez @ gmail .com"), "juanperez@gmail.com")
check('correo WebAssign', normalizar_correo("juan@gmail.com@uaemex.mx"), "juan@gmail.com")
check('correo WebAssign triple', normalizar_correo("a@b@c.com@uaemex.mx"), None)
check('correo usuario vacio', normalizar_correo("@gmail.com"), None)
check('correo dominio vacio', normalizar_correo("juan@"), None)
check('correo .con', normalizar_correo("juan@hotmail.con"), "juan@hotmail.com")
check('correo .con raro', normalizar_correo("juan@empresa.con"), "juan@empresa.com")
check('correo gmial', normalizar_correo("juan@gmial.com"), "juan@gmail.com")
check('correo gmail.co', normalizar_correo("juan@gmail.co"), "juan@gmail.com")
check('correo hotmial', normalizar_correo("juan@hotmial.com"), "juan@hotmail.com")
check('correo outlook.coom', normalizar_correo("juan@outlook.coom"), "juan@outlook.com")
check('correo icoud', normalizar_correo("juan@icoud.com"), "juan@icloud.com")
check('correo yahoo.com.mz', normalizar_correo("juan@yahoo.com.mz"), "juan@yahoo.com.mx")
check('correo yaho', normalizar_correo("juan@yaho.com"), "juan@yahoo.com")
check('correo gmail.con -> gmail.com', normalizar_correo("juan@gmail.con"), "juan@gmail.com")
for valido in ("juan@gmx.com", "juan@live.com.mx", "juan@uaemex.mx", "juan@alumno.uaemex.mx", "juan@yahoo.com.mx"):
    check(f"correo intacto {valido}", normalizar_correo(valido), valido)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTODAS LAS PRUEBAS PASARON")