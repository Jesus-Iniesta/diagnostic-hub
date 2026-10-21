"""create_posible_duplicado

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-10-21 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "l6m7n8o9p0q1"
down_revision: Union[str, None] = "k5l6m7n8o9p0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "posible_duplicado",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alumno_id", sa.Integer(), nullable=False),
        sa.Column("otro_id", sa.Integer(), nullable=False),
        sa.Column("motivo", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["alumno_id"], ["alumnos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["otro_id"], ["alumnos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_posible_duplicado_id"), "posible_duplicado", ["id"], unique=False)
    op.create_index(
        op.f("ix_posible_duplicado_alumno_id"), "posible_duplicado", ["alumno_id"], unique=False
    )
    op.create_index(
        op.f("ix_posible_duplicado_otro_id"), "posible_duplicado", ["otro_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_posible_duplicado_otro_id"), table_name="posible_duplicado")
    op.drop_index(op.f("ix_posible_duplicado_alumno_id"), table_name="posible_duplicado")
    op.drop_index(op.f("ix_posible_duplicado_id"), table_name="posible_duplicado")
    op.drop_table("posible_duplicado")
