"""estaciones inactivas y naturaleza de la base

Revisión: 0002
Anterior: 0001
"""

from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('estacion', sa.Column('inactiva_desde', sa.DateTime(timezone=True), nullable=True))
    # Ninguna versión anterior inactivaba estaciones, pero si hubiera alguna, queda fechada hoy.
    op.execute("UPDATE estacion SET inactiva_desde = now() WHERE NOT activa")
    op.create_check_constraint(
        op.f('ck_estacion_inactiva_con_fecha'), 'estacion', 'activa = (inactiva_desde IS NULL)'
    )
    op.create_table('configuracion_base',
    sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column('naturaleza', sa.String(length=16), nullable=False),
    sa.Column('fijada_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('id = 1', name=op.f('ck_configuracion_base_una_sola_fila')),
    sa.CheckConstraint("naturaleza IN ('REAL', 'FICTICIA', 'COPIA_DE_PRUEBA')", name=op.f('ck_configuracion_base_naturaleza_valida')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_configuracion_base'))
    )


def downgrade() -> None:
    op.drop_table('configuracion_base')
    op.drop_constraint(op.f('ck_estacion_inactiva_con_fecha'), 'estacion', type_='check')
    op.drop_column('estacion', 'inactiva_desde')
