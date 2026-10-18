from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal
from typing import Optional


class CampaignLineCreateRequest(BaseModel):
    """Request schema for campaign line creation."""

    dsp_id: int
    channel_id: int
    format_id: int
    scope: str = Field(..., description="national | international")
    market_description: str
    contracted_impressions: int = Field(..., gt=0)
    sale_cpm: Decimal = Field(..., decimal_places=2)


class CampaignCreateRequest(BaseModel):
    """Request schema for campaign registration."""

    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    agency_id: int
    advertiser_id: int
    campaign_type_id: int
    sector_id: int
    sales_rep_id: int
    start_date: date
    end_date: date
    order_reference: str = Field(..., min_length=1, max_length=255)
    order_received_on: date
    lines: list[CampaignLineCreateRequest] = Field(..., min_length=1)


class CampaignLineResponse(BaseModel):
    """Response schema for campaign line."""

    id: int
    campaign_period_id: int
    dsp_id: int
    channel_id: int
    format_id: int
    scope: str
    market_description: str
    contracted_impressions: int
    sale_cpm: Decimal
    currency: str = "EUR"


class CampaignPeriodResponse(BaseModel):
    """Response schema for campaign period."""

    id: int
    campaign_id: int
    period_year: int
    period_month: int
    period_start: date
    period_end: date
    status: str


class CampaignResponse(BaseModel):
    """Response schema for campaign (with periods and lines)."""

    id: int
    name: str
    display_name: str
    agency_id: int
    advertiser_id: int
    campaign_type_id: int
    sector_id: int
    sales_rep_id: int
    purchase_order_id: Optional[int]
    start_date: date
    end_date: date
    status: str
    periods: list[CampaignPeriodResponse] = Field(default_factory=list)
    lines: list[CampaignLineResponse] = Field(default_factory=list)


class CampaignListResponse(BaseModel):
    """Response schema for campaign list."""

    id: int
    name: str
    display_name: str
    agency_id: int
    advertiser_id: int
    status: str
    start_date: date
    end_date: date
