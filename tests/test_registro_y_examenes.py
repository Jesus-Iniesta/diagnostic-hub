"""El formulario de registro y las subidas de exámenes, en cualquier orden,
terminan en UN solo alumno con sus datos y calificaciones.

python -m tests.test_registro_y_examenes

La primera parte no necesita base de datos. La segunda corre contra la base
configurada dentro de una transacción con rollback: no se guarda nada.
"""

import asyncio
import io
from datetime import datetime

import openpyxl
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session
from app.models.alumno import Alumno
from app.models.posible_duplicado import PosibleDuplicado
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.user import User
from app.services.alumnos_provisionales import (
    COMPLETAR,
    CREAR,
    YA_REGISTRADO,
    destino_registro,
)

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


# ── Regla sin base de datos ──────────────────────────────────────
PROV = {1, 2}
check("nadie: crear", destino_registro({"cuenta": None, "folio": None, "correo": None}, PROV), (CREAR, None, []))
check("un provisional: completar", destino_registro({"cuenta": None, "folio": 1, "correo": 1}, PROV), (COMPLETAR, 1, []))
check("dos provisionales: gana la cuenta",
      destino_registro({"cuenta": 2, "folio": 1, "correo": None}, PROV), (COMPLETAR, 2, [1]))
check("dos provisionales sin cuenta: gana el folio",
      destino_registro({"cuenta": None, "folio": 1, "correo": 2}, PROV), (COMPLETAR, 1, [2]))
check("alumno ya registrado", destino_registro({"cuenta": 9, "folio": None, "correo": None}, PROV), (YA_REGISTRADO, None, []))
check("registrado + provisional: ya registrado",
      destino_registro({"cuenta": 1, "folio": None, "correo": 9}, PROV), (YA_REGISTRADO, None, []))


# ── Contra la base, en una transacción con rollback ──────────────
PERIODO = "2031B"
FECHA = datetime(2031, 8, 10, 9, 30)
P = "zz.flujo"


def final(filas) -> bytes:
    wb = openpyxl.Workbook()
    wb.active.append(["Timestamp", "Email", "Score", "Name", "Cuenta", "Folio", "Hora"] + [f"FA{i}" for i in range(20)])
    for f in filas:
        wb.active.append(list(f) + ["a"] * 20)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def registro(correo, cuenta, nombre=("Luis", "Mora", "Rey"), folio=None, ingenieria_id=1):
    from app.schemas.registro_alumno import RegistroAlumnoCreate

    return RegistroAlumnoCreate(
        nombre=nombre[0], apellido_paterno=nombre[1], apellido_materno=nombre[2],
        correo_personal=correo, numero_cuenta=cuenta, numero_folio=folio,
        ingenieria_id=ingenieria_id, periodo_ingreso=PERIODO, promedio_bachillerato=9.0,
        tiene_internet=True, tiene_computadora=True, es_foraneo=False, vulnerabilidad_economica=False,
    )


async def prueba_db():
    from app.api.v1.alumnos import _exigir_datos_completos
    from app.repositories.registro_alumno_repository import (
        MENSAJE_YA_REGISTRADO,
        RegistroAlumnoRepository,
    )
    from app.schemas.registro_alumno import RegistroAlumnoUpdate
    from app.services.alumnos_admin_service import casos_por_revisar
    from app.services.upload_diagnostico_service import (
        load_all_alumnos,
        procesar_examen_diagnostico,
    )

    async with async_session() as db:
        db.commit = db.flush  # nada se guarda
        try:
            repo = RegistroAlumnoRepository(db)
            ocupadas = set((await db.execute(select(Alumno.numero_cuenta))).scalars())
            libres = (c for c in (f"{n:07d}" for n in range(8899999, 8000000, -1)) if c not in ocupadas)
            c1, c2, c3, c6, c7 = (next(libres) for _ in range(5))
            f4 = "2031" + c3[2:]

            async def alumno(cuenta=None, folio=None):
                q = select(Alumno).options(selectinload(Alumno.usuario))
                q = q.where(Alumno.numero_cuenta == cuenta) if cuenta else q.where(Alumno.numero_folio == folio)
                return await db.scalar(q)

            # 1. Primero el registro, luego el examen: lo encuentra, no crea otro.
            await repo.create(registro(f"{P}.uno@gmail.com", c1, ("Ana", "Uno", "Paz")))
            r = await procesar_examen_diagnostico(db, final([
                (FECHA, f"{P}.uno@gmail.com", "1", "Ana Uno Paz", None, None, None),
            ]), "algebra", PERIODO)
            check("1: examen encuentra al registrado", (r["encontrados"], r["registrados_nuevos"]), (1, 0))

            # 2. Primero el examen, luego el registro: completa el mismo alumno.
            await procesar_examen_diagnostico(db, final([
                (FECHA, f"{P}.dos.excel@gmail.com", "1", "luis mora", c2, None, None),
            ]), "trigonometria", PERIODO)
            prov = await alumno(c2)
            prov_id = prov.id
            check("2: el examen crea un provisional", prov.es_provisional, True)
            completado = await repo.create(registro(f"{P}.dos@gmail.com", c2))
            check("2: completa el mismo alumno", completado.id, prov_id)
            check("2: deja de ser provisional y toma el formulario",
                  (completado.es_provisional, completado.usuario.nombre, completado.usuario.apellido_paterno,
                   completado.usuario.correo_personal, completado.ingenieria_id),
                  (False, "Luis", "Mora", f"{P}.dos@gmail.com", 1))
            diag = await db.scalar(select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id == prov_id, ResultadoDiagnostico.periodo == PERIODO))
            check("2: conserva su calificación", diag is not None and diag.puntaje_trigonometria is not None, True)
            email_map, *_ = await load_all_alumnos(db)
            check("2: el correo del Excel lo sigue encontrando", email_map.get(f"{P}.dos.excel@gmail.com"), prov_id)

            # 2b. Coincide con dos provisionales: se completa el de la cuenta.
            await procesar_examen_diagnostico(db, final([
                (FECHA, f"{P}.tres.a@gmail.com", "1", "Eva Tres Sol", c3, None, None),
                (FECHA, f"{P}.tres.b@gmail.com", "1", "Eva Tres", None, f4, None),
            ]), "geometria", PERIODO)
            por_cuenta, por_folio = await alumno(c3), await alumno(folio=f4)
            completado = await repo.create(registro(f"{P}.tres@gmail.com", c3, ("Eva", "Tres", "Sol"), folio=f4))
            check("2b: completa el de la cuenta", completado.id, por_cuenta.id)
            check("2b: el otro sigue provisional", (await db.get(Alumno, por_folio.id)).es_provisional, True)
            par = await db.scalar(select(PosibleDuplicado).where(PosibleDuplicado.alumno_id == por_cuenta.id))
            check("2b: quedan como posible duplicado", par.otro_id if par else None, por_folio.id)

            # 3. Ya registrado (no provisional): no se crea otro.
            for datos, etiqueta in (
                (registro(f"{P}.otro@gmail.com", c1), "cuenta"),
                (registro(f"{P}.uno@gmail.com", c7), "correo"),
            ):
                try:
                    await repo.create(datos)
                    check(f"3: rechaza {etiqueta} repetido", "se creó", MENSAJE_YA_REGISTRADO)
                except HTTPException as exc:
                    check(f"3: rechaza {etiqueta} repetido", (exc.status_code, exc.detail), (409, MENSAJE_YA_REGISTRADO))

            # 4. Ningún dato coincide pero el nombre sí: alumno nuevo + posible duplicado.
            await procesar_examen_diagnostico(db, final([
                (FECHA, f"{P}.sara.excel@gmail.com", "1", "Sara Gil Paz", c6, None, None),
            ]), "calculo", PERIODO)
            sara_prov = await alumno(c6)
            nueva = await repo.create(registro(f"{P}.sara@gmail.com", c7, ("Sara", "Gil", "Paz")))
            check("4: se registra como alumno nuevo", (nueva.id != sara_prov.id, nueva.es_provisional), (True, False))
            par = await db.scalar(select(PosibleDuplicado).where(PosibleDuplicado.alumno_id == nueva.id))
            check("4: posible duplicado con el provisional", par.otro_id if par else None, sara_prov.id)

            casos = await casos_por_revisar(db, PERIODO)
            correos = {f[1] for f in casos["Posibles duplicados"]}
            check("Excel: duplicados de 2b y 4",
                  {f"{P}.tres@gmail.com", f"{P}.tres.b@gmail.com", f"{P}.sara@gmail.com", f"{P}.sara.excel@gmail.com"} <= correos,
                  True)

            # 5. Provisional que entra con su cuenta: no ve resultados hasta completar.
            sara_prov = await db.scalar(
                select(Alumno).options(selectinload(Alumno.usuario)).where(Alumno.id == sara_prov.id))
            try:
                _exigir_datos_completos(sara_prov)
                check("5: bloquea resultados del provisional", "pasó", 403)
            except HTTPException as exc:
                check("5: bloquea resultados del provisional", exc.status_code, 403)
            actualizado = await repo.update(sara_prov, RegistroAlumnoUpdate(
                nombre="Sara", apellido_paterno="Gil", apellido_materno="Paz", ingenieria_id=1,
                tiene_internet=True, tiene_computadora=False, es_foraneo=False, vulnerabilidad_economica=False,
            ))
            check("5: al completar deja de ser provisional", actualizado.es_provisional, False)
        finally:
            await db.rollback()


asyncio.run(prueba_db(), loop_factory=asyncio.SelectorEventLoop)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
