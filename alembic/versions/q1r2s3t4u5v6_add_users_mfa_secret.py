"""add users.mfa_secret

Revision ID: q1r2s3t4u5v6
Revises: p0q1r2s3t4u5
"""

import sqlalchemy as sa
from alembic import op

revision = "q1r2s3t4u5v6"
down_revision = "p0q1r2s3t4u5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mfa_secret", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "mfa_secret")
