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


def test_campaign_period_immutable():
    """Test that CampaignPeriod is immutable."""
    period = CampaignPeriod(
        id=None,
        campaign_id=1,
        period_year=2026,
        period_month=5,
        period_start=date(2026, 5, 1),
        period_end=date(2026, 5, 31),
        status="open"
    )

    with pytest.raises(AttributeError):
        period.period_month = 6


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
