"""Panel de administración: filtros de Alumnos, estado del periodo, usuarios
de personal y cambio de contraseña.

python -m tests.test_panel_admin

Corre contra la base configurada dentro de una transacción con rollback: no se
guarda nada.
"""

import asyncio
import io
from datetime import datetime

import openpyxl
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import async_session
from app.models.user import User

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


PERIODO = "2031B"
FECHA = datetime(2031, 8, 10, 9, 30)
P = "zz.panel"


def final(filas) -> bytes:
    wb = openpyxl.Workbook()
    wb.active.append(["Timestamp", "Email", "Score", "Name", "Cuenta", "Folio", "Hora"] + [f"FA{i}" for i in range(20)])
    for f in filas:
        wb.active.append(list(f) + ["a"] * 20)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def esperar_error(label, coro, status):
    try:
        await coro
        check(label, "sin error", status)
    except HTTPException as exc:
        check(label, exc.status_code, status)


async def prueba_db():
    from app.api.v1 import auth, users
    from app.services import carga_periodo_service as carga
    from app.services.alumnos_admin_service import listar_alumnos

    async with async_session() as db:
        db.commit = db.flush  # nada se guarda
        try:
            # Final Álgebra: uno con cuenta, uno sin cuenta, una fila sin datos.
            await carga.guardar_archivo(db, PERIODO, "final_algebra", "a.xlsx", final([
                (FECHA, f"{P}.a@gmail.com", "1", "Rita Panel Uno", "8799999", None, None),
                (FECHA, f"{P}.b@gmail.com", "1", "Rita Panel Uno", None, None, None),
                (FECHA, None, "1", "Nadie", None, None, None),
            ]))
            estado = await carga.estado_periodo(db, PERIODO)
            check("estado: 1 de 12 subido, sin procesar", (estado["subidos"], estado["total_examenes"], estado["procesado"]), (1, 12, False))

            r = await carga.procesar_archivo(db, PERIODO, "final_algebra")
            check("procesar: detalle de no registrados y corregible",
                  (len(r["no_registrados_detalle"]), r["corregible"]), (1, True))
            estado = await carga.estado_periodo(db, PERIODO)
            check("estado: procesado", estado["procesado"], True)
            check("estado: por revisar (1 pareja de duplicados + 1 sin cuenta + 1 fila)",
                  (estado["por_revisar"]["posibles_duplicados"], estado["por_revisar"]["sin_cuenta"],
                   estado["por_revisar"]["no_registradas"]), (1, 1, 1))
            from app.services.alumnos_admin_service import revision_periodo

            rev = await revision_periodo(db, PERIODO)
            check("revisión: 2 alumnos con examen", rev["alumnos_del_periodo"] >= 2, True)
            mias = [p for p in rev["posibles_duplicados"] if p["alumno"]["correo_personal"].startswith(P)]
            check("revisión: la pareja lado a lado",
                  sorted((mias[0]["alumno"]["correo_personal"], mias[0]["otro"]["correo_personal"])) if mias else None,
                  [f"{P}.a@gmail.com", f"{P}.b@gmail.com"])
            check("revisión: el sin cuenta sale aparte aunque esté en la pareja",
                  any(f["correo_personal"] == f"{P}.b@gmail.com" for f in rev["sin_cuenta"]), True)
            check("estado: por revisar cuenta solo duplicados", estado["por_revisar"]["total"], 1)
            check("estado: CREANI aún no", estado["creani_descargado"], False)
            await carga.marcar_creani_descargado(db, PERIODO)
            check("estado: CREANI descargado", (await carga.estado_periodo(db, PERIODO))["creani_descargado"], True)

            async def filtro(f):
                res = await listar_alumnos(db, busqueda=P, periodo=PERIODO, filtro=f, limit=50, offset=0)
                return sorted(i["correo_personal"] for i in res["items"])

            check("filtro todos", await filtro("todos"), [f"{P}.a@gmail.com", f"{P}.b@gmail.com"])
            check("filtro por revisar", await filtro("por_revisar"), [f"{P}.a@gmail.com", f"{P}.b@gmail.com"])
            check("filtro sin cuenta", await filtro("sin_cuenta"), [f"{P}.b@gmail.com"])
            check("filtro provisionales", await filtro("provisionales"), [f"{P}.a@gmail.com", f"{P}.b@gmail.com"])
            res = await listar_alumnos(db, busqueda=f"{P}.a", periodo=PERIODO, filtro="todos", limit=5, offset=0)
            check("marcas del periodo", res["items"][0]["marcas"], {"algebra": ["Final Álgebra"]})

            # Usuarios de personal.
            admin = await db.scalar(select(User).where(User.correo_personal == "admin@integrativa.test"))
            nuevo = await users.crear_usuario(users.UsuarioPersonalCreate(
                nombre="Pepe", apellido_paterno="Prueba", correo_personal=f"{P}.acr@gmail.com",
                rol="acreditador", password="secreta123"), db, admin)
            check("crear acreditador", (nuevo.role.name, nuevo.activo), ("acreditador", True))
            await esperar_error("profesor sin RFC", users.crear_usuario(users.UsuarioPersonalCreate(
                nombre="Pepe", apellido_paterno="Prueba", correo_personal=f"{P}.prof@gmail.com",
                rol="profesor", password="secreta123"), db, admin), 400)
            await esperar_error("correo repetido", users.crear_usuario(users.UsuarioPersonalCreate(
                nombre="Pepe", apellido_paterno="Prueba", correo_personal=f"{P}.acr@gmail.com",
                rol="acreditador", password="secreta123"), db, admin), 409)
            await esperar_error("rol alumno no", users.crear_usuario(users.UsuarioPersonalCreate(
                nombre="Pepe", apellido_paterno="Prueba", correo_personal=f"{P}.x@gmail.com",
                rol="alumno", password="secreta123"), db, admin), 400)
            editado = await users.editar_usuario(nuevo.id, users.UsuarioPersonalUpdate(activo=False, nombre="José"), db, admin)
            check("desactivar y editar", (editado.activo, editado.nombre), (False, "José"))
            await esperar_error("no desactivarse a sí mismo",
                                users.editar_usuario(admin.id, users.UsuarioPersonalUpdate(activo=False), db, admin), 400)
            lista = await users.list_users(db, None, f"{P}", None, True, 20, 0, admin)
            check("lista solo personal", [u.correo_personal for u in lista.items], [f"{P}.acr@gmail.com"])

            # Cambiar contraseña.
            await esperar_error("contraseña actual incorrecta", auth.cambiar_password(
                auth.CambiarPasswordPayload(actual="mala", nueva="Nueva12345"), db, admin), 400)
            await auth.cambiar_password(auth.CambiarPasswordPayload(actual="Admin123!", nueva="Nueva12345"), db, admin)
            from app.core.security import verify_password
            check("contraseña cambiada", verify_password("Nueva12345", admin.hashed_password), True)
        finally:
            await db.rollback()


asyncio.run(prueba_db(), loop_factory=asyncio.SelectorEventLoop)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
