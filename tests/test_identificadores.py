"""Pruebas de las reglas para aprender correos/cuentas/folios de un alumno.

No necesitan base de datos: python -m tests.test_identificadores
"""

from app.services.identificadores import (
    DISTINTO_AL_REGISTRADO,
    PERTENECE_A_OTRO,
    agregar_identificadores_extra,
    aplicar_plan_en_memoria,
    planear_identificadores,
)

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


def mapas():
    # Alumno 1: registrado con correo personal y cuenta, sin folio.
    # Alumno 2: registrado con correo y folio, sin cuenta.
    email_map = {"ana@gmail.com": 1, "beto@gmail.com": 2}
    cuenta_map = {"2421196": 1}
    folio_map = {"425028991": 2}
    details = {
        1: {"nombre": "ANA", "cuenta": "2421196", "folio": None},
        2: {"nombre": "BETO", "cuenta": None, "folio": "425028991"},
    }
    return email_map, cuenta_map, folio_map, details


def plan(alumno_id, correos=(), cuentas=(), folios=()):
    email_map, cuenta_map, folio_map, details = mapas()
    return planear_identificadores(
        alumno_id,
        correos=correos,
        cuentas=cuentas,
        folios=folios,
        email_map=email_map,
        cuenta_map=cuenta_map,
        folio_map=folio_map,
        cuenta_actual=details[alumno_id]["cuenta"],
        folio_actual=details[alumno_id]["folio"],
    )


# --- datos que ya tiene: no hace nada ---
p = plan(1, correos=["ana@gmail.com"], cuentas=["2421196"])
check("ya conocidos -> 0 nuevos", p.total_nuevos, 0)
check("ya conocidos -> sin conflictos", p.conflictos, [])

# --- correo nuevo (p. ej. el institucional que trae el cuestionario) ---
p = plan(1, correos=["ana@gmail.com", "aperez001@alumno.uaemex.mx"])
check("correo nuevo se guarda", p.correos_nuevos, ["aperez001@alumno.uaemex.mx"])

# --- None y repetidos se ignoran ---
p = plan(1, correos=[None, "x@gmail.com", "x@gmail.com"], cuentas=[None], folios=[None])
check("None/repetidos", (p.correos_nuevos, p.cuenta_nueva, p.folio_nuevo), (["x@gmail.com"], None, None))

# --- alumno sin folio: se le asigna el que trae el examen ---
p = plan(1, folios=["425086827"])
check("folio faltante se asigna", p.folio_nuevo, "425086827")

# --- alumno sin cuenta: se le asigna ---
p = plan(2, cuentas=["2421246"])
check("cuenta faltante se asigna", p.cuenta_nueva, "2421246")

# --- correo de OTRO alumno: no se mueve, se reporta ---
p = plan(1, correos=["beto@gmail.com"])
check("correo de otro -> no se guarda", p.correos_nuevos, [])
check(
    "correo de otro -> conflicto",
    [(c["tipo"], c["motivo"], c["alumno_id_existente"]) for c in p.conflictos],
    [("correo", PERTENECE_A_OTRO, 2)],
)

# --- folio de OTRO alumno (alguien escribió el de otro) ---
p = plan(1, folios=["425028991"])
check("folio de otro -> no se asigna", p.folio_nuevo, None)
check("folio de otro -> conflicto", [c["motivo"] for c in p.conflictos], [PERTENECE_A_OTRO])

# --- cuenta distinta a la registrada (error de captura) ---
p = plan(1, cuentas=["2421199"])
check("cuenta distinta -> no se asigna", p.cuenta_nueva, None)
check("cuenta distinta -> conflicto", [c["motivo"] for c in p.conflictos], [DISTINTO_AL_REGISTRADO])

# --- dos folios nuevos distintos en la misma fila: solo el primero ---
p = plan(1, folios=["425086827", "425086828"])
check("dos folios nuevos -> primero", p.folio_nuevo, "425086827")
check("dos folios nuevos -> el segundo es conflicto", len(p.conflictos), 1)

# --- aplicar en memoria: la siguiente fila ya encuentra al alumno ---
email_map, cuenta_map, folio_map, details = mapas()
p = planear_identificadores(
    2,
    correos=["beto.inst@uaemex.mx"],
    cuentas=["2421246"],
    email_map=email_map,
    cuenta_map=cuenta_map,
    folio_map=folio_map,
    cuenta_actual=None,
    folio_actual="425028991",
)
aplicar_plan_en_memoria(2, p, email_map, cuenta_map, folio_map, details)
check("memoria: correo nuevo apunta al alumno", email_map.get("beto.inst@uaemex.mx"), 2)
check("memoria: cuenta nueva apunta al alumno", cuenta_map.get("2421246"), 2)
check("memoria: detalle actualizado", details[2]["cuenta"], "2421246")

# --- cargar los guardados en BD: no pisan al registro ---
email_map, cuenta_map, folio_map, _ = mapas()
agregar_identificadores_extra(
    [
        ("correo", "ana.otro@gmail.com", 1),
        ("correo", "beto@gmail.com", 1),  # ya es del registro de 2: se respeta
        ("folio", "425086827", 1),
        ("desconocido", "x", 1),
    ],
    email_map,
    cuenta_map,
    folio_map,
)
check("extra: correo aprendido", email_map.get("ana.otro@gmail.com"), 1)
check("extra: registro tiene prioridad", email_map.get("beto@gmail.com"), 2)
check("extra: folio aprendido", folio_map.get("425086827"), 1)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTODAS LAS PRUEBAS PASARON")
