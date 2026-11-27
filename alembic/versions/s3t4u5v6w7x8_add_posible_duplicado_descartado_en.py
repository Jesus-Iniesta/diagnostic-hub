"""add posible_duplicado.descartado_en

Revision ID: s3t4u5v6w7x8
Revises: r2s3t4u5v6w7
"""

import sqlalchemy as sa
from alembic import op

revision = "s3t4u5v6w7x8"
down_revision = "r2s3t4u5v6w7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("posible_duplicado", sa.Column("descartado_en", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("posible_duplicado", "descartado_en")
