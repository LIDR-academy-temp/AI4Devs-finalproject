from sqlalchemy.orm import Session

from app.domain.repositories.master_repository import (
    MasterRepository as MasterRepositoryInterface,
    Agency,
    Advertiser,
    DSP,
    Channel,
    Format,
    CampaignType,
    Sector,
    SalesRep,
)
from app.infrastructure.persistence.models import (
    AgencyModel,
    AdvertiserModel,
    DSPModel,
    ChannelModel,
    FormatModel,
    CampaignTypeModel,
    SectorModel,
    SalesRepModel,
)


class MasterRepositoryImpl(MasterRepositoryInterface):
    """SQLAlchemy implementation of master data repository."""

    def __init__(self, session: Session):
        self.session = session

    async def get_agency(self, agency_id: int):
        """Validate agency exists and get holding_group_id."""
        agency = self.session.query(AgencyModel).filter_by(id=agency_id).first()
        if not agency:
            return None
        return Agency(id=agency.id, name=agency.name, holding_group_id=agency.holding_group_id)

    async def get_advertiser(self, advertiser_id: int):
        """Validate advertiser exists."""
        advertiser = self.session.query(AdvertiserModel).filter_by(id=advertiser_id).first()
        if not advertiser:
            return None
        return Advertiser(id=advertiser.id, name=advertiser.name)

    async def get_dsp(self, dsp_id: int):
        """Validate DSP exists and is active."""
        dsp = self.session.query(DSPModel).filter_by(id=dsp_id).first()
        if not dsp:
            return None
        return DSP(id=dsp.id, name=dsp.name, is_active=dsp.is_active)

    async def get_channel(self, channel_id: int):
        """Validate channel exists."""
        channel = self.session.query(ChannelModel).filter_by(id=channel_id).first()
        if not channel:
            return None
        return Channel(id=channel.id, name=channel.name)

    async def get_format(self, format_id: int):
        """Validate format exists."""
        format_obj = self.session.query(FormatModel).filter_by(id=format_id).first()
        if not format_obj:
            return None
        return Format(id=format_obj.id, name=format_obj.name)

    async def get_campaign_type(self, campaign_type_id: int):
        """Validate campaign type exists."""
        campaign_type = self.session.query(CampaignTypeModel).filter_by(id=campaign_type_id).first()
        if not campaign_type:
            return None
        return CampaignType(id=campaign_type.id, name=campaign_type.name)

    async def get_sector(self, sector_id: int):
        """Validate sector exists."""
        sector = self.session.query(SectorModel).filter_by(id=sector_id).first()
        if not sector:
            return None
        return Sector(id=sector.id, name=sector.name)

    async def get_sales_rep(self, sales_rep_id: int):
        """Validate sales rep exists."""
        sales_rep = self.session.query(SalesRepModel).filter_by(id=sales_rep_id).first()
        if not sales_rep:
            return None
        return SalesRep(id=sales_rep.id, name=sales_rep.name)
