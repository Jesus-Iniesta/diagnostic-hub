import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.materia import Materia

CLAVE_MAX = 20  # materias.clave es VARCHAR(20)


def _sin_acentos(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in s if not unicodedata.combining(c))


def limpiar_nombre_materia(nombre: str) -> str:
    """Quita espacios extra: '  Cálculo   III ' -> 'Cálculo III'."""
    return " ".join(nombre.split())


def comparar_nombre_materia(nombre: str) -> str:
    """Clave para comparar nombres sin mayúsculas, acentos ni espacios extra."""
    return _sin_acentos(limpiar_nombre_materia(nombre)).casefold()


def clave_desde_nombre(nombre: str) -> str:
    """'Cálculo III' -> 'CALCULO_III'. Lo que no sea letra o número se vuelve '_'."""
    s = _sin_acentos(limpiar_nombre_materia(nombre)).upper()
    s = re.sub(r"[^A-Z0-9]+", "_", s).strip("_")
    return s[:CLAVE_MAX].rstrip("_") or "MATERIA"


def clave_disponible(base: str, ocupadas: set[str]) -> str:
    """Devuelve `base` o, si ya existe, `base_2`, `base_3`... sin pasar de 20."""
    if base not in ocupadas:
        return base
    n = 2
    while True:
        sufijo = f"_{n}"
        clave = base[: CLAVE_MAX - len(sufijo)].rstrip("_") + sufijo
        if clave not in ocupadas:
            return clave
        n += 1


class MateriaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self) -> list[Materia]:
        result = await self.db.execute(
            select(Materia).where(Materia.activo).order_by(Materia.nombre)
        )
        return list(result.scalars().all())

    async def get_by_clave(self, clave: str) -> Materia | None:
        result = await self.db.execute(
            select(Materia).where(Materia.clave == clave)
        )
        return result.scalars().first()

    async def get_or_create_by_nombre(self, nombre: str) -> Materia:
        """Busca la materia por nombre (sin mayúsculas, acentos ni espacios
        extra); si no existe, la crea con una clave generada del nombre."""
        buscado = comparar_nombre_materia(nombre)
        materias = (await self.db.execute(select(Materia).order_by(Materia.id))).scalars().all()
        for materia in materias:
            if comparar_nombre_materia(materia.nombre) == buscado:
                return materia

        clave = clave_disponible(clave_desde_nombre(nombre), {m.clave for m in materias})
        materia = Materia(clave=clave, nombre=limpiar_nombre_materia(nombre), activo=True)
        self.db.add(materia)
        await self.db.flush()
        return materia
