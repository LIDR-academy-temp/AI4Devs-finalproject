import base64
import uuid
from typing import Any
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_api_key
from app.models import IntegratingSystem
from app.services.signing_links import issue_signing_token
from tests.fixtures.pdfs import valid_pdf
from tests.integration.conftest import ADMIN_TOKEN, SIGNING_LINK_SECRET

API_KEY = "fdk_dueno-del-documento"
OTHER_API_KEY = "fdk_otro-integrador"
SIGNER = {"full_name": "Lucía Fernández", "identifier": "27999888777"}
FILE_NAME = "resolución 0457.pdf"


@pytest.fixture
def integrators(session: Session) -> None:
    session.add_all(
        [
            IntegratingSystem(name="Dueño", api_key_hash=hash_api_key(API_KEY)),
            IntegratingSystem(name="Otro", api_key_hash=hash_api_key(OTHER_API_KEY)),
        ]
    )
    session.commit()


def submit(client: TestClient, content: bytes, file_name: str = FILE_NAME, **extra: Any) -> dict[str, Any]:
    response = client.post(
        "/api/v1/signature-requests",
        headers={"X-API-Key": API_KEY},
        json={"document_base64": base64.b64encode(content).decode(), "file_name": file_name, "signer": SIGNER, **extra},
    )
    assert response.status_code == 201
    return response.json()


def download_url(document_id: str, version_number: int = 1) -> str:
    return f"/api/v1/documents/{document_id}/versions/{version_number}/download"


@pytest.fixture
def uploaded(client: TestClient, integrators: None) -> tuple[dict[str, Any], bytes]:
    content = valid_pdf("descarga")
    return submit(client, content), content


def test_owner_downloads_the_exact_original_bytes(client: TestClient, uploaded: tuple[dict[str, Any], bytes]) -> None:
    created, content = uploaded

    response = client.get(download_url(created["document_id"]), headers={"X-API-Key": API_KEY})

    assert response.status_code == 200
    assert response.content == content
    assert response.headers["content-type"] == "application/pdf"
    disposition = response.headers["content-disposition"]
    assert disposition.startswith("attachment;")
    assert 'filename="resolucion 0457.pdf"' in disposition
    assert f"filename*=UTF-8''{quote(FILE_NAME)}" in disposition


def test_quotes_in_file_name_do_not_break_the_header(client: TestClient, integrators: None) -> None:
    created = submit(client, valid_pdf(), file_name='acta "final".pdf')

    response = client.get(download_url(created["document_id"]), headers={"X-API-Key": API_KEY})

    assert 'filename="acta _final_.pdf"' in response.headers["content-disposition"]


def test_missing_version_is_not_found(client: TestClient, uploaded: tuple[dict[str, Any], bytes]) -> None:
    created, _ = uploaded

    response = client.get(download_url(created["document_id"], 2), headers={"X-API-Key": API_KEY})

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_missing_document_is_not_found(client: TestClient, integrators: None) -> None:
    response = client.get(download_url(str(uuid.uuid4())), headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_panel_downloads_any_document_with_admin_token(
    client: TestClient, uploaded: tuple[dict[str, Any], bytes]
) -> None:
    created, content = uploaded

    response = client.get(download_url(created["document_id"]), headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})

    assert response.status_code == 200
    assert response.content == content


def test_widget_downloads_its_document_with_signing_token(
    client: TestClient, uploaded: tuple[dict[str, Any], bytes]
) -> None:
    created, content = uploaded
    token = created["signing_url"].split("#t=")[1]

    response = client.get(download_url(created["document_id"]), headers={"X-Signing-Token": token})

    assert response.status_code == 200
    assert response.content == content


def test_signing_token_of_another_request_is_not_found(client: TestClient, uploaded: tuple[dict[str, Any], bytes]) -> None:
    created, _ = uploaded
    other = submit(client, valid_pdf("otro"))
    token_of_other_request = other["signing_url"].split("#t=")[1]
    token_of_unknown_request = issue_signing_token(uuid.uuid4(), SIGNING_LINK_SECRET)

    for token in (token_of_other_request, token_of_unknown_request):
        response = client.get(download_url(created["document_id"]), headers={"X-Signing-Token": token})
        assert response.status_code == 404
        assert response.json()["code"] == "not_found"


def test_download_without_credentials_is_unauthorized(client: TestClient, uploaded: tuple[dict[str, Any], bytes]) -> None:
    created, _ = uploaded

    response = client.get(download_url(created["document_id"]))

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_other_integrator_gets_not_found(client: TestClient, uploaded: tuple[dict[str, Any], bytes]) -> None:
    created, _ = uploaded

    response = client.get(download_url(created["document_id"]), headers={"X-API-Key": OTHER_API_KEY})

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_integrator_cannot_download_panel_documents(client: TestClient, integrators: None) -> None:
    panel = client.post(
        "/api/v1/admin/signing-uploads",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        data={"signer_full_name": SIGNER["full_name"], "signer_identifier": SIGNER["identifier"]},
        files={"file": ("panel.pdf", valid_pdf(), "application/pdf")},
    ).json()

    response = client.get(download_url(panel["document_id"]), headers={"X-API-Key": API_KEY})

    assert response.status_code == 404
