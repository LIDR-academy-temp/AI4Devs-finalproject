"""Initial schema: identity, masters, campaigns, purchase orders, DSP mappings

Revision ID: a7cfba21a0e9
Revises:
Create Date: 2026-10-17 21:12:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'a7cfba21a0e9'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Identity tables (created first, required by authorization)
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('full_name', sa.String(length=200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=32), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('user_roles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    # Master data tables
    op.create_table('holding_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('agencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('holding_group_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['holding_group_id'], ['holding_groups.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_agencies_holding_group_id', 'agencies', ['holding_group_id'])

    op.create_table('advertisers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('dsps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('channels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('formats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('campaign_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('sectors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('sales_reps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Purchase order tables (before campaigns that reference them)
    op.create_table('purchase_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_reference', sa.String(), nullable=False),
        sa.Column('received_on', sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_reference')
    )

    op.create_table('purchase_order_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('purchase_order_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('issued_on', sa.Date(), nullable=False),
        sa.Column('revision_reason', sa.String(), nullable=True),
        sa.Column('is_in_force', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_purchase_order_versions_purchase_order_id', 'purchase_order_versions', ['purchase_order_id'])

    # Campaign tree tables
    op.create_table('campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('advertiser_id', sa.Integer(), nullable=False),
        sa.Column('purchase_order_id', sa.Integer(), nullable=True),
        sa.Column('campaign_type_id', sa.Integer(), nullable=False),
        sa.Column('sector_id', sa.Integer(), nullable=False),
        sa.Column('sales_rep_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(['advertiser_id'], ['advertisers.id']),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id']),
        sa.ForeignKeyConstraint(['campaign_type_id'], ['campaign_types.id']),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id']),
        sa.ForeignKeyConstraint(['sales_rep_id'], ['sales_reps.id']),
        sa.ForeignKeyConstraint(['sector_id'], ['sectors.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_campaigns_agency_id', 'campaigns', ['agency_id'])

    op.create_table('campaign_periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='open'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_campaign_periods_campaign_id', 'campaign_periods', ['campaign_id'])

    # Create enum type for scope
    scope_enum = sa.Enum('national', 'international', name='scope_enum', create_type=True)

    op.create_table('campaign_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_period_id', sa.Integer(), nullable=False),
        sa.Column('purchase_order_version_id', sa.Integer(), nullable=True),
        sa.Column('dsp_id', sa.Integer(), nullable=False),
        sa.Column('channel_id', sa.Integer(), nullable=False),
        sa.Column('format_id', sa.Integer(), nullable=False),
        sa.Column('scope', scope_enum, nullable=False),
        sa.Column('market_description', sa.String(), nullable=False),
        sa.Column('contracted_impressions', sa.BigInteger(), nullable=False),
        sa.Column('sale_cpm', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(), nullable=False, server_default='EUR'),
        sa.ForeignKeyConstraint(['campaign_period_id'], ['campaign_periods.id']),
        sa.ForeignKeyConstraint(['channel_id'], ['channels.id']),
        sa.ForeignKeyConstraint(['dsp_id'], ['dsps.id']),
        sa.ForeignKeyConstraint(['format_id'], ['formats.id']),
        sa.ForeignKeyConstraint(['purchase_order_version_id'], ['purchase_order_versions.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_campaign_lines_campaign_period_id', 'campaign_lines', ['campaign_period_id'])
    op.create_index('ix_campaign_lines_dsp_id', 'campaign_lines', ['dsp_id'])

    # DSP mapping table
    op.create_table('dsp_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_line_id', sa.Integer(), nullable=False),
        sa.Column('dsp_id', sa.Integer(), nullable=False),
        sa.Column('external_campaign_id', sa.String(), nullable=False),
        sa.Column('external_line_item_id', sa.String(), nullable=False),
        sa.Column('validated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_line_id'], ['campaign_lines.id']),
        sa.ForeignKeyConstraint(['dsp_id'], ['dsps.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('dsp_mappings')
    op.drop_table('campaign_lines')
    op.drop_table('campaign_periods')
    op.drop_table('campaigns')
    op.drop_table('purchase_order_versions')
    op.drop_table('purchase_orders')
    op.drop_table('sales_reps')
    op.drop_table('sectors')
    op.drop_table('campaign_types')
    op.drop_table('formats')
    op.drop_table('channels')
    op.drop_table('dsps')
    op.drop_table('advertisers')
    op.drop_table('agencies')
    op.drop_table('holding_groups')
    op.drop_table('user_roles')
    op.drop_table('roles')
    op.drop_table('users')

    scope_enum = sa.Enum('national', 'international', name='scope_enum')
    scope_enum.drop(op.get_bind(), checkfirst=True)
