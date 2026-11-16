from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from tests.fixtures.pdfs import valid_pdf
from tests.integration.conftest import ADMIN_TOKEN

WIDGET_ORIGIN = "http://localhost:5173"
FOREIGN_ORIGIN = "http://sitio-ajeno.example"


def preflight(client: TestClient, origin: str, headers: str = "x-signing-token"):
    return client.options(
        "/api/v1/signature-requests/00000000-0000-0000-0000-000000000000",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": headers,
        },
    )


def test_preflight_from_allowed_origin_accepts_signing_token(client: TestClient) -> None:
    response = preflight(client, WIDGET_ORIGIN)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == WIDGET_ORIGIN
    assert "x-signing-token" in response.headers["access-control-allow-headers"].lower()


def test_preflight_accepts_every_credential_header(client: TestClient) -> None:
    response = preflight(client, "http://localhost:4200", "authorization,content-type,x-api-key,x-signing-token")

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"


def test_foreign_origin_gets_no_allow_origin(client: TestClient) -> None:
    preflight_response = preflight(client, FOREIGN_ORIGIN)
    simple_response = client.get("/api/v1/health", headers={"Origin": FOREIGN_ORIGIN})

    assert "access-control-allow-origin" not in preflight_response.headers
    assert "access-control-allow-origin" not in simple_response.headers


def test_download_exposes_content_disposition_to_allowed_origin(client: TestClient) -> None:
    created = client.post(
        "/api/v1/admin/signing-uploads",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        data={"signer_full_name": "Ana Gómez", "signer_identifier": "20304050607"},
        files={"file": ("resolucion.pdf", valid_pdf(), "application/pdf")},
    ).json()

    response = client.get(
        f"/api/v1/documents/{created['document_id']}/versions/1/download",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}", "Origin": WIDGET_ORIGIN},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == WIDGET_ORIGIN
    assert "content-disposition" in response.headers["access-control-expose-headers"].lower()


def test_empty_origin_list_disables_cors(settings: Settings) -> None:
    app = create_app(settings.model_copy(update={"cors_origins": ""}))

    with TestClient(app) as client:
        response = client.get("/api/v1/health", headers={"Origin": WIDGET_ORIGIN})
        preflight_response = preflight(client, WIDGET_ORIGIN)

    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-origin" not in preflight_response.headers


def test_cors_does_not_allow_cookies(client: TestClient) -> None:
    response = preflight(client, WIDGET_ORIGIN)

    assert response.headers.get("access-control-allow-credentials") != "true"
