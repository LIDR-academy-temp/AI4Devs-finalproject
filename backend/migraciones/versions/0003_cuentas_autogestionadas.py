"""cuentas autogestionadas: datos del registro, enlaces, bandeja de salida y límite por IP

Revisión: 0003
Anterior: 0002
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuario', sa.Column('apellido', sa.String(length=120), nullable=True))
    op.add_column('usuario', sa.Column('organizacion', sa.String(length=160), nullable=True))
    op.add_column('usuario', sa.Column('telefono', sa.String(length=40), nullable=True))
    op.add_column('usuario', sa.Column('localidad', sa.String(length=120), nullable=True))
    op.add_column('usuario', sa.Column('provincia', sa.String(length=60), nullable=True))
    op.add_column('usuario', sa.Column('confirmado_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('usuario', sa.Column('terminos_version', sa.String(length=20), nullable=True))
    op.add_column('usuario', sa.Column('terminos_aceptados_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('usuario', sa.Column('acepta_novedades', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    # Las cuentas creadas por el administrador ya estaban habilitadas: quedan confirmadas.
    op.execute("UPDATE usuario SET confirmado_en = creado_en")

    op.create_table('enlace_cuenta',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('proposito', sa.String(length=14), nullable=False),
    sa.Column('hash_codigo', sa.String(length=64), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('vence_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('usado_en', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("proposito IN ('CONFIRMACION', 'RECUPERO', 'BAJA')", name=op.f('ck_enlace_cuenta_proposito_valido')),
    sa.CheckConstraint('vence_en > creado_en', name=op.f('ck_enlace_cuenta_vence_despues_de_crearse')),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id'], name=op.f('fk_enlace_cuenta_usuario_id_usuario'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_enlace_cuenta')),
    sa.UniqueConstraint('hash_codigo', name=op.f('uq_enlace_cuenta_hash_codigo'))
    )
    op.create_index('ix_enlace_cuenta_usuario_proposito', 'enlace_cuenta', ['usuario_id', 'proposito'], unique=False)

    op.create_table('correo_saliente',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('tipo', sa.String(length=30), nullable=False),
    sa.Column('destinatario', sa.String(length=254), nullable=False),
    sa.Column('asunto', sa.String(length=200), nullable=True),
    sa.Column('cuerpo_texto', sa.Text(), nullable=True),
    sa.Column('cuerpo_html', sa.Text(), nullable=True),
    sa.Column('cabeceras', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('intentos', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('proximo_intento_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('enviado_en', sa.DateTime(timezone=True), nullable=True),
    sa.Column('descartado_en', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint('intentos >= 0', name=op.f('ck_correo_saliente_intentos_no_negativos')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_correo_saliente'))
    )
    op.create_index('ix_correo_saliente_reciente', 'correo_saliente', ['destinatario', 'tipo', 'creado_en'], unique=False)
    op.create_index('ix_correo_saliente_pendiente', 'correo_saliente', ['proximo_intento_en'], unique=False, postgresql_where=sa.text('enviado_en IS NULL AND descartado_en IS NULL'))

    op.create_table('limite_ip',
    sa.Column('clave', sa.String(length=120), nullable=False),
    sa.Column('ventana_inicio', sa.DateTime(timezone=True), nullable=False),
    sa.Column('cantidad', sa.Integer(), nullable=False),
    sa.CheckConstraint('cantidad > 0', name=op.f('ck_limite_ip_cantidad_positiva')),
    sa.PrimaryKeyConstraint('clave', 'ventana_inicio', name=op.f('pk_limite_ip'))
    )


def downgrade() -> None:
    op.drop_table('limite_ip')
    op.drop_index('ix_correo_saliente_pendiente', table_name='correo_saliente', postgresql_where=sa.text('enviado_en IS NULL AND descartado_en IS NULL'))
    op.drop_index('ix_correo_saliente_reciente', table_name='correo_saliente')
    op.drop_table('correo_saliente')
    op.drop_index('ix_enlace_cuenta_usuario_proposito', table_name='enlace_cuenta')
    op.drop_table('enlace_cuenta')
    for columna in (
        'acepta_novedades', 'terminos_aceptados_en', 'terminos_version', 'confirmado_en',
        'provincia', 'localidad', 'telefono', 'organizacion', 'apellido',
    ):
        op.drop_column('usuario', columna)
