"""Registro automático en las subidas, carga completa del periodo, unir alumnos
y el Excel "Alumnos por revisar".

python -m tests.test_registro_automatico

La primera parte no necesita base de datos. La segunda corre contra la base
configurada dentro de una transacción con rollback: no se guarda nada.
"""

import asyncio
import io
from datetime import datetime

import openpyxl
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session
from app.models.alumno import Alumno
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.resultado_webassign import ResultadoWebAssign
from app.models.user import User
from app.services.carga_periodo_service import decidir_union
from app.services.unir_alumnos_service import nombres_compatibles

FALLOS: list[str] = []


def check(label: str, got, expected):
    if got != expected:
        FALLOS.append(f"{label}: esperado {expected!r}, obtuve {got!r}")
    else:
        print(f"ok  {label}: {got!r}")


# ── Reglas sin base de datos ─────────────────────────────────────
check("nombres: mismo en otro orden", nombres_compatibles("Ana Ruiz Paz", "Ruiz Paz, Ana"), True)
check("nombres: uno contiene al otro", nombres_compatibles("Ana Ruiz", "Ana Ruiz Paz"), True)
check("nombres: uno vacío", nombres_compatibles("", "Ana Ruiz"), True)
check("nombres: distintos", nombres_compatibles("Ana Ruiz", "Beto Lara"), False)


def det(nombre, provisional=True, periodo="2031B"):
    return {"nombre": nombre, "provisional": provisional, "periodo_ingreso": periodo}


D = {
    1: det("Ana Ruiz"), 2: det(""), 3: det("Ana Ruiz", provisional=False),
    4: det("Beto Lara"), 5: det("Ana Ruiz", periodo="2030B"), 6: det("Ana Ruiz", provisional=False),
}
check("unión: dos provisionales, se queda el más antiguo", decidir_union([2, 1], D, "2031B"), 1)
check("unión: se queda el del padrón", decidir_union([1, 3], D, "2031B"), 3)
check("unión: dos del padrón no", decidir_union([3, 6], D, "2031B"), None)
check("unión: nombres distintos no", decidir_union([1, 4], D, "2031B"), None)
check("unión: otro periodo no", decidir_union([1, 5], D, "2031B"), None)
check("unión: uno solo no", decidir_union([1], D, "2031B"), None)


# ── Contra la base, en una transacción con rollback ──────────────
PERIODO = "2031B"
FECHA = datetime(2031, 8, 10, 9, 30)
P = "zz.auto"


def xlsx(filas) -> bytes:
    wb = openpyxl.Workbook()
    for f in filas:
        wb.active.append(list(f))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def cuestionario(filas) -> bytes:
    codigos = [f"{letra}{n}" for letra in "ATGC" for n in range(1, 11)]
    enc = ["Marca temporal", "Dirección de correo electrónico", "Puntuación", "Folio",
           "Número de cuenta", "Usuario", "Nombre completo"] + [f"Pregunta ({c})" for c in codigos]
    return xlsx([enc] + [list(f) + ["a"] * len(codigos) for f in filas])


def final(filas) -> bytes:
    enc = ["Timestamp", "Email", "Score", "Name", "Cuenta", "Folio", "Hora"] + [f"FA{i}" for i in range(20)]
    return xlsx([enc] + [list(f) + ["a"] * 20 for f in filas])


def webassign(filas) -> bytes:
    cab = [["Reporte"], ["Profe, Uno"]] + [["x"] for _ in range(7)]
    return xlsx(cab + [[n, e] + [None] * 5 + [1] * 18 for n, e in filas])


async def prueba_db():
    from app.services import carga_periodo_service as carga
    from app.services.alumnos_admin_service import (
        DatosAlumnoError, actualizar_datos, casos_por_revisar, generar_excel_por_revisar,
    )
    from app.services.unir_alumnos_service import unir_alumnos

    async with async_session() as db:
        db.commit = db.flush  # nada se guarda
        try:
            ocupadas = set((await db.execute(select(Alumno.numero_cuenta))).scalars())
            libres = (c for c in (f"{n:07d}" for n in range(8999999, 8000000, -1)) if c not in ocupadas)
            c_ana, c_ana2, c_beto = next(libres), next(libres), next(libres)
            folio_ana = "2031" + c_ana[2:]

            async def subir(examen, contenido):
                await carga.guardar_archivo(db, PERIODO, examen, f"{examen}.xlsx", contenido)
                return await carga.procesar_archivo(db, PERIODO, examen)

            # Cuestionario 1: Ana con correo y folio; una fila sin datos.
            r = await subir("cuestionario_1", cuestionario([
                (FECHA, f"{P}.ana@gmail.com", "1", folio_ana, None, "ICO_005", "Ana Ruiz Paz"),
                (FECHA, None, "1", None, None, None, "Sin Datos Nadie"),
            ]))
            check("C1: registrados nuevos", (r["encontrados"], r["registrados_nuevos"], r["no_registrados"]), (0, 1, 1))
            ana = await db.scalar(
                select(Alumno).options(selectinload(Alumno.ingenieria)).where(Alumno.numero_folio == folio_ana)
            )
            check("C1: Ana provisional con ICO, lugar y nombre",
                  (ana.es_provisional, ana.ingenieria.clave if ana.ingenieria else None, ana.lugar_admision,
                   (await db.get(User, ana.usuario_id)).nombre), (True, "ICO", 5, "Ana Ruiz Paz"))

            # Final Álgebra: Ana por correo (aprende cuenta); "Ana" con otro correo
            # y otra cuenta se registra aparte, sin ingeniería.
            r = await subir("final_algebra", final([
                (FECHA, f"{P}.ana@gmail.com", "1", "Ana Ruiz Paz", c_ana, None, None),
                (FECHA, f"{P}.ana.otro@gmail.com", "1", "Ruiz Paz Ana", c_ana2, None, None),
                (FECHA, f"{P}.beto@gmail.com", "1", "Beto Lara Sol", c_beto, None, None),
                (FECHA, None, "1", "Sin Datos Nadie", None, None, None),
            ]))
            check("Final: encontrados / nuevos / no registrados",
                  (r["encontrados"], r["registrados_nuevos"], r["no_registrados"]), (1, 2, 1))
            check("Final: Ana completa su cuenta", ana.numero_cuenta, c_ana)
            ana2 = await db.scalar(select(Alumno).where(Alumno.numero_cuenta == c_ana2))
            beto = await db.scalar(select(Alumno).where(Alumno.numero_cuenta == c_beto))
            check("Final: nuevo sin ingeniería", (ana2.ingenieria_id, beto.ingenieria_id), (None, None))

            # WebAssign ICI: Beto por correo -> toma la carrera; Caro nueva.
            r = await subir("webassign_ICI", webassign([
                ("Lara Sol, Beto", f"{P}.beto@gmail.com"),
                ("Vega, Caro", f"{P}.caro@gmail.com"),
                ("Sin Correo, Dany", None),
            ]))
            check("WebAssign: encontrados / nuevos / no registrados",
                  (r["encontrados"], r["registrados_nuevos"], r["no_registrados"]), (1, 1, 1))
            await db.refresh(beto, ["ingenieria"])
            check("WebAssign: Beto completa ingeniería", beto.ingenieria.clave, "ICI")

            # Final Trigonometría: una fila con el correo de Ana y la cuenta de "Ana 2"
            # -> la segunda vuelta las junta.
            await carga.guardar_archivo(db, PERIODO, "final_trigonometria", "t.xlsx", final([
                (FECHA, f"{P}.ana@gmail.com", "1", "Ana Ruiz Paz", c_ana2, None, None),
            ]))
            ana_id, ana2_id = ana.id, ana2.id
            j = await carga.juntar_repetidos(db, PERIODO)
            check("Segunda vuelta: 1 alumno juntado", j["juntados"], 1)
            check("Segunda vuelta: Ana 2 ya no existe", await db.get(Alumno, ana2_id), None)
            diag = await db.scalar(select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id == ana_id, ResultadoDiagnostico.periodo == PERIODO))
            check("Segunda vuelta: resultado de Álgebra de Ana", diag.puntaje_algebra is not None, True)

            # Procesar otra vez no duplica nada.
            antes = (await db.execute(select(Alumno.id))).scalars().all()
            for examen in ("cuestionario_1", "final_algebra", "final_trigonometria", "webassign_ICI"):
                r = await carga.procesar_archivo(db, PERIODO, examen)
                check(f"2ª vuelta {examen}: sin nuevos", r["registrados_nuevos"], 0)
            despues = (await db.execute(select(Alumno.id))).scalars().all()
            check("2ª vuelta: mismos alumnos", len(despues), len(antes))

            # Editar: la cuenta de Beto ya es de Ana.
            try:
                await actualizar_datos(db, beto.id, numero_cuenta=c_ana, numero_folio=None, ingenieria_id=None)
                check("Editar: cuenta repetida rechazada", "guardó", "error")
            except DatosAlumnoError as exc:
                check("Editar: dice quién la tiene", "Ana Ruiz Paz" in str(exc), True)

            # Unir a mano: Caro dentro de Beto.
            caro = await db.scalar(select(Alumno).join(User).where(User.correo_personal == f"{P}.caro@gmail.com"))
            caro_id = caro.id
            await unir_alumnos(db, beto.id, caro_id)
            wa = (await db.execute(select(ResultadoWebAssign).where(
                ResultadoWebAssign.alumno_id == beto.id, ResultadoWebAssign.periodo == PERIODO))).scalars().all()
            check("Unir: Beto tiene un solo WebAssign", len(wa), 1)
            check("Unir: Caro borrado", await db.get(Alumno, caro_id), None)
            from app.services.upload_diagnostico_service import load_all_alumnos
            email_map, *_ = await load_all_alumnos(db)
            check("Unir: el correo de Caro encuentra a Beto", email_map.get(f"{P}.caro@gmail.com"), beto.id)

            # Excel por revisar.
            casos = await casos_por_revisar(db, PERIODO)
            no_reg = casos["No se pudieron registrar"]
            check("Por revisar: no registrados con su examen",
                  sorted((f[0], f[5]) for f in no_reg),
                  [("Sin Correo, Dany", "WebAssign ICI"), ("Sin Datos Nadie", "Cuestionario 1"),
                   ("Sin Datos Nadie", "Final Álgebra")])
            check("Por revisar: nadie sin cuenta del periodo", [f[0] for f in casos["Sin cuenta"]], [])
            check("Excel se genera", generar_excel_por_revisar(casos)[:2], b"PK")
        finally:
            await db.rollback()


asyncio.run(prueba_db(), loop_factory=asyncio.SelectorEventLoop)

if FALLOS:
    print("\nFALLARON:", len(FALLOS))
    for f in FALLOS:
        print(" -", f)
    raise SystemExit(1)
print("\nTodas las pruebas pasaron")
