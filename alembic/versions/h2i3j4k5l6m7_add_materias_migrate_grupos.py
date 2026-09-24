"""add materias and migrate grupos from ingenieria to materia

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-09-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "materias",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("clave", sa.String(length=20), nullable=False, index=True, unique=True),
        sa.Column("nombre", sa.String(length=100), nullable=False, index=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.add_column("grupos", sa.Column("materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=True))
    op.add_column("grupos", sa.Column("nombre_archivo", sa.String(length=200), nullable=True))

    # Insert materias data
    materias_table = sa.table(
        "materias",
        sa.column("id", sa.Integer),
        sa.column("clave", sa.String),
        sa.column("nombre", sa.String),
        sa.column("activo", sa.Boolean),
    )
    op.bulk_insert(materias_table, [
        {"clave": "ALG", "nombre": "Algebra", "activo": True},
        {"clave": "TRI", "nombre": "Trigonometria", "activo": True},
        {"clave": "GEO", "nombre": "Geometria Analitica", "activo": True},
        {"clave": "CAL1", "nombre": "Calculo Diferencial", "activo": True},
        {"clave": "CAL3", "nombre": "Calculo III", "activo": True},
    ])

    # Set all existing grupos to Algebra (default) since there's no way to know
    # the correct materia from ingenieria. Seeds will reassign properly.
    op.execute("UPDATE grupos SET materia_id = (SELECT id FROM materias WHERE clave = 'ALG' LIMIT 1)")

    op.alter_column("grupos", "materia_id", nullable=False)
    op.drop_column("grupos", "ingenieria_id")


def downgrade() -> None:
    op.add_column("grupos", sa.Column("ingenieria_id", sa.Integer(), sa.ForeignKey("ingenieria.id"), nullable=True))
    op.execute("""
        UPDATE grupos SET ingenieria_id = (
            SELECT id FROM ingenieria LIMIT 1
        ) WHERE ingenieria_id IS NULL
    """)
    op.alter_column("grupos", "ingenieria_id", nullable=False)
    op.drop_column("grupos", "nombre_archivo")
    op.drop_column("grupos", "materia_id")
    op.drop_table("materias")
