"""create resultado_cuestionario_diagnostico

Revision ID: 0581fa768edf
Revises: h2i3j4k5l6m7
Create Date: 2026-09-24 15:14:13.307860

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0581fa768edf"
down_revision: Union[str, None] = "h2i3j4k5l6m7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resultado_cuestionario_diagnostico",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alumno_id", sa.Integer(), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("aciertos_c1_algebra", sa.Integer(), nullable=True),
        sa.Column("aciertos_c1_trigonometria", sa.Integer(), nullable=True),
        sa.Column("aciertos_c1_geometria", sa.Integer(), nullable=True),
        sa.Column("aciertos_c1_calculo", sa.Integer(), nullable=True),
        sa.Column("aciertos_c2_algebra", sa.Integer(), nullable=True),
        sa.Column("aciertos_c2_trigonometria", sa.Integer(), nullable=True),
        sa.Column("aciertos_c2_geometria", sa.Integer(), nullable=True),
        sa.Column("aciertos_c2_calculo", sa.Integer(), nullable=True),
        sa.Column("respuestas_c1", sa.Text(), nullable=True),
        sa.Column("respuestas_c2", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["alumno_id"], ["alumnos.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "alumno_id",
            "periodo",
            name="uq_resultado_cuestionario_alumno_periodo",
        ),
    )
    op.create_index(
        op.f("ix_resultado_cuestionario_diagnostico_id"),
        "resultado_cuestionario_diagnostico",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_resultado_cuestionario_diagnostico_alumno_id"),
        "resultado_cuestionario_diagnostico",
        ["alumno_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_resultado_cuestionario_diagnostico_periodo"),
        "resultado_cuestionario_diagnostico",
        ["periodo"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_resultado_cuestionario_diagnostico_periodo"),
        table_name="resultado_cuestionario_diagnostico",
    )
    op.drop_index(
        op.f("ix_resultado_cuestionario_diagnostico_alumno_id"),
        table_name="resultado_cuestionario_diagnostico",
    )
    op.drop_index(
        op.f("ix_resultado_cuestionario_diagnostico_id"),
        table_name="resultado_cuestionario_diagnostico",
    )
    op.drop_table("resultado_cuestionario_diagnostico")