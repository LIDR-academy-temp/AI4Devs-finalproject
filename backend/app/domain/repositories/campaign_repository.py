from abc import ABC, abstractmethod
from typing import Optional

from app.domain.entities.campaign import Campaign


class CampaignRepository(ABC):
    """Repository interface for Campaign aggregates."""

    @abstractmethod
    async def save(self, campaign: Campaign) -> int:
        """
        Save a campaign and its periods and lines in a single transaction.

        Returns: campaign.id (new or existing)
        """
        pass

    @abstractmethod
    async def get_by_id(self, campaign_id: int) -> Optional[Campaign]:
        """Retrieve campaign by ID with periods and lines."""
        pass

    @abstractmethod
    async def get_by_name(self, name: str) -> Optional[Campaign]:
        """Retrieve campaign by unique name."""
        pass
