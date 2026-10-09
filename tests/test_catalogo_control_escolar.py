"""Pruebas de la carga del catálogo de Control Escolar.

python -m tests.test_catalogo_control_escolar

La primera parte no necesita base de datos. La segunda crea alumnos de prueba
en la base configurada dentro de una transacción y hace rollback al final.
"""

import asyncio
import io

import openpyxl
from sqlalchemy import select

from app.core.database import async_session
from app.models.alumno import Alumno
from app.models.identificador_alumno import IdentificadorAlumno
from app.models.user import AuthMethod, User
from app.services.alumnos_provisionales_service import (
    crear_alumno_provisional,
    datos_para_provisionales,
)
from app.services.catalogo_control_escolar_service import (
    CatalogoError,
    emparejar,
    leer_filas_catalogo,
    parsear_fila,
    procesar_catalogo,
)

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


def fila(correo, cuenta, nombre, paterno, materno, correo2=None):
    # A correo, B cuenta, C "A"+cuenta, D vacía, E-G nombre, H vacía, I correo
    return (correo, cuenta, f"A{cuenta}", None, nombre, paterno, materno, None, correo2 or correo)


def xlsx(filas, hoja="Datos catalogo"):
    wb = openpyxl.Workbook()
    wb.active.title = "CREANI"
    ws = wb.create_sheet(hoja)
    for f in filas:
        ws.append(list(f))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ── parsear_fila ─────────────────────────────────────────────────
p = parsear_fila(fila(" Ana@Gmail.con ", 2421999.0, "ANA MARIA", "RUIZ", "PAZ", "ana@uaemex.mx"))
check("correos normalizados", p["correos"], ["ana@gmail.com", "ana@uaemex.mx"])
check("cuenta normalizada", p["cuenta"], "2421999")
check("nombre en título", (p["nombre"], p["apellido_paterno"], p["apellido_materno"]), ("Ana Maria", "Ruiz", "Paz"))
check("correo repetido una vez", parsear_fila(fila("a@x.com", None, "A", "B", "C"))["correos"], ["a@x.com"])
check("fila sin correo ni cuenta", parsear_fila(("CORREO", "CUENTA", "", "", "NOMBRE")), None)
check("fila vacía", parsear_fila(()), None)

# ── emparejar (nunca por nombre) ─────────────────────────────────
emails = {"a@x.com": 1, "b@x.com": 2}
cuentas = {"1111111": 1, "2222222": 2}
check("por correo", emparejar(["a@x.com"], None, emails, cuentas)[0], 1)
check("por cuenta", emparejar(["z@x.com"], "2222222", emails, cuentas)[0], 2)
check("correo y cuenta del mismo", emparejar(["a@x.com"], "1111111", emails, cuentas)[0], 1)
check("no existe", emparejar(["z@x.com"], "9999999", emails, cuentas), (None, {}))
check(
    "correo y cuenta de alumnos distintos",
    emparejar(["a@x.com"], "2222222", emails, cuentas),
    (None, {"a@x.com": 1, "2222222": 2}),
)
check("dos correos de alumnos distintos", emparejar(["a@x.com", "b@x.com"], None, emails, cuentas)[0], None)

# ── hoja ─────────────────────────────────────────────────────────
check("lee la hoja aunque no sea la primera", len(leer_filas_catalogo(xlsx([fila("a@x.com", 1, "A", "B", "C")]), "c.xlsx")), 1)
check("hoja con otro formato de nombre", len(leer_filas_catalogo(xlsx([], hoja="DATOS CATÁLOGO"), "c.xlsx")), 0)
try:
    leer_filas_catalogo(xlsx([], hoja="Otra"), "c.xlsx")
    check("sin hoja de catálogo", "sin error", "CatalogoError")
except CatalogoError:
    check("sin hoja de catálogo", "CatalogoError", "CatalogoError")


# ── procesar_catalogo contra la base (con rollback) ──────────────
PREFIJO = "zz.prueba.catalogo"


async def crear_normal(db, role_id, ing_id, correo, cuenta, nombre=("", "", "")):
    user = User(
        nombre=nombre[0], apellido_paterno=nombre[1], apellido_materno=nombre[2],
        correo_personal=correo, auth_method=AuthMethod.NUMERO_CUENTA, activo=True, role_id=role_id,
    )
    db.add(user)
    await db.flush()
    alumno = Alumno(usuario_id=user.id, ingenieria_id=ing_id, periodo_ingreso="2025-2", numero_cuenta=cuenta)
    db.add(alumno)
    await db.flush()
    return alumno.id


async def nombre_y_cuenta(db, alumno_id):
    alumno = await db.get(Alumno, alumno_id)
    user = await db.get(User, alumno.usuario_id)
    await db.refresh(alumno)
    await db.refresh(user)
    return (user.nombre, user.apellido_paterno, user.apellido_materno), alumno.numero_cuenta, alumno.es_provisional


async def identificadores(db, alumno_id):
    rows = await db.execute(
        select(IdentificadorAlumno.tipo, IdentificadorAlumno.valor)
        .where(IdentificadorAlumno.alumno_id == alumno_id)
        .order_by(IdentificadorAlumno.tipo, IdentificadorAlumno.valor)
    )
    return [tuple(r) for r in rows.all()]


async def prueba_db():
    async with async_session() as db:
        ocupadas = set((await db.execute(select(Alumno.numero_cuenta))).scalars())
        libres = (c for c in (f"{n:07d}" for n in range(9999999, 9000000, -1)) if c not in ocupadas)
        c_prov, c_prov_vieja, c_normal, c_normal_otra, c_sin_cuenta, c_vacio, c_nadie = (
            next(libres) for _ in range(7)
        )

        role_id, _, ing_ids = await datos_para_provisionales(db)
        ing_id = next(iter(ing_ids.values()))
        clave = next(iter(ing_ids))
        correo = lambda n: f"{PREFIJO}.{n}@gmail.com"  # noqa: E731

        def provisional(n):
            return crear_alumno_provisional(
                db, role_id=role_id, ingenieria_id=ing_id, ingenieria_clave=clave, periodo="2025-2",
                correo=correo(n), lugar_admision=None, email_map={}, alumno_details={},
            )

        prov = await provisional("prov")
        prov_cuenta_vieja = await provisional("prov2")
        (await db.get(Alumno, prov_cuenta_vieja)).numero_cuenta = c_prov_vieja
        normal = await crear_normal(db, role_id, ing_id, correo("normal"), c_normal, ("Luis", "Diaz", "Mora"))
        sin_datos = await crear_normal(db, role_id, ing_id, correo("vacio"), None)
        conflicto_a = await crear_normal(db, role_id, ing_id, correo("confa"), None, ("A", "A", "A"))
        conflicto_b = await crear_normal(db, role_id, ing_id, correo("confb"), c_nadie, ("B", "B", "B"))

        archivo = xlsx([
            ("Correo", "Cuenta", "Cuenta A", None, "Nombre"),  # encabezado: se ignora
            # provisional: toma nombre y cuenta; correo institucional como identificador
            fila(correo("prov"), c_prov, "ANA", "RUIZ", "PAZ", correo2=f"{PREFIJO}.prov@uaemex.mx"),
            # provisional con otra cuenta: se corrige con la del catálogo
            fila(correo("prov2"), c_sin_cuenta, "BETO", "LARA", "SOL"),
            # normal encontrado por cuenta: no se pisa el nombre; correo nuevo
            fila(correo("normal.otro"), c_normal, "LUIS ALBERTO", "DIAZ", "MORA"),
            # normal con otra cuenta en el catálogo: no se pisa (conflicto de identificador)
            fila(correo("normal"), c_normal_otra, "LUIS", "DIAZ", "MORA"),
            # normal sin nombre ni cuenta: se llenan
            fila(correo("vacio"), c_vacio, "CARO", "VEGA", "LUNA"),
            # correo de un alumno y cuenta de otro: conflicto, nada cambia
            fila(correo("confa"), c_nadie, "X", "Y", "Z"),
            # no existe: no se crea
            fila(correo("nadie"), None, "NADIE", "NO", "EXISTE"),
            # mismo provisional otra vez: ya no hay cambios
            fila(correo("prov"), c_prov, "ANA", "RUIZ", "PAZ", correo2=f"{PREFIJO}.prov@uaemex.mx"),
        ])
        res = await procesar_catalogo(db, archivo, "creani.xlsx")
        await db.flush()

        check("total filas (sin encabezado)", res["total_filas"], 8)
        check("actualizados", res["actualizados"], 4)
        check("sin cambios", res["sin_cambios"], 2)
        check("no encontrados", res["no_encontrados"], 1)
        check("conflictos", [(c["fila"], sorted(a["alumno_id"] for a in c["alumnos"])) for c in res["conflictos"]],
              [(7, sorted([conflicto_a, conflicto_b]))])

        check("provisional: nombre y cuenta", await nombre_y_cuenta(db, prov), (("Ana", "Ruiz", "Paz"), c_prov, True))
        check("provisional: correo nuevo como identificador", await identificadores(db, prov),
              [("correo", f"{PREFIJO}.prov@uaemex.mx")])
        check("provisional: cuenta corregida", await nombre_y_cuenta(db, prov_cuenta_vieja),
              (("Beto", "Lara", "Sol"), c_sin_cuenta, True))
        check("normal: no se pisa nombre ni cuenta", await nombre_y_cuenta(db, normal),
              (("Luis", "Diaz", "Mora"), c_normal, False))
        check("normal: correo nuevo como identificador", await identificadores(db, normal),
              [("correo", correo("normal.otro"))])
        check("normal: cuenta distinta reportada",
              [(c["tipo"], c["valor"], c["alumno_id"]) for c in res["conflictos_identificadores"]
               if c["alumno_id"] == normal],
              [("cuenta", c_normal_otra, normal)])
        check("normal vacío: se llenan nombre y cuenta",
              await nombre_y_cuenta(db, sin_datos), (("Caro", "Vega", "Luna"), c_vacio, False))
        check("conflicto: alumno A sin cambios", await nombre_y_cuenta(db, conflicto_a), (("A", "A", "A"), None, False))
        check("conflicto: alumno B sin cambios", await nombre_y_cuenta(db, conflicto_b), (("B", "B", "B"), c_nadie, False))
        creado = await db.scalar(select(User.id).where(User.correo_personal == correo("nadie")))
        check("no encontrado: no se crea", creado, None)

        await db.rollback()


# psycopg en modo async no funciona con el ProactorEventLoop de Windows.
asyncio.run(prueba_db(), loop_factory=asyncio.SelectorEventLoop)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
