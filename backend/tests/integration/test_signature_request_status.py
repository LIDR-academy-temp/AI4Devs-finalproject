import base64
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_api_key
from app.models import IntegratingSystem
from app.services.signing_links import issue_signing_token
from tests.fixtures.pdfs import valid_pdf
from tests.integration.conftest import ADMIN_TOKEN, SIGNING_LINK_SECRET

API_KEY = "fdk_dueno-de-la-solicitud"
OTHER_API_KEY = "fdk_otro-integrador-de-la-consulta"
SIGNER = {"full_name": "Marta Díaz", "identifier": "27555666777"}


@pytest.fixture
def integrators(session: Session) -> None:
    session.add_all(
        [
            IntegratingSystem(name="Dueño", api_key_hash=hash_api_key(API_KEY)),
            IntegratingSystem(name="Otro", api_key_hash=hash_api_key(OTHER_API_KEY)),
        ]
    )
    session.commit()


def submit(client: TestClient, content: bytes, api_key: str = API_KEY, **extra: Any) -> dict[str, Any]:
    response = client.post(
        "/api/v1/signature-requests",
        headers={"X-API-Key": api_key},
        json={
            "document_base64": base64.b64encode(content).decode(),
            "file_name": "resolucion.pdf",
            "signer": SIGNER,
            **extra,
        },
    )
    assert response.status_code == 201
    return response.json()


def token_of(created: dict[str, Any]) -> str:
    return created["signing_url"].split("#t=")[1]


def status_url(request_id: str) -> str:
    return f"/api/v1/signature-requests/{request_id}"


@pytest.fixture
def created(client: TestClient, integrators: None) -> tuple[dict[str, Any], bytes]:
    content = valid_pdf("consulta")
    return submit(client, content, external_document_id="EXP-77"), content


def test_new_request_reports_pending_status_and_current_version(
    client: TestClient, created: tuple[dict[str, Any], bytes]
) -> None:
    request, content = created

    response = client.get(status_url(request["id"]), headers={"X-Signing-Token": token_of(request)})

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == request["id"]
    assert (body["status"], body["provider"], body["certificate"], body["signed_at"]) == (
        "pending",
        "local",
        None,
        None,
    )
    assert body["created_at"]
    document = body["document"]
    assert document["id"] == request["document_id"]
    assert document["external_document_id"] == "EXP-77"
    assert document["version_number"] == 1
    assert document["is_active_version"] is True
    assert document["signing_status"] == "pending_signature"
    assert document["signature_level"] is None
    assert document["file_name"] == "resolucion.pdf"
    assert document["size_bytes"] == len(content)
    assert document["download_url"] == (
        f"http://testserver/api/v1/documents/{request['document_id']}/versions/1/download"
    )


def test_download_url_works_with_the_same_signing_token(
    client: TestClient, created: tuple[dict[str, Any], bytes]
) -> None:
    request, content = created
    token = token_of(request)
    download_url = client.get(status_url(request["id"]), headers={"X-Signing-Token": token}).json()["document"][
        "download_url"
    ]

    response = client.get(download_url, headers={"X-Signing-Token": token})

    assert response.status_code == 200
    assert response.content == content


def test_owner_integrator_can_query_its_request(client: TestClient, created: tuple[dict[str, Any], bytes]) -> None:
    request, _ = created

    response = client.get(status_url(request["id"]), headers={"X-API-Key": API_KEY})

    assert response.status_code == 200


def test_unknown_request_is_not_found(client: TestClient, integrators: None) -> None:
    response = client.get(status_url(str(uuid.uuid4())), headers={"X-API-Key": API_KEY})

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_malformed_id_is_a_validation_error(client: TestClient, integrators: None) -> None:
    response = client.get(status_url("no-es-un-uuid"), headers={"X-API-Key": API_KEY})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_signing_token_of_another_request_is_not_found(
    client: TestClient, created: tuple[dict[str, Any], bytes]
) -> None:
    request, _ = created
    other = submit(client, valid_pdf("otra"))

    response = client.get(status_url(request["id"]), headers={"X-Signing-Token": token_of(other)})

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_request_of_another_integrator_is_not_found(
    client: TestClient, created: tuple[dict[str, Any], bytes]
) -> None:
    request, _ = created

    response = client.get(status_url(request["id"]), headers={"X-API-Key": OTHER_API_KEY})

    assert response.status_code == 404


def test_panel_request_is_not_visible_to_integrators(client: TestClient, integrators: None) -> None:
    panel = client.post(
        "/api/v1/admin/signing-uploads",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        data={"signer_full_name": SIGNER["full_name"], "signer_identifier": SIGNER["identifier"]},
        files={"file": ("panel.pdf", valid_pdf(), "application/pdf")},
    ).json()

    by_integrator = client.get(status_url(panel["id"]), headers={"X-API-Key": API_KEY})
    by_link = client.get(status_url(panel["id"]), headers={"X-Signing-Token": token_of(panel)})

    assert by_integrator.status_code == 404
    assert by_link.status_code == 200


def test_missing_credentials_are_unauthorized(client: TestClient, created: tuple[dict[str, Any], bytes]) -> None:
    request, _ = created

    response = client.get(status_url(request["id"]))

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_expired_signing_token_is_unauthorized(client: TestClient, created: tuple[dict[str, Any], bytes]) -> None:
    request, _ = created
    expired = issue_signing_token(
        uuid.UUID(request["id"]), SIGNING_LINK_SECRET, now=datetime.now(UTC) - timedelta(days=2)
    )

    response = client.get(status_url(request["id"]), headers={"X-Signing-Token": expired})

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_admin_token_is_not_accepted(client: TestClient, created: tuple[dict[str, Any], bytes]) -> None:
    request, _ = created

    response = client.get(status_url(request["id"]), headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})

    assert response.status_code == 401
