from sqlalchemy import select

from app.models.materia import Materia

MATERIAS_DATA = [
    ("ALG", "Algebra"),
    ("TRI", "Trigonometria"),
    ("GEO", "Geometria Analitica"),
    ("CAL1", "Calculo Diferencial"),
    ("CAL3", "Calculo III"),
]


async def seed_materias(session):
    for clave, nombre in MATERIAS_DATA:
        stmt = select(Materia).where(Materia.clave == clave)
        result = await session.execute(stmt)
        if not result.scalars().first():
            session.add(Materia(clave=clave, nombre=nombre, activo=True))
    await session.commit()
