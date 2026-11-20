"""create resultado_asistencia

Revision ID: r2s3t4u5v6w7
Revises: q1r2s3t4u5v6
"""

import sqlalchemy as sa
from alembic import op

revision = "r2s3t4u5v6w7"
down_revision = "q1r2s3t4u5v6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "resultado_asistencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("alumnos.id"), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("porcentaje", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("alumno_id", "periodo", name="uq_resultado_asistencia_alumno_periodo"),
    )
    op.create_index("ix_resultado_asistencia_id", "resultado_asistencia", ["id"])
    op.create_index("ix_resultado_asistencia_alumno_id", "resultado_asistencia", ["alumno_id"])
    op.create_index("ix_resultado_asistencia_periodo", "resultado_asistencia", ["periodo"])


def downgrade() -> None:
    op.drop_table("resultado_asistencia")
