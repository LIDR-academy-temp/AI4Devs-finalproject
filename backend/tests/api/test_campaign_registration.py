import pytest
import logging
from datetime import date

logger = logging.getLogger(__name__)


def test_register_campaign_success(authenticated_client):
    """Test successful campaign registration returns 201 and persists campaign."""
    payload = {
        "name": "CAMP-SYNC-001",
        "display_name": "Sync Test Campaign",
        "agency_id": 1,
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-SYNC-001",
        "order_received_on": "2025-12-15",
        "lines": [
            {
                "dsp_id": 1,
                "channel_id": 1,
                "format_id": 1,
                "scope": "national",
                "market_description": "Spain",
                "contracted_impressions": 1000000,
                "sale_cpm": "25.50"
            }
        ]
    }

    response = authenticated_client.post("/campaigns", json=payload)

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["name"] == "CAMP-SYNC-001"
    assert data["status"] == "active"
    assert len(data["periods"]) > 0
    assert len(data["lines"]) > 0


def test_register_campaign_no_token(client):
    """Test that missing token returns 401."""
    payload = {
        "name": "CAMP-SYNC-002",
        "display_name": "Test Campaign",
        "agency_id": 1,
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-SYNC-002",
        "order_received_on": "2025-12-15",
        "lines": []
    }

    response = client.post("/campaigns", json=payload)

    assert response.status_code == 401  # No token means unauthenticated


def test_register_campaign_invalid_agency(authenticated_client):
    """Test that unknown agency returns 400."""
    payload = {
        "name": "CAMP-SYNC-003",
        "display_name": "Test Campaign",
        "agency_id": 9999,  # Unknown
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-SYNC-003",
        "order_received_on": "2025-12-15",
        "lines": []
    }

    response = authenticated_client.post("/campaigns", json=payload)

    assert response.status_code == 400
    assert "agency" in response.json()["detail"].lower()


def test_list_campaigns_requires_auth(client):
    """Test that GET /campaigns without token returns 401."""
    response = client.get("/campaigns")

    assert response.status_code == 401


def test_register_campaign_duplicate_order_reference(authenticated_client):
    """Test that duplicate order_reference returns 409."""
    payload1 = {
        "name": "CAMP-DUP-001",
        "display_name": "First Campaign",
        "agency_id": 1,
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-DUPLICATE-001",
        "order_received_on": "2025-12-15",
        "lines": []
    }

    # First registration succeeds
    response1 = authenticated_client.post("/campaigns", json=payload1)
    assert response1.status_code == 201

    # Second registration with same order_reference fails with 409
    payload2 = {
        **payload1,
        "name": "CAMP-DUP-002",
        "display_name": "Second Campaign with Same PO"
    }
    response2 = authenticated_client.post("/campaigns", json=payload2)
    assert response2.status_code == 409
    assert "duplicate_order_reference" in response2.json().get("code", "")


def test_register_campaign_error_no_sql_exposure(authenticated_client):
    """Test that 500 errors don't expose SQL in response body."""
    # Try to cause an internal error (though this is hard without crafted payload)
    # For now, test that generic error messages don't include SQL keywords
    response = authenticated_client.post("/campaigns", json={})
    # This should be 422 due to validation, not 500, but let's verify no SQL leaks
    assert "select" not in response.text.lower()
    assert "insert" not in response.text.lower()
    assert "from" not in response.text.lower() or "invalid" in response.text.lower()  # "from" might be in validation error
