"""recuperación de huecos: tipo de ejecución RECUPERACION con los días que pidió

Revisión: 0005
Anterior: 0004
"""

from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None

TABLA = 'ejecucion_ingesta'


def _restricciones(tipos: str, con_ventana: str) -> None:
    # op.f: los nombres ya están completos y la convención de nombres no debe volver a armarlos.
    op.drop_constraint(op.f('ck_ejecucion_ingesta_tipo_valido'), TABLA, type_='check')
    op.drop_constraint(op.f('ck_ejecucion_ingesta_ventana_solo_en_cargas'), TABLA, type_='check')
    op.create_check_constraint(op.f('ck_ejecucion_ingesta_tipo_valido'), TABLA, f"tipo IN ({tipos})")
    op.create_check_constraint(
        op.f('ck_ejecucion_ingesta_ventana_solo_en_cargas'),
        TABLA,
        f"tipo IN ({con_ventana}) OR (ventana_desde IS NULL AND ventana_hasta IS NULL)",
    )


def upgrade() -> None:
    _restricciones(
        "'CICLO', 'CARGA_INICIAL', 'RECUPERACION'", "'CARGA_INICIAL', 'RECUPERACION'"
    )


def downgrade() -> None:
    # La restricción anterior no admite este tipo. Las lecturas recuperadas se conservan.
    op.execute("DELETE FROM ejecucion_ingesta WHERE tipo = 'RECUPERACION'")
    _restricciones("'CICLO', 'CARGA_INICIAL'", "'CARGA_INICIAL'")
