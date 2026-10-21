"""grupo.materia_nombre y acentos en las materias base

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
"""

import sqlalchemy as sa

from alembic import op

revision = "o9p0q1r2s3t4"
down_revision = "n8o9p0q1r2s3"
branch_labels = None
depends_on = None

# Materias del seed que se guardaron sin acentos.
ACENTOS = [
    ("ALG", "Algebra", "Álgebra"),
    ("TRI", "Trigonometria", "Trigonometría"),
    ("GEO", "Geometria Analitica", "Geometría Analítica"),
    ("CAL1", "Calculo Diferencial", "Cálculo Diferencial"),
    ("CAL3", "Calculo III", "Cálculo III"),
]


def upgrade() -> None:
    # Nombre de la materia tal como lo escribió el profesor al crear el grupo.
    op.add_column("grupos", sa.Column("materia_nombre", sa.String(100), nullable=True))
    materias = sa.table("materias", sa.column("clave", sa.String), sa.column("nombre", sa.String))
    for clave, sin, con in ACENTOS:
        op.execute(
            materias.update()
            .where((materias.c.clave == clave) & (materias.c.nombre == sin))
            .values(nombre=con)
        )


def downgrade() -> None:
    materias = sa.table("materias", sa.column("clave", sa.String), sa.column("nombre", sa.String))
    for clave, sin, con in ACENTOS:
        op.execute(
            materias.update()
            .where((materias.c.clave == clave) & (materias.c.nombre == con))
            .values(nombre=sin)
        )
    op.drop_column("grupos", "materia_nombre")
