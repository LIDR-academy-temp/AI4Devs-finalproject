from dataclasses import replace
from datetime import date
from typing import Optional

from app.domain.entities.purchase_order import PurchaseOrderVersion


class PurchaseOrderService:
    """
    Domain service for purchase order versioning.

    Invariants:
    - Only one version per order is in_force at a time
    - Revisions (v2+) require a revision_reason
    - Prior versions remain readable
    """

    def __init__(self):
        """Initialize with in-memory storage for testing."""
        self._versions: dict[tuple[int, int], PurchaseOrderVersion] = {}
        self._in_force: dict[int, int] = {}  # order_id -> version_number

    def create_version(
        self,
        purchase_order_id: int,
        version_number: int,
        issued_on: date,
        revision_reason: Optional[str] = None
    ) -> PurchaseOrderVersion:
        """
        Create a new purchase order version.

        Raises ValueError if revision (v2+) lacks revision_reason.
        Sets this version is_in_force, deactivates prior versions (via replace).
        """
        # Validate: revisions must have a reason
        if version_number > 1 and revision_reason is None:
            raise ValueError("revision_reason is required for revisions (version > 1)")

        # Create the new version as in-force
        version = PurchaseOrderVersion(
            id=None,
            purchase_order_id=purchase_order_id,
            version_number=version_number,
            issued_on=issued_on,
            revision_reason=revision_reason,
            is_in_force=True
        )

        # Deactivate prior version using replace() (immutable)
        if purchase_order_id in self._in_force:
            prior_number = self._in_force[purchase_order_id]
            if (purchase_order_id, prior_number) in self._versions:
                prior_version = self._versions[(purchase_order_id, prior_number)]
                inactive_version = replace(prior_version, is_in_force=False)
                self._versions[(purchase_order_id, prior_number)] = inactive_version

        # Store and set as in-force
        self._versions[(purchase_order_id, version_number)] = version
        self._in_force[purchase_order_id] = version_number

        return version

    def get_version(
        self,
        purchase_order_id: int,
        version_number: int
    ) -> Optional[PurchaseOrderVersion]:
        """Retrieve a specific version (whether in-force or not)."""
        return self._versions.get((purchase_order_id, version_number))

    def get_version_in_force(
        self,
        purchase_order_id: int
    ) -> Optional[PurchaseOrderVersion]:
        """Get the version currently in force for an order."""
        if purchase_order_id not in self._in_force:
            return None

        version_number = self._in_force[purchase_order_id]
        return self.get_version(purchase_order_id, version_number)
