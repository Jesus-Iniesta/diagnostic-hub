"""create_identificador_alumno

Revision ID: i3j4k5l6m7n8
Revises: 0581fa768edf
Create Date: 2026-10-01 23:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "i3j4k5l6m7n8"
down_revision: Union[str, None] = "0581fa768edf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "identificador_alumno",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alumno_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=10), nullable=False),
        sa.Column("valor", sa.String(length=255), nullable=False),
        sa.Column("fuente", sa.String(length=60), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["alumno_id"], ["alumnos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tipo", "valor", name="uq_identificador_alumno_tipo_valor"
        ),
    )
    op.create_index(
        op.f("ix_identificador_alumno_id"),
        "identificador_alumno",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_identificador_alumno_alumno_id"),
        "identificador_alumno",
        ["alumno_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_identificador_alumno_alumno_id"), table_name="identificador_alumno"
    )
    op.drop_index(op.f("ix_identificador_alumno_id"), table_name="identificador_alumno")
    op.drop_table("identificador_alumno")
