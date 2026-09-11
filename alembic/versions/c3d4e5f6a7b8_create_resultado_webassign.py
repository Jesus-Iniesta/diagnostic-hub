"""create_resultado_webassign

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-10 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resultado_webassign",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alumno_id", sa.Integer(), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("carrera", sa.String(length=10), nullable=False),
        sa.Column("algebra_trabajo", sa.Float(), nullable=True),
        sa.Column("algebra_examen", sa.Float(), nullable=True),
        sa.Column("trigonometria_trabajo", sa.Float(), nullable=True),
        sa.Column("trigonometria_examen", sa.Float(), nullable=True),
        sa.Column("geometria_trabajo", sa.Float(), nullable=True),
        sa.Column("geometria_examen", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["alumno_id"], ["alumnos.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "alumno_id", "periodo",
            name="uq_resultado_webassign_alumno_periodo",
        ),
    )
    op.create_index(
        op.f("ix_resultado_webassign_id"),
        "resultado_webassign",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_resultado_webassign_alumno_id"),
        "resultado_webassign",
        ["alumno_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_resultado_webassign_periodo"),
        "resultado_webassign",
        ["periodo"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_resultado_webassign_periodo"), table_name="resultado_webassign")
    op.drop_index(op.f("ix_resultado_webassign_alumno_id"), table_name="resultado_webassign")
    op.drop_index(op.f("ix_resultado_webassign_id"), table_name="resultado_webassign")
    op.drop_table("resultado_webassign")
