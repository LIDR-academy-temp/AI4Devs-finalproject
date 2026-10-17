from datetime import date
from decimal import Decimal
from typing import Optional

from app.domain.entities.campaign import Campaign, CampaignPeriod, CampaignLine
from app.domain.value_objects.contracted_volume import ContractedVolume
from app.domain.services.period_expansion import PeriodExpansionService
from app.domain.repositories.campaign_repository import CampaignRepository
from app.domain.repositories.purchase_order_repository import PurchaseOrderRepository
from app.domain.repositories.master_repository import MasterRepository


class CampaignRegistrationService:
    """
    Application service for campaign registration.

    Orchestrates:
    - Campaign creation and period expansion
    - Campaign line creation with volumes
    - Purchase order versioning (version 1)
    - Master data validation
    """

    def __init__(
        self,
        campaign_repo: CampaignRepository,
        purchase_order_repo: PurchaseOrderRepository,
        master_repo: MasterRepository
    ):
        self.campaign_repo = campaign_repo
        self.purchase_order_repo = purchase_order_repo
        self.master_repo = master_repo
        self.period_service = PeriodExpansionService()

    async def register_campaign(
        self,
        name: str,
        display_name: str,
        agency_id: int,
        advertiser_id: int,
        campaign_type_id: int,
        sector_id: int,
        sales_rep_id: int,
        start_date: date,
        end_date: date,
        order_reference: str,
        order_received_on: date,
        lines_data: list[dict],
    ) -> Campaign:
        """
        Register a new campaign.

        Validates all master references, expands periods, creates purchase order v1,
        and saves everything in a single transaction.

        Raises ValueError if any master reference is unknown.
        """

        # Validate all master references exist
        agency = await self.master_repo.get_agency(agency_id)
        if not agency:
            raise ValueError(f"Unknown agency_id: {agency_id}")

        advertiser = await self.master_repo.get_advertiser(advertiser_id)
        if not advertiser:
            raise ValueError(f"Unknown advertiser_id: {advertiser_id}")

        campaign_type = await self.master_repo.get_campaign_type(campaign_type_id)
        if not campaign_type:
            raise ValueError(f"Unknown campaign_type_id: {campaign_type_id}")

        sector = await self.master_repo.get_sector(sector_id)
        if not sector:
            raise ValueError(f"Unknown sector_id: {sector_id}")

        sales_rep = await self.master_repo.get_sales_rep(sales_rep_id)
        if not sales_rep:
            raise ValueError(f"Unknown sales_rep_id: {sales_rep_id}")

        # Create purchase order and version 1
        purchase_order_id = await self.purchase_order_repo.create_order(
            order_reference, order_received_on.isoformat()
        )
        version_1 = await self.purchase_order_repo.create_version(
            purchase_order_id=purchase_order_id,
            version_number=1,
            issued_on=order_received_on.isoformat(),
            revision_reason=None
        )

        # Create campaign
        campaign = Campaign(
            id=None,
            name=name,
            display_name=display_name,
            agency_id=agency_id,
            advertiser_id=advertiser_id,
            campaign_type_id=campaign_type_id,
            sector_id=sector_id,
            sales_rep_id=sales_rep_id,
            purchase_order_id=purchase_order_id,
            start_date=start_date,
            end_date=end_date,
            status="active",
            periods=[],
            lines=[]
        )
        campaign.validate()

        # Expand periods
        expanded_periods = self.period_service.expand(start_date, end_date)
        campaign.periods = [
            CampaignPeriod(
                id=None,
                campaign_id=campaign.id or 0,
                period_year=p.period_year,
                period_month=p.period_month,
                period_start=p.period_start,
                period_end=p.period_end,
                status="open"
            )
            for p in expanded_periods
        ]

        # Create lines
        for line_data in lines_data:
            dsp_id = line_data["dsp_id"]
            channel_id = line_data["channel_id"]
            format_id = line_data["format_id"]

            # Validate DSP
            dsp = await self.master_repo.get_dsp(dsp_id)
            if not dsp or not dsp.is_active:
                raise ValueError(f"DSP {dsp_id} not found or inactive")

            # Validate channel and format
            channel = await self.master_repo.get_channel(channel_id)
            if not channel:
                raise ValueError(f"Unknown channel_id: {channel_id}")

            format_obj = await self.master_repo.get_format(format_id)
            if not format_obj:
                raise ValueError(f"Unknown format_id: {format_id}")

            # Create line for each period
            for period in campaign.periods:
                volume = ContractedVolume(
                    contracted_impressions=line_data["contracted_impressions"],
                    sale_cpm=Decimal(str(line_data["sale_cpm"]))
                )

                line = CampaignLine(
                    id=None,
                    campaign_period_id=period.id or 0,
                    purchase_order_version_id=version_1.id or 0,
                    dsp_id=dsp_id,
                    channel_id=channel_id,
                    format_id=format_id,
                    scope=line_data["scope"],
                    market_description=line_data["market_description"],
                    volume=volume,
                    currency="EUR"
                )
                campaign.lines.append(line)

        # Save campaign with all periods and lines (atomic transaction)
        campaign_id = await self.campaign_repo.save(campaign)
        campaign.id = campaign_id

        return campaign
