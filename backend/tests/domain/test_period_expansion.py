import pytest
from datetime import date
from app.domain.services.period_expansion import PeriodExpansionService


def test_multi_month_campaign():
    """Test period expansion for a campaign spanning multiple calendar months."""
    campaign_start = date(2026, 1, 15)
    campaign_end = date(2026, 3, 10)

    service = PeriodExpansionService()
    periods = service.expand(campaign_start, campaign_end)

    assert len(periods) == 3
    assert periods[0].period_month == 1
    assert periods[0].period_start == campaign_start
    assert periods[0].period_end == date(2026, 1, 31)

    assert periods[1].period_month == 2
    assert periods[1].period_start == date(2026, 2, 1)
    assert periods[1].period_end == date(2026, 2, 28)

    assert periods[2].period_month == 3
    assert periods[2].period_start == date(2026, 3, 1)
    assert periods[2].period_end == campaign_end


def test_single_month_campaign():
    """Test period expansion for a campaign within a single calendar month."""
    campaign_start = date(2026, 5, 10)
    campaign_end = date(2026, 5, 20)

    service = PeriodExpansionService()
    periods = service.expand(campaign_start, campaign_end)

    assert len(periods) == 1
    assert periods[0].period_month == 5
    assert periods[0].period_start == campaign_start
    assert periods[0].period_end == campaign_end


def test_campaign_starting_mid_month():
    """Test period expansion for a campaign starting mid-month."""
    campaign_start = date(2026, 7, 15)
    campaign_end = date(2026, 9, 5)

    service = PeriodExpansionService()
    periods = service.expand(campaign_start, campaign_end)

    assert len(periods) == 3
    assert periods[0].period_month == 7
    assert periods[0].period_start == date(2026, 7, 15)

    assert periods[1].period_month == 8
    assert periods[1].period_start == date(2026, 8, 1)

    assert periods[2].period_month == 9
    assert periods[2].period_end == date(2026, 9, 5)
