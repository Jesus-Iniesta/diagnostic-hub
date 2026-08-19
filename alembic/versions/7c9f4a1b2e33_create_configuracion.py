"""create_configuracion

Revision ID: 7c9f4a1b2e33
Revises: 39318a879b1d
Create Date: 2026-08-18 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision: str = '7c9f4a1b2e33'
down_revision: Union[str, None] = '39318a879b1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'configuracion',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(length=255), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('key'),
    )
    op.create_index(op.f('ix_configuracion_key'), 'configuracion', ['key'], unique=False)
    op.bulk_insert(
        sa.table(
            'configuracion',
            sa.column('key', sa.String),
            sa.column('value', sa.String),
            sa.column('updated_at', sa.DateTime),
        ),
        [
            {
                'key': 'registro_habilitado',
                'value': 'false',
                'updated_at': datetime.now(),
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_configuracion_key'), table_name='configuracion')
    op.drop_table('configuracion')