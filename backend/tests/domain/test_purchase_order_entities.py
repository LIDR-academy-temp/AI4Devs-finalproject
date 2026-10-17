import pytest
from datetime import date

from app.domain.entities.purchase_order import PurchaseOrderVersion
from app.domain.services.purchase_order_service import PurchaseOrderService


def test_purchase_order_version_is_immutable():
    """Test that PurchaseOrderVersion is frozen (immutable)."""
    version = PurchaseOrderVersion(
        id=1,
        purchase_order_id=10,
        version_number=1,
        issued_on=date(2026, 1, 1),
        revision_reason=None,
        is_in_force=True
    )

    with pytest.raises(AttributeError):
        version.is_in_force = False


def test_purchase_order_versioning_immutable():
    """Test that creating a new version leaves prior version unchanged (via replace)."""
    service = PurchaseOrderService()

    # Create v1
    v1 = service.create_version(
        purchase_order_id=1,
        version_number=1,
        issued_on=date(2026, 1, 1),
        revision_reason=None
    )
    assert v1.is_in_force is True
    v1_from_storage = service.get_version(1, 1)
    assert v1_from_storage.is_in_force is True

    # Create v2 (revision)
    v2 = service.create_version(
        purchase_order_id=1,
        version_number=2,
        issued_on=date(2026, 2, 1),
        revision_reason="Updated pricing"
    )
    assert v2.is_in_force is True

    # v1 should now be inactive (via immutable replace, not mutation)
    v1_updated = service.get_version(1, 1)
    assert v1_updated.is_in_force is False

    # Both versions exist, but only v2 is in-force
    assert service.get_version(1, 1) is not None
    assert service.get_version(1, 2) is not None
    assert service.get_version_in_force(1).version_number == 2


def test_only_one_version_in_force_per_order():
    """Test that only one version per order is marked in_force."""
    service = PurchaseOrderService()

    # Create three versions for same order
    v1 = service.create_version(1, 1, date(2026, 1, 1), None)
    v2 = service.create_version(1, 2, date(2026, 2, 1), "pricing update")
    v3 = service.create_version(1, 3, date(2026, 3, 1), "scope change")

    # Only v3 is in-force
    assert service.get_version_in_force(1).version_number == 3
    assert service.get_version_in_force(1).is_in_force is True

    # v1 and v2 are not in-force
    assert service.get_version(1, 1).is_in_force is False
    assert service.get_version(1, 2).is_in_force is False

    # All versions still exist
    assert service.get_version(1, 1) is not None
    assert service.get_version(1, 2) is not None
    assert service.get_version(1, 3) is not None
