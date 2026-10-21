"""registro_automatico_y_carga_periodo

Alumnos registrados desde los archivos de exámenes (ingeniería y correo
opcionales), archivos guardados por periodo y filas que no se pudieron
registrar.

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-10-20 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "k5l6m7n8o9p0"
down_revision: Union[str, None] = "j4k5l6m7n8o9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("alumnos", "ingenieria_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("users", "correo_personal", existing_type=sa.String(), nullable=True)

    op.create_table(
        "archivo_periodo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("examen", sa.String(length=30), nullable=False),
        sa.Column("nombre_archivo", sa.String(length=255), nullable=False),
        sa.Column("contenido", sa.LargeBinary(), nullable=False),
        sa.Column("subido_en", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("periodo", "examen", name="uq_archivo_periodo_periodo_examen"),
    )
    op.create_index(op.f("ix_archivo_periodo_id"), "archivo_periodo", ["id"], unique=False)
    op.create_index(
        op.f("ix_archivo_periodo_periodo"), "archivo_periodo", ["periodo"], unique=False
    )

    op.create_table(
        "fila_no_registrada",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("periodo", sa.String(length=10), nullable=False),
        sa.Column("examen", sa.String(length=30), nullable=False),
        sa.Column("indice", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=255), nullable=True),
        sa.Column("ingenieria", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_fila_no_registrada_id"), "fila_no_registrada", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_fila_no_registrada_periodo"), "fila_no_registrada", ["periodo"], unique=False
    )
    op.create_index(
        op.f("ix_fila_no_registrada_examen"), "fila_no_registrada", ["examen"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_fila_no_registrada_examen"), table_name="fila_no_registrada")
    op.drop_index(op.f("ix_fila_no_registrada_periodo"), table_name="fila_no_registrada")
    op.drop_index(op.f("ix_fila_no_registrada_id"), table_name="fila_no_registrada")
    op.drop_table("fila_no_registrada")
    op.drop_index(op.f("ix_archivo_periodo_periodo"), table_name="archivo_periodo")
    op.drop_index(op.f("ix_archivo_periodo_id"), table_name="archivo_periodo")
    op.drop_table("archivo_periodo")
    # Solo se puede volver atrás si ningún alumno quedó sin ingeniería o sin correo.
    op.alter_column("users", "correo_personal", existing_type=sa.String(), nullable=False)
    op.alter_column("alumnos", "ingenieria_id", existing_type=sa.Integer(), nullable=False)
