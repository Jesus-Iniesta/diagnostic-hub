import asyncio
import sys

import typer

from app.seeds.service import (
    run_all,
    run_seed_alumnos,
    run_seed_ingenierias,
    run_seed_permissions,
    run_seed_respuestas_diagnostico,
    run_seed_roles,
    run_seed_users,
)


app = typer.Typer(help="Seeds: Permissions, Roles, Users")


def run_async(coro) -> any:
    if sys.platform == "win32":
        return asyncio.run(coro, loop_factory=asyncio.SelectorEventLoop)
    return asyncio.run(coro)


@app.command("all")
def all_():
    counts = run_async(run_all())
    typer.echo(f"All seeds completed: {counts}")


@app.command("permissions")
def permissions():
    n = run_async(run_seed_permissions())
    typer.echo(f"Permissions seed completed ({n} created).")


@app.command("roles")
def roles():
    n = run_async(run_seed_roles())
    typer.echo(f"Roles seed completed ({n} created).")


@app.command("ingenierias")
def ingenierias():
    n = run_async(run_seed_ingenierias())
    typer.echo(f"Ingenierias seed completed ({n} created).")


@app.command("users")
def users():
    n = run_async(run_seed_users())
    typer.echo(f"Users seed completed ({n} created).")


@app.command("alumnos")
def alumnos():
    n = run_async(run_seed_alumnos())
    typer.echo(f"Alumnos seed completed ({n} created).")


@app.command("respuestas-diagnostico")
def respuestas_diagnostico(
    periodo: str = typer.Option("2022B", help="Periodo para las respuestas"),
):
    n = run_async(run_seed_respuestas_diagnostico(periodo))
    typer.echo(f"Respuestas diagnóstico seed completed ({n} created for {periodo}).")


if __name__ == "__main__":
    app()