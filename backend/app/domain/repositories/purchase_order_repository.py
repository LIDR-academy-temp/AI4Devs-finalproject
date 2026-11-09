from abc import ABC, abstractmethod
from typing import Optional

from app.domain.entities.purchase_order import PurchaseOrderVersion


class PurchaseOrderRepository(ABC):
    """Repository interface for purchase orders and versions."""

    @abstractmethod
    async def create_order(self, order_reference: str, received_on: str) -> int:
        """Create a new purchase order. Returns order ID."""
        pass

    @abstractmethod
    async def create_version(
        self,
        purchase_order_id: int,
        version_number: int,
        issued_on: str,
        revision_reason: Optional[str] = None
    ) -> int:
        """Create a new version. Sets is_in_force=True, others to False."""
        pass

    @abstractmethod
    async def get_version_in_force(self, purchase_order_id: int) -> Optional[PurchaseOrderVersion]:
        """Get the version currently in force for an order."""
        pass
