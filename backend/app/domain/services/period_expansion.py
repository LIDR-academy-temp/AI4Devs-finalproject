from dataclasses import dataclass
from datetime import date, timedelta
import calendar


@dataclass(frozen=True)
class CampaignPeriod:
    """Immutable representation of a campaign period (one calendar month)."""

    period_year: int
    period_month: int
    period_start: date
    period_end: date


class PeriodExpansionService:
    """Expands a campaign date range into monthly periods."""

    def expand(self, start_date: date, end_date: date) -> list[CampaignPeriod]:
        """
        Expand a campaign into monthly periods.

        One period per calendar month between start and end dates (inclusive),
        with each period clipped to the campaign boundaries.
        """
        periods: list[CampaignPeriod] = []

        current_date = start_date

        while current_date <= end_date:
            year = current_date.year
            month = current_date.month

            # First day of current month
            month_start = date(year, month, 1)

            # Last day of current month
            _, last_day = calendar.monthrange(year, month)
            month_end = date(year, month, last_day)

            # Clip to campaign boundaries
            period_start = max(current_date, month_start)
            period_end = min(end_date, month_end)

            periods.append(CampaignPeriod(
                period_year=year,
                period_month=month,
                period_start=period_start,
                period_end=period_end
            ))

            # Move to first day of next month
            if month == 12:
                current_date = date(year + 1, 1, 1)
            else:
                current_date = date(year, month + 1, 1)

        return periods
