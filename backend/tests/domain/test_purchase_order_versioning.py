import pytest
from datetime import date

from app.domain.services.purchase_order_service import PurchaseOrderService


def test_revision_creates_new_version():
    """Test that revising a purchase order creates a new version."""
    service = PurchaseOrderService()

    # Create initial PO
    order_id = 1
    version1 = service.create_version(
        purchase_order_id=order_id,
        version_number=1,
        issued_on=date(2026, 1, 1),
        revision_reason=None
    )

    assert version1.version_number == 1
    assert version1.is_in_force is True

    # Revise to version 2
    version2 = service.create_version(
        purchase_order_id=order_id,
        version_number=2,
        issued_on=date(2026, 1, 15),
        revision_reason="Updated quantities"
    )

    assert version2.version_number == 2
    assert version2.is_in_force is True

    # Version 1 should no longer be in force (fetch from service, not the original object)
    version1_updated = service.get_version(order_id, 1)
    assert version1_updated.is_in_force is False


def test_exactly_one_version_in_force():
    """Test that only one version is in force at a time."""
    service = PurchaseOrderService()
    order_id = 2

    v1 = service.create_version(order_id, 1, date(2026, 1, 1), None)
    assert v1.is_in_force is True

    v2 = service.create_version(order_id, 2, date(2026, 2, 1), "Price update")
    assert v2.is_in_force is True
    assert service.get_version(order_id, 1).is_in_force is False  # fetch updated from service

    v3 = service.create_version(order_id, 3, date(2026, 3, 1), "Final revision")
    assert v3.is_in_force is True
    assert service.get_version(order_id, 2).is_in_force is False  # fetch updated from service


def test_prior_version_readable():
    """Test that prior versions remain readable."""
    service = PurchaseOrderService()
    order_id = 3

    v1 = service.create_version(order_id, 1, date(2026, 1, 1), None)
    v2 = service.create_version(order_id, 2, date(2026, 2, 1), "Revision")

    # Both should be retrievable
    retrieved_v1 = service.get_version(order_id, 1)
    retrieved_v2 = service.get_version(order_id, 2)

    assert retrieved_v1 is not None
    assert retrieved_v1.version_number == 1
    assert retrieved_v1.is_in_force is False

    assert retrieved_v2 is not None
    assert retrieved_v2.is_in_force is True


def test_revision_without_reason_rejected():
    """Test that revision without reason is rejected."""
    service = PurchaseOrderService()
    order_id = 4

    # Version 1 (initial) doesn't need a reason
    v1 = service.create_version(order_id, 1, date(2026, 1, 1), None)
    assert v1.version_number == 1

    # But revision (v2+) without reason should be rejected
    with pytest.raises(ValueError, match="revision_reason.*required"):
        service.create_version(order_id, 2, date(2026, 2, 1), None)
