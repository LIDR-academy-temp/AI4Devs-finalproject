from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.domain.entities.campaign import Campaign, CampaignPeriod, CampaignLine
from app.domain.repositories.campaign_repository import CampaignRepository as CampaignRepositoryInterface
from app.infrastructure.persistence.models.campaign import (
    CampaignRecord,
    CampaignPeriodRecord,
    CampaignLineRecord,
)


class CampaignRepositoryImpl(CampaignRepositoryInterface):
    """SQLAlchemy implementation of campaign repository."""

    def __init__(self, session: Session):
        self.session = session

    async def save(self, campaign: Campaign) -> int:
        """
        Save campaign with periods and lines in a single transaction.

        Raises: IntegrityError if constraints violated (e.g., duplicate name)
        """
        try:
            # Create campaign model
            campaign_model = CampaignRecord(
                name=campaign.name,
                display_name=campaign.display_name,
                agency_id=campaign.agency_id,
                advertiser_id=campaign.advertiser_id,
                campaign_type_id=campaign.campaign_type_id,
                sector_id=campaign.sector_id,
                sales_rep_id=campaign.sales_rep_id,
                purchase_order_id=campaign.purchase_order_id,
                status=campaign.status,
                start_date=campaign.start_date,
                end_date=campaign.end_date,
            )
            self.session.add(campaign_model)
            self.session.flush()  # Get the ID without committing

            campaign_id = campaign_model.id

            # Create period models
            for period in campaign.periods:
                period_model = CampaignPeriodRecord(
                    campaign_id=campaign_id,
                    period_year=period.period_year,
                    period_month=period.period_month,
                    period_start=period.period_start,
                    period_end=period.period_end,
                    status=period.status,
                )
                self.session.add(period_model)

            self.session.flush()

            # Get period IDs from DB
            periods_from_db = self.session.query(CampaignPeriodRecord).filter_by(
                campaign_id=campaign_id
            ).all()
            period_id_map = {
                (p.period_year, p.period_month): p.id for p in periods_from_db
            }

            # Create line models
            for line in campaign.lines:
                # Find period ID for this line
                period_key = None
                for p in campaign.periods:
                    if p.id is None:  # Match by year/month
                        period_key = (p.period_year, p.period_month)
                        break

                period_id = period_key and period_id_map.get(period_key)

                line_model = CampaignLineRecord(
                    campaign_period_id=period_id or periods_from_db[0].id,
                    purchase_order_version_id=line.purchase_order_version_id,
                    dsp_id=line.dsp_id,
                    channel_id=line.channel_id,
                    format_id=line.format_id,
                    scope=line.scope,
                    market_description=line.market_description,
                    contracted_impressions=line.volume.contracted_impressions,
                    sale_cpm=line.volume.sale_cpm,
                    currency=line.currency,
                )
                self.session.add(line_model)

            self.session.commit()
            return campaign_id

        except IntegrityError as e:
            self.session.rollback()
            raise

    async def get_by_id(self, campaign_id: int):
        """Not implemented for MVP."""
        raise NotImplementedError()

    async def get_by_name(self, name: str):
        """Not implemented for MVP."""
        raise NotImplementedError()
