"""Borra resultados del examen final guardados en un periodo que no es el del alumno.

Antes del 2026-10-01 la carga del examen final no revisaba el periodo de ingreso
del alumno, así que el mismo archivo pudo quedar guardado en varios periodos
(p. ej. el final de la generación 2022B también en 2024B y 2026B). Esas copias
hacen que los alumnos del periodo aparezcan sin examen final y que otros, de otra
generación, aparezcan con final pero sin diagnóstico ni WebAssign.

La carga actual ya omite esas filas (decidir_periodo_fila: "registro del
alumno"); este script aplica la misma regla a lo que ya está guardado:
se borra el resultado si el alumno tiene un periodo de ingreso válido
(AAAAA/AAAAB) y es distinto del periodo del resultado. Los alumnos sin periodo
de ingreso válido no se tocan.

Uso (desde la raíz del repo):
    python scripts/limpiar_finales_fuera_de_periodo.py --dry-run
    python scripts/limpiar_finales_fuera_de_periodo.py --yes

Opciones:
    --db-url URL        URL de la base (default: la de .env).
    --db-name NOMBRE    Nombre esperado de la base; si no coincide, aborta
                        (default: integrativa).
    --periodo PERIODO   Solo limpia ese periodo (p. ej. 2026B).
    --dry-run           Solo muestra qué se va a borrar, no cambia nada.
    --yes               Confirma la ejecución. Sin esto solo se informa.
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

# Resultados finales cuyo periodo no es el de ingreso (válido) del alumno.
FUERA_DE_PERIODO = """
    FROM resultado_diagnostico r
    JOIN alumnos a ON a.id = r.alumno_id
    WHERE upper(a.periodo_ingreso) ~ '^[0-9]{4}[AB]$'
      AND upper(r.periodo) <> upper(a.periodo_ingreso)
      AND (CAST(:periodo AS text) IS NULL OR upper(r.periodo) = upper(CAST(:periodo AS text)))
"""


def _url_base(url: str) -> str:
    return url.rsplit("/", 1)[-1].split("?", 1)[0]


async def _limpiar(url: str, periodo: str | None, dry_run: bool) -> None:
    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            print(f"Base de datos: {(await conn.execute(text('SELECT current_database()'))).scalar()}")
            filas = (
                await conn.execute(
                    text(
                        "SELECT r.periodo, a.periodo_ingreso, count(*) "
                        + FUERA_DE_PERIODO
                        + " GROUP BY 1, 2 ORDER BY 1, 2"
                    ),
                    {"periodo": periodo},
                )
            ).all()
            total = sum(n for *_, n in filas)
            print("\nResultados del examen final fuera del periodo del alumno:")
            for periodo_resultado, ingreso, n in filas:
                print(f"  guardado en {periodo_resultado}, alumno de {ingreso}: {n}")
            print(f"  total: {total}")

            if dry_run or total == 0:
                print("\n--dry-run: no se borró nada." if dry_run else "\nNada que borrar.")
                return

            borrados = (
                await conn.execute(
                    text(
                        "DELETE FROM resultado_diagnostico WHERE id IN (SELECT r.id "
                        + FUERA_DE_PERIODO
                        + ")"
                    ),
                    {"periodo": periodo},
                )
            ).rowcount
            print(f"\nBorrados: {borrados}")
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-url", default=None, help="URL de BD (default: .env)")
    parser.add_argument("--db-name", default="integrativa", help="Base esperada")
    parser.add_argument("--periodo", default=None, help="Solo este periodo (p. ej. 2026B)")
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

    asyncio.run(_limpiar(url, args.periodo, args.dry_run), loop_factory=asyncio.SelectorEventLoop)
    return 0


if __name__ == "__main__":
    sys.exit(main())
