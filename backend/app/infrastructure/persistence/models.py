from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, PrimaryKeyConstraint, Enum, Numeric, DateTime, Date, BigInteger, Index
from sqlalchemy.orm import relationship

from app.infrastructure.persistence.base import Base


class UserModel(Base):
    """Local user identity, joining Cognito email to local roles."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    roles = relationship("UserRoleModel", cascade="all, delete-orphan")


class RoleModel(Base):
    """Functional role: operations, business, finance."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class UserRoleModel(Base):
    """Bridge table: many-to-many between users and roles."""

    __tablename__ = "user_roles"
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "role_id", name="pk_user_roles"),
    )

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)


# Master data tables

class HoldingGroupModel(Base):
    """Holding group: top-level entity in the agency hierarchy."""

    __tablename__ = "holding_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class AgencyModel(Base):
    """Agency: customer or intermediary. Belongs to a holding group."""

    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    holding_group_id = Column(Integer, ForeignKey("holding_groups.id"), nullable=False)
    name = Column(String, unique=True, nullable=False)


class AdvertiserModel(Base):
    """Advertiser: the end client whose campaign it is."""

    __tablename__ = "advertisers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class DSPModel(Base):
    """DSP: Adform, Equativ, Displayce."""

    __tablename__ = "dsps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)


class ChannelModel(Base):
    """Channel: tipo_plataforma (digital, OOH, DOOH, etc.)."""

    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class FormatModel(Base):
    """Format: tipo_formato (banner, native, video, etc.)."""

    __tablename__ = "formats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class CampaignTypeModel(Base):
    """Campaign type: commercial category."""

    __tablename__ = "campaign_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class SectorModel(Base):
    """Sector: market segment or industry."""

    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class SalesRepModel(Base):
    """Sales representative: person responsible for the sale."""

    __tablename__ = "sales_reps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


# Campaign tree

class CampaignModel(Base):
    """Campaign: aggregates periods and lines under a single execution scope."""

    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    advertiser_id = Column(Integer, ForeignKey("advertisers.id"), nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    campaign_type_id = Column(Integer, ForeignKey("campaign_types.id"), nullable=False)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    sales_rep_id = Column(Integer, ForeignKey("sales_reps.id"), nullable=False)
    status = Column(String, nullable=False, default="active")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)


class CampaignPeriodModel(Base):
    """Campaign period: monthly grain for budget and reporting."""

    __tablename__ = "campaign_periods"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="open")


class CampaignLineModel(Base):
    """Campaign line: execution specification for a period, DSP and channel."""

    __tablename__ = "campaign_lines"

    id = Column(Integer, primary_key=True, index=True)
    campaign_period_id = Column(Integer, ForeignKey("campaign_periods.id"), nullable=False)
    purchase_order_version_id = Column(Integer, ForeignKey("purchase_order_versions.id"), nullable=True)
    dsp_id = Column(Integer, ForeignKey("dsps.id"), nullable=False)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    format_id = Column(Integer, ForeignKey("formats.id"), nullable=False)
    scope = Column(Enum("national", "international", name="scope_enum"), nullable=False)
    market_description = Column(String, nullable=False)
    contracted_impressions = Column(BigInteger, nullable=False)
    sale_cpm = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, nullable=False, default="EUR")


# Purchase order versioning

class PurchaseOrderModel(Base):
    """Purchase order: the document that authorises a campaign."""

    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_reference = Column(String, unique=True, nullable=False)
    received_on = Column(Date, nullable=False)


class PurchaseOrderVersionModel(Base):
    """Purchase order version: immutable snapshot of an order at a point in time."""

    __tablename__ = "purchase_order_versions"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    issued_on = Column(Date, nullable=False)
    revision_reason = Column(String, nullable=True)
    is_in_force = Column(Boolean, nullable=False, default=True)


# DSP mapping

class DSPMappingModel(Base):
    """DSP mapping: external IDs that bind a campaign line to the DSP."""

    __tablename__ = "dsp_mappings"

    id = Column(Integer, primary_key=True, index=True)
    campaign_line_id = Column(Integer, ForeignKey("campaign_lines.id"), nullable=False)
    dsp_id = Column(Integer, ForeignKey("dsps.id"), nullable=False)
    external_campaign_id = Column(String, nullable=False)
    external_line_item_id = Column(String, nullable=False)
    validated_at = Column(DateTime, nullable=True)
