import asyncio

import typer

from app.seeds.service import (
    run_all,
    run_seed_permissions,
    run_seed_roles,
    run_seed_users,
)


app = typer.Typer(help="Seeds: Permissions, Roles, Users")


@app.command("all")
def all_():
    counts = asyncio.run(run_all())
    typer.echo(f"All seeds completed: {counts}")


@app.command("permissions")
def permissions():
    n = asyncio.run(run_seed_permissions())
    typer.echo(f"Permissions seed completed ({n} created).")


@app.command("roles")
def roles():
    n = asyncio.run(run_seed_roles())
    typer.echo(f"Roles seed completed ({n} created).")


@app.command("users")
def users():
    n = asyncio.run(run_seed_users())
    typer.echo(f"Users seed completed ({n} created).")


if __name__ == "__main__":
    app()