"""add_alumno_es_provisional

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-10-01 23:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "j4k5l6m7n8o9"
down_revision: Union[str, None] = "i3j4k5l6m7n8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "alumnos",
        sa.Column(
            "es_provisional",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        op.f("ix_alumnos_es_provisional"),
        "alumnos",
        ["es_provisional"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_alumnos_es_provisional"), table_name="alumnos")
    op.drop_column("alumnos", "es_provisional")
