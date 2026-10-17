"""Master data tables: agencies, advertisers, DSPs, channels, formats, campaign types, sectors, sales reps."""

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.base import Base


class HoldingGroupRecord(Base):
    __tablename__ = "holding_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class AgencyRecord(Base):
    __tablename__ = "agencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    holding_group_id: Mapped[int] = mapped_column(ForeignKey("holding_groups.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class AdvertiserRecord(Base):
    __tablename__ = "advertisers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class DSPRecord(Base):
    __tablename__ = "dsps"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ChannelRecord(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class FormatRecord(Base):
    __tablename__ = "formats"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class CampaignTypeRecord(Base):
    __tablename__ = "campaign_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class SectorRecord(Base):
    __tablename__ = "sectors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class SalesRepRecord(Base):
    __tablename__ = "sales_reps"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
