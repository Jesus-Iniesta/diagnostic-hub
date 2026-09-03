"""create_resultado_diagnostico_and_respuesta_correcta

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-26 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resultado_diagnostico",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alumno_id", sa.Integer(), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("respuestas_algebra", sa.Text(), nullable=True),
        sa.Column("respuestas_trigonometria", sa.Text(), nullable=True),
        sa.Column("respuestas_geometria", sa.Text(), nullable=True),
        sa.Column("respuestas_calculo", sa.Text(), nullable=True),
        sa.Column("puntaje_algebra", sa.Float(), nullable=True),
        sa.Column("puntaje_trigonometria", sa.Float(), nullable=True),
        sa.Column("puntaje_geometria", sa.Float(), nullable=True),
        sa.Column("puntaje_calculo", sa.Float(), nullable=True),
        sa.Column("promedio_diagnostico", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["alumno_id"], ["alumnos.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alumno_id", "periodo", name="uq_resultado_diagnostico_alumno_periodo"),
    )
    op.create_index(
        op.f("ix_resultado_diagnostico_id"),
        "resultado_diagnostico",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_resultado_diagnostico_alumno_id"),
        "resultado_diagnostico",
        ["alumno_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_resultado_diagnostico_periodo"),
        "resultado_diagnostico",
        ["periodo"],
        unique=False,
    )

    op.create_table(
        "respuesta_correcta_diagnostico",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("materia", sa.String(length=20), nullable=False),
        sa.Column("codigo", sa.String(length=10), nullable=False),
        sa.Column("respuesta_correcta", sa.String(length=1), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "materia", "codigo", "periodo",
            name="uq_respuesta_correcta_materia_codigo_periodo",
        ),
    )
    op.create_index(
        op.f("ix_respuesta_correcta_diagnostico_id"),
        "respuesta_correcta_diagnostico",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_respuesta_correcta_diagnostico_materia"),
        "respuesta_correcta_diagnostico",
        ["materia"],
        unique=False,
    )
    op.create_index(
        op.f("ix_respuesta_correcta_diagnostico_codigo"),
        "respuesta_correcta_diagnostico",
        ["codigo"],
        unique=False,
    )
    op.create_index(
        op.f("ix_respuesta_correcta_diagnostico_periodo"),
        "respuesta_correcta_diagnostico",
        ["periodo"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_respuesta_correcta_diagnostico_periodo"), table_name="respuesta_correcta_diagnostico")
    op.drop_index(op.f("ix_respuesta_correcta_diagnostico_codigo"), table_name="respuesta_correcta_diagnostico")
    op.drop_index(op.f("ix_respuesta_correcta_diagnostico_materia"), table_name="respuesta_correcta_diagnostico")
    op.drop_index(op.f("ix_respuesta_correcta_diagnostico_id"), table_name="respuesta_correcta_diagnostico")
    op.drop_table("respuesta_correcta_diagnostico")

    op.drop_index(op.f("ix_resultado_diagnostico_periodo"), table_name="resultado_diagnostico")
    op.drop_index(op.f("ix_resultado_diagnostico_alumno_id"), table_name="resultado_diagnostico")
    op.drop_index(op.f("ix_resultado_diagnostico_id"), table_name="resultado_diagnostico")
    op.drop_table("resultado_diagnostico")
