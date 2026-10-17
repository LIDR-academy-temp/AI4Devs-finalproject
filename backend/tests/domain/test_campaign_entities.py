import pytest
from datetime import date
from decimal import Decimal

from app.domain.entities.campaign import Campaign, CampaignLine, CampaignPeriod
from app.domain.value_objects.contracted_volume import ContractedVolume


def test_campaign_with_periods():
    """Test campaign with auto-expanded periods."""
    campaign = Campaign(
        id=None,
        name="CAMP-2026-001",
        display_name="Campaign 2026 Q1",
        agency_id=1,
        advertiser_id=2,
        campaign_type_id=3,
        sector_id=4,
        sales_rep_id=5,
        purchase_order_id=None,
        start_date=date(2026, 1, 15),
        end_date=date(2026, 3, 10),
        status="active",
        periods=[],
        lines=[]
    )

    assert campaign.name == "CAMP-2026-001"
    assert len(campaign.periods) == 0  # Periods are added separately


def test_campaign_period_fields_assignable():
    """Test that CampaignPeriod fields can be assigned (needed for repository to populate IDs)."""
    period = CampaignPeriod(
        period_year=2026,
        period_month=5,
        period_start=date(2026, 5, 1),
        period_end=date(2026, 5, 31),
        id=None,
        campaign_id=None,
        status="open"
    )

    # Fields should be assignable so repository can populate IDs after save
    period.id = 42
    period.campaign_id = 10
    assert period.id == 42
    assert period.campaign_id == 10


def test_campaign_period_construction_with_campaign_id():
    """Test that CampaignPeriod can be constructed with campaign_id and all values."""
    period = CampaignPeriod(
        period_year=2026,
        period_month=6,
        period_start=date(2026, 6, 1),
        period_end=date(2026, 6, 30),
        id=42,
        campaign_id=10,
        status="open"
    )

    assert period.period_year == 2026
    assert period.period_month == 6
    assert period.period_start == date(2026, 6, 1)
    assert period.period_end == date(2026, 6, 30)
    assert period.id == 42
    assert period.campaign_id == 10
    assert period.status == "open"


def test_campaign_line_with_contracted_volume():
    """Test campaign line with contracted volume."""
    volume = ContractedVolume(
        contracted_impressions=500_000,
        sale_cpm=Decimal("15.25")
    )

    line = CampaignLine(
        id=None,
        campaign_period_id=1,
        purchase_order_version_id=1,
        dsp_id=1,
        channel_id=1,
        format_id=1,
        scope="national",
        market_description="Spain digital",
        volume=volume,
        currency="EUR"
    )

    assert line.scope == "national"
    assert line.volume.revenue() == Decimal("7625.00")  # 500k * 15.25 / 1000


def test_campaign_line_rejects_invalid_scope():
    """Test that invalid scope is rejected."""
    volume = ContractedVolume(
        contracted_impressions=100_000,
        sale_cpm=Decimal("10.00")
    )

    with pytest.raises(ValueError):
        CampaignLine(
            id=None,
            campaign_period_id=1,
            purchase_order_version_id=1,
            dsp_id=1,
            channel_id=1,
            format_id=1,
            scope="regional",  # Invalid scope
            market_description="Test",
            volume=volume,
            currency="EUR"
        )
