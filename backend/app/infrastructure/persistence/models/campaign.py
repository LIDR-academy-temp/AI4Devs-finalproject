"""Campaign tree: campaigns, campaign periods, and campaign lines."""

from datetime import date
from sqlalchemy import String, ForeignKey, Date, BigInteger, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from sqlalchemy import Numeric

from app.infrastructure.persistence.base import Base


class CampaignRecord(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    agency_id: Mapped[int] = mapped_column(ForeignKey("agencies.id"), nullable=False)
    advertiser_id: Mapped[int] = mapped_column(ForeignKey("advertisers.id"), nullable=False)
    campaign_type_id: Mapped[int] = mapped_column(ForeignKey("campaign_types.id"), nullable=False)
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectors.id"), nullable=False)
    sales_rep_id: Mapped[int] = mapped_column(ForeignKey("sales_reps.id"), nullable=False)
    purchase_order_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_orders.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)


class CampaignPeriodRecord(Base):
    __tablename__ = "campaign_periods"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), nullable=False)
    period_year: Mapped[int] = mapped_column(nullable=False)
    period_month: Mapped[int] = mapped_column(nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")


class CampaignLineRecord(Base):
    __tablename__ = "campaign_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_period_id: Mapped[int] = mapped_column(ForeignKey("campaign_periods.id"), nullable=False)
    purchase_order_version_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_order_versions.id"), nullable=True)
    dsp_id: Mapped[int] = mapped_column(ForeignKey("dsps.id"), nullable=False)
    channel_id: Mapped[int] = mapped_column(ForeignKey("channels.id"), nullable=False)
    format_id: Mapped[int] = mapped_column(ForeignKey("formats.id"), nullable=False)
    scope: Mapped[str] = mapped_column(SQLEnum("national", "international", name="scope_enum"), nullable=False)
    market_description: Mapped[str] = mapped_column(String, nullable=False)
    contracted_impressions: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sale_cpm: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False, default="EUR")
