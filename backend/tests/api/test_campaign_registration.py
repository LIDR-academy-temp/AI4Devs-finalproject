import pytest
from httpx import AsyncClient
from decimal import Decimal


@pytest.mark.asyncio
async def test_register_campaign_success(client: AsyncClient):
    """Test successful campaign registration."""
    payload = {
        "name": "CAMP-TEST-001",
        "display_name": "Test Campaign",
        "agency_id": 1,
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-2026-001",
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

    response = await client.post("/api/campaigns", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "CAMP-TEST-001"
    assert len(data["periods"]) == 3  # Q1 = 3 months


@pytest.mark.asyncio
async def test_register_campaign_unknown_agency(client: AsyncClient):
    """Test that unknown agency is rejected."""
    payload = {
        "name": "CAMP-TEST-002",
        "display_name": "Test Campaign",
        "agency_id": 9999,  # Unknown
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-2026-002",
        "order_received_on": "2025-12-15",
        "lines": []
    }

    response = await client.post("/api/campaigns", json=payload)

    assert response.status_code == 400
    data = response.json()
    assert "agency_id" in data.get("detail", "").lower() or "unknown" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_register_campaign_missing_scope(client: AsyncClient):
    """Test that missing scope is rejected."""
    payload = {
        "name": "CAMP-TEST-003",
        "display_name": "Test Campaign",
        "agency_id": 1,
        "advertiser_id": 1,
        "campaign_type_id": 1,
        "sector_id": 1,
        "sales_rep_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "order_reference": "PO-2026-003",
        "order_received_on": "2025-12-15",
        "lines": [
            {
                "dsp_id": 1,
                "channel_id": 1,
                "format_id": 1,
                # Missing scope
                "market_description": "Spain",
                "contracted_impressions": 1000000,
                "sale_cpm": "25.50"
            }
        ]
    }

    response = await client.post("/api/campaigns", json=payload)

    assert response.status_code == 422  # Validation error
    data = response.json()
    assert "scope" in str(data).lower()
