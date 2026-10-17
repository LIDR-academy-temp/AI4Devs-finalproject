from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import Annotated

from app.domain.models.user import RoleName, User
from app.presentation.dependencies.auth import require_roles, get_current_user
from app.presentation.schemas.campaign import (
    CampaignCreateRequest,
    CampaignResponse,
    CampaignListResponse,
)
from app.application.services.campaign_registration_service import CampaignRegistrationService
from app.infrastructure.persistence.repositories import (
    CampaignRepositoryImpl,
    PurchaseOrderRepositoryImpl,
    MasterRepositoryImpl,
)


router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# Dependency injection for repositories and services
from sqlalchemy.orm import Session
from app.presentation.dependencies.providers import get_db_session


def get_campaign_service(
    session: Annotated[Session, Depends(get_db_session)]
) -> CampaignRegistrationService:
    """Instantiate campaign registration service with repositories."""
    return CampaignRegistrationService(
        campaign_repo=CampaignRepositoryImpl(session),
        purchase_order_repo=PurchaseOrderRepositoryImpl(session),
        master_repo=MasterRepositoryImpl(session),
    )


@router.post(
    "",
    status_code=201,
    response_model=CampaignResponse,
    dependencies=[Depends(require_roles(RoleName.OPERATIONS))]
)
async def register_campaign(
    request: CampaignCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleName.OPERATIONS))],
    service: CampaignRegistrationService = Depends(get_campaign_service),
):
    """
    Register a new campaign from a purchase order.

    Requires: operations role

    Validates:
    - All master references (agency, advertiser, DSP, etc.)
    - Dates (start <= end)
    - Scope enumeration

    Creates:
    - Campaign with auto-expanded periods
    - Campaign lines with DSP mappings
    - Purchase order version 1

    Returns: Campaign with periods and lines
    """
    try:
        campaign = await service.register_campaign(
            name=request.name,
            display_name=request.display_name,
            agency_id=request.agency_id,
            advertiser_id=request.advertiser_id,
            campaign_type_id=request.campaign_type_id,
            sector_id=request.sector_id,
            sales_rep_id=request.sales_rep_id,
            start_date=request.start_date,
            end_date=request.end_date,
            order_reference=request.order_reference,
            order_received_on=request.order_received_on,
            lines_data=[line.model_dump() for line in request.lines],
        )

        # Convert campaign entity to response schema
        return CampaignResponse(
            id=campaign.id,
            name=campaign.name,
            display_name=campaign.display_name,
            agency_id=campaign.agency_id,
            advertiser_id=campaign.advertiser_id,
            campaign_type_id=campaign.campaign_type_id,
            sector_id=campaign.sector_id,
            sales_rep_id=campaign.sales_rep_id,
            purchase_order_id=campaign.purchase_order_id,
            start_date=campaign.start_date,
            end_date=campaign.end_date,
            status=campaign.status,
            periods=[
                {
                    "id": p.id,
                    "campaign_id": p.campaign_id,
                    "period_year": p.period_year,
                    "period_month": p.period_month,
                    "period_start": p.period_start,
                    "period_end": p.period_end,
                    "status": p.status,
                }
                for p in campaign.periods
            ],
            lines=[
                {
                    "id": l.id,
                    "campaign_period_id": l.campaign_period_id,
                    "dsp_id": l.dsp_id,
                    "channel_id": l.channel_id,
                    "format_id": l.format_id,
                    "scope": l.scope,
                    "market_description": l.market_description,
                    "contracted_impressions": l.volume.contracted_impressions,
                    "sale_cpm": l.volume.sale_cpm,
                    "currency": l.currency,
                }
                for l in campaign.lines
            ],
        )

    except ValueError as e:
        # Master data validation error
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Generic error
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "",
    response_model=list[CampaignListResponse],
    dependencies=[Depends(require_roles(RoleName.OPERATIONS, RoleName.BUSINESS))]
)
async def list_campaigns(
    current_user: Annotated[User, Depends(require_roles(RoleName.OPERATIONS, RoleName.BUSINESS))],
):
    """
    List all campaigns (simplified view).

    Requires: operations or business role

    Returns: Campaign list (without periods/lines for performance)
    """
    # TODO: Implement from repository
    return []
