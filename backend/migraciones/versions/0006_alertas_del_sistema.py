"""monitoreo: alertas de los controles de salud

Revisión: 0006
Anterior: 0005
"""

from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('alerta_sistema',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('tipo', sa.String(length=20), nullable=False),
    sa.Column('objeto', sa.String(length=120), server_default=sa.text("''"), nullable=False),
    sa.Column('abierta_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('cerrada_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('detalle', sa.Text(), nullable=False),
    sa.CheckConstraint("tipo IN ('DATOS_VIEJOS', 'CICLOS_FALLIDOS', 'DISCO_CASI_LLENO', 'FUERZA_BRUTA')", name=op.f('ck_alerta_sistema_tipo_valido')),
    sa.CheckConstraint('cerrada_en IS NULL OR cerrada_en >= abierta_en', name=op.f('ck_alerta_sistema_cierra_despues_de_abrir')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_alerta_sistema'))
    )
    op.create_index('ix_alerta_sistema_abierta', 'alerta_sistema', ['tipo', 'objeto'], unique=True, postgresql_where=sa.text('cerrada_en IS NULL'))
    op.create_index('ix_alerta_sistema_reciente', 'alerta_sistema', [sa.literal_column('abierta_en DESC')], unique=False)


def downgrade() -> None:
    op.drop_index('ix_alerta_sistema_reciente', table_name='alerta_sistema')
    op.drop_index('ix_alerta_sistema_abierta', table_name='alerta_sistema', postgresql_where=sa.text('cerrada_en IS NULL'))
    op.drop_table('alerta_sistema')
