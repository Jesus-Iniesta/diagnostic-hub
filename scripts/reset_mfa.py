"""Quita el MFA de un administrador que perdió su aplicación autenticadora.

Uso (desde la raíz del repo, o dentro del contenedor):
    python scripts/reset_mfa.py correo@dominio.mx

Después podrá entrar solo con su contraseña y volver a configurar MFA.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import update

from app.core.database import async_session
from app.models.user import User


async def main(correo: str) -> int:
    async with async_session() as db:
        res = await db.execute(
            update(User)
            .where((User.correo_personal == correo) | (User.correo_institucional == correo))
            .values(mfa_secret=None)
        )
        await db.commit()
        return res.rowcount


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    loop_factory = asyncio.SelectorEventLoop if sys.platform == "win32" else None
    n = asyncio.run(main(sys.argv[1].strip().lower()), loop_factory=loop_factory)
    print(f"MFA reiniciado para {n} usuario(s).")
