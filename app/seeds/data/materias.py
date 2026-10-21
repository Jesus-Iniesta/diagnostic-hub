from sqlalchemy import select

from app.models.materia import Materia

MATERIAS_DATA = [
    ("ALG", "Álgebra"),
    ("TRI", "Trigonometría"),
    ("GEO", "Geometría Analítica"),
    ("CAL1", "Cálculo Diferencial"),
    ("CAL3", "Cálculo III"),
]


async def seed_materias(session):
    for clave, nombre in MATERIAS_DATA:
        stmt = select(Materia).where(Materia.clave == clave)
        result = await session.execute(stmt)
        if not result.scalars().first():
            session.add(Materia(clave=clave, nombre=nombre, activo=True))
    await session.commit()
