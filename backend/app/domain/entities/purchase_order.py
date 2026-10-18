from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass(frozen=True)
class PurchaseOrder:
    """Immutable purchase order: a contract with versioning support."""

    id: Optional[int]
    order_reference: str
    received_on: date


@dataclass(frozen=True)
class PurchaseOrderVersion:
    """Immutable purchase order version.

    Invariants:
    - Only one version per order is_in_force at a time
    - Revisions (v2+) require revision_reason
    - Prior versions remain readable but immutable
    """

    id: Optional[int]
    purchase_order_id: int
    version_number: int
    issued_on: date
    revision_reason: Optional[str]
    is_in_force: bool
