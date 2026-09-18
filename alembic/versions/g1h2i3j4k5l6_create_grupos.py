"""create grupos tables

Revision ID: g1h2i3j4k5l6
Revises: c3d4e5f6a7b8
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "grupos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(length=50), nullable=False, index=True),
        sa.Column("ingenieria_id", sa.Integer(), sa.ForeignKey("ingenieria.id"), nullable=False, index=True),
        sa.Column("periodo", sa.String(length=20), nullable=False, index=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "grupo_profesor",
        sa.Column("grupo_id", sa.Integer(), sa.ForeignKey("grupos.id"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
    )

    op.create_table(
        "grupo_alumno",
        sa.Column("grupo_id", sa.Integer(), sa.ForeignKey("grupos.id"), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("alumnos.id"), primary_key=True),
        sa.Column("periodo", sa.String(length=20), nullable=False, primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("grupo_alumno")
    op.drop_table("grupo_profesor")
    op.drop_table("grupos")
