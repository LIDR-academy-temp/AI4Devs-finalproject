"""administración de SAT2: rol de administrador, configuración cifrada y registro de cambios

Revisión: 0004
Anterior: 0003
"""

from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ninguna cuenta existente pasa a ser administradora: el rol se otorga desde el servidor.
    op.add_column('usuario', sa.Column('es_administrador', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    op.create_table('configuracion_sat2',
    sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column('contenido_cifrado', sa.LargeBinary(), nullable=False),
    sa.Column('cargada_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('cargada_por', sa.Uuid(), nullable=True),
    sa.CheckConstraint('id = 1', name=op.f('ck_configuracion_sat2_una_sola_fila')),
    sa.ForeignKeyConstraint(['cargada_por'], ['usuario.id'], name=op.f('fk_configuracion_sat2_cargada_por_usuario'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_configuracion_sat2'))
    )

    op.create_table('cambio_configuracion_sat2',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('ocurrido_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=True),
    sa.Column('email_usuario', sa.String(length=254), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id'], name=op.f('fk_cambio_configuracion_sat2_usuario_id_usuario'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_cambio_configuracion_sat2'))
    )
    op.create_index('ix_cambio_configuracion_sat2_reciente', 'cambio_configuracion_sat2', [sa.literal_column('ocurrido_en DESC')], unique=False)


def downgrade() -> None:
    op.drop_index('ix_cambio_configuracion_sat2_reciente', table_name='cambio_configuracion_sat2')
    op.drop_table('cambio_configuracion_sat2')
    op.drop_table('configuracion_sat2')
    op.drop_column('usuario', 'es_administrador')
