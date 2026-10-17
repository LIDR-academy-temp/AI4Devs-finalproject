from datetime import date as dateobj
from sqlalchemy.orm import Session

from app.domain.repositories.purchase_order_repository import (
    PurchaseOrderRepository as PurchaseOrderRepositoryInterface,
    PurchaseOrderVersion,
)
from app.infrastructure.persistence.models import (
    PurchaseOrderModel,
    PurchaseOrderVersionModel,
)


class PurchaseOrderRepositoryImpl(PurchaseOrderRepositoryInterface):
    """SQLAlchemy implementation of purchase order repository."""

    def __init__(self, session: Session):
        self.session = session

    async def create_order(self, order_reference: str, received_on: str) -> int:
        """Create a new purchase order."""
        import datetime
        received_date = datetime.datetime.fromisoformat(received_on).date()

        order = PurchaseOrderModel(
            order_reference=order_reference,
            received_on=received_date,
        )
        self.session.add(order)
        self.session.flush()
        return order.id

    async def create_version(
        self,
        purchase_order_id: int,
        version_number: int,
        issued_on: str,
        revision_reason: str = None
    ) -> PurchaseOrderVersion:
        """Create a new version, deactivate prior ones."""
        import datetime
        issued_date = datetime.datetime.fromisoformat(issued_on).date()

        # Deactivate prior versions
        self.session.query(PurchaseOrderVersionModel).filter_by(
            purchase_order_id=purchase_order_id,
            is_in_force=True
        ).update({"is_in_force": False})

        # Create new version
        version = PurchaseOrderVersionModel(
            purchase_order_id=purchase_order_id,
            version_number=version_number,
            issued_on=issued_date,
            revision_reason=revision_reason,
            is_in_force=True,
        )
        self.session.add(version)
        self.session.flush()

        return PurchaseOrderVersion(
            id=version.id,
            purchase_order_id=version.purchase_order_id,
            version_number=version.version_number,
            issued_on=version.issued_on.isoformat(),
            revision_reason=version.revision_reason,
            is_in_force=version.is_in_force,
        )

    async def get_version_in_force(self, purchase_order_id: int):
        """Get the version currently in force."""
        version = self.session.query(PurchaseOrderVersionModel).filter_by(
            purchase_order_id=purchase_order_id,
            is_in_force=True
        ).first()

        if not version:
            return None

        return PurchaseOrderVersion(
            id=version.id,
            purchase_order_id=version.purchase_order_id,
            version_number=version.version_number,
            issued_on=version.issued_on.isoformat(),
            revision_reason=version.revision_reason,
            is_in_force=version.is_in_force,
        )
