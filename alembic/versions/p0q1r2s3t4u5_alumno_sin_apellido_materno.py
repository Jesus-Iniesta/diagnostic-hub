"""alumno.sin_apellido_materno

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
"""

import sqlalchemy as sa

from alembic import op

revision = "p0q1r2s3t4u5"
down_revision = "o9p0q1r2s3t4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # El alumno marcó "Solo tengo un apellido": su apellido materno va vacío.
    op.add_column(
        "alumnos",
        sa.Column(
            "sin_apellido_materno", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("alumnos", "sin_apellido_materno")
