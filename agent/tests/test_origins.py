from fastapi.testclient import TestClient

from tests.conftest import WIDGET_ORIGIN


def test_disallowed_origin_is_rejected_with_403(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "https://sitio-malicioso.example"})

    assert response.status_code == 403
    assert response.json()["code"] == "origin_not_allowed"
    assert "access-control-allow-origin" not in response.headers


def test_disallowed_origin_preflight_is_rejected_with_403(client: TestClient) -> None:
    response = client.options(
        "/health",
        headers={"Origin": "https://sitio-malicioso.example", "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 403
    assert "access-control-allow-origin" not in response.headers


def test_null_origin_is_rejected(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "null"})

    assert response.status_code == 403


def test_allowed_origin_gets_cors_headers(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": WIDGET_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == WIDGET_ORIGIN


def test_allowed_origin_preflight_succeeds(client: TestClient) -> None:
    response = client.options(
        "/health",
        headers={"Origin": "https://firmadoc.example", "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://firmadoc.example"


def test_request_without_origin_is_allowed(client: TestClient) -> None:
    assert client.get("/health").status_code == 200
