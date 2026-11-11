"""Vacía los datos de alumnos de la base, conservando el catálogo y los seeds.

Deja la base como recién sembrada (roles, permisos, ingenierías, materias,
configuración, respuestas correctas y los usuarios demo de administración,
profesores y acreditación) pero sin alumnos, resultados, identificadores,
archivos de carga, filas no registradas ni grupos.

Uso (desde la raíz del repo):
    python scripts/limpar_base.py --yes

Opciones:
    --db-url URL        URL de la base (default: la de .env).
    --db-name NOMBRE    Nombre esperado de la base; si no coincide, aborta
                        (default: tutonet_prueba).
    --dry-run           Solo muestra qué se va a borrar, no cambia nada.
    --yes               Confirma la ejecución. Sin esto solo se informa.

Lo que se borra:
    alumnos, usuarios con rol "alumno", resultados (diagnóstico, WebAssign y
    cuestionario), identificadores, archivos de la carga (archivo_periodo),
    filas no registradas, grupos y sus Associations, posibles duplicados y los
    exámenes/módulos/asignaciones derivados.

Lo que se conserva:
    role, permission, role_permissions, ingenieria, materias, configuracion,
    respuesta_correcta_diagnostico y los usuarios demo (administrador,
    profesores, acreditador).
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

# Tablas que se vacían por completo (hijas antes que padres).
TABLAS_VACIAR = [
    "resultado_diagnostico",
    "resultado_webassign",
    "resultado_cuestionario_diagnostico",
    "identificador_alumno",
    "archivo_periodo",
    "fila_no_registrada",
    "grupo_alumno",
    "grupo_profesor",
    "grupos",
    "posible_duplicado",
    "asignacion_examen",
    "intento_presentacion",
    "asignacion_modulo",
    "feedback_resultado",
    "examenes",
    "modulos",
    "preguntas",
    "liga_examen_diagnostico",
    "alumnos",
]

# Tablas que se conservan (solo se reportan).
TABLAS_CONSERVAR = [
    "role",
    "permission",
    "role_permissions",
    "ingenieria",
    "materias",
    "configuracion",
    "respuesta_correcta_diagnostico",
    "users",
]


def _url_base(url: str) -> str:
    return url.rsplit("/", 1)[-1].split("?", 1)[0]


async def _contar(conn, tabla: str) -> int:
    return (await conn.execute(text(f'SELECT count(*) FROM "{tabla}"'))).scalar()


async def _limpiar(url: str, dry_run: bool) -> None:
    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            db_actual = (await conn.execute(text("SELECT current_database()"))).scalar()
            print(f"Base de datos: {db_actual}")

            print("\nEstado actual:")
            for tabla in TABLAS_VACIAR:
                print(f"  se borra   {tabla}: {await _contar(conn, tabla)}")
            for tabla in TABLAS_CONSERVAR:
                print(f"  se conserva {tabla}: {await _contar(conn, tabla)}")

            # Usuarios que son alumnos (por rol o por tener un alumno asociado).
            ids_alumno = [
                r[0]
                for r in (
                    await conn.execute(
                        text(
                            """
                            SELECT u.id FROM users u
                            WHERE u.role_id = (SELECT id FROM role WHERE name = 'alumno')
                            UNION
                            SELECT a.usuario_id FROM alumnos a
                            """
                        )
                    )
                ).all()
            ]

            if dry_run:
                print(f"\n--dry-run: se borrarían {len(ids_alumno)} usuarios de alumnos.")
                return

            # Hijas primero; CASCADE solo alcanza a tablas de esta misma lista.
            tablas = ", ".join(f'"{t}"' for t in TABLAS_VACIAR)
            await conn.execute(text(f"TRUNCATE {tablas} RESTART IDENTITY CASCADE"))

            if ids_alumno:
                await conn.execute(
                    text("DELETE FROM users WHERE id = ANY(:ids)"), {"ids": ids_alumno}
                )

            # La secuencia de alumnos ya quedó en 1 con RESTART IDENTITY; la de
            # usuarios debe continuar después del último id conservado.
            await conn.execute(
                text(
                    "SELECT setval("
                    "  pg_get_serial_sequence('users', 'id'),"
                    "  GREATEST((SELECT coalesce(max(id), 1) FROM users), 1)"
                    ")"
                )
            )

            print("\nResultado:")
            for tabla in TABLAS_VACIAR:
                n = await _contar(conn, tabla)
                print(f"  {tabla}: {n}")
            for tabla in TABLAS_CONSERVAR:
                print(f"  {tabla}: {await _contar(conn, tabla)}")

            total_alumnos = await _contar(conn, "alumnos")
            print(f"\nAlumnos restantes: {total_alumnos}")
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-url", default=None, help="URL de BD (default: .env)")
    parser.add_argument("--db-name", default="tutonet_prueba", help="Base esperada")
    parser.add_argument("--dry-run", action="store_true", help="Solo informa")
    parser.add_argument("--yes", action="store_true", help="Confirma la ejecución")
    args = parser.parse_args()

    if args.db_url:
        url = args.db_url
    else:
        from app.core.config import settings

        url = settings.database_url

    if _url_base(url) != args.db_name:
        print(
            f"ERROR: la base configurada es '{_url_base(url)}' y se esperaba "
            f"'{args.db_name}'. Usa --db-url o --db-name.",
            file=sys.stderr,
        )
        return 1

    if not args.yes and not args.dry_run:
        print("Falta --yes para ejecutar. Usa --dry-run para solo ver el plan.")
        return 1

    asyncio.run(_limpiar(url, args.dry_run), loop_factory=asyncio.SelectorEventLoop)
    return 0


if __name__ == "__main__":
    sys.exit(main())
