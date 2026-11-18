"""Ticket 1b: firma con proveedor local (prepare / complete)."""

import base64
import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_api_key
from app.models import Certificate, DocumentVersion, IntegratingSystem, SigningChallenge
from app.models.enums import Provider, RevocationStatus, SignatureRequestStatus
from app.services.demo_pki import load_local_keystore
from app.services.local_signing import verify_pdf_signatures
from app.services.signing_links import issue_signing_token
from tests.fixtures.pdfs import valid_pdf
from tests.integration.conftest import LOCAL_KEYSTORE_PASSPHRASE, SIGNING_LINK_SECRET
from tests.integration.test_admin_uploads import ADMIN_HEADERS, upload
from tests.integration.test_signature_requests import API_KEY, body, send

INTEGRATOR_KEY = API_KEY


def signing_headers(request_id: uuid.UUID) -> dict[str, str]:
    token = issue_signing_token(request_id, SIGNING_LINK_SECRET)
    return {"X-Signing-Token": token}


@pytest.fixture
def local_cert(session: Session, local_keystore_path) -> None:
    if session.scalar(select(Certificate).where(Certificate.provider == Provider.LOCAL)):
        return
    keystore = load_local_keystore(local_keystore_path, LOCAL_KEYSTORE_PASSPHRASE)
    cert = keystore.certificate
    session.add(
        Certificate(
            subject=cert.subject.rfc4514_string(),
            issuer_subject=cert.issuer.rfc4514_string(),
            serial_number=format(cert.serial_number, "x"),
            provider=Provider.LOCAL,
            revocation_status=RevocationStatus.GOOD,
            issued_at=cert.not_valid_before_utc,
            expires_at=cert.not_valid_after_utc,
        )
    )
    session.flush()


@pytest.fixture
def integrator(session: Session) -> IntegratingSystem:
    system = IntegratingSystem(name="Integrador", api_key_hash=hash_api_key(INTEGRATOR_KEY))
    session.add(system)
    session.flush()
    return system


def sign_request(client: TestClient, request_id: uuid.UUID) -> dict:
    headers = signing_headers(request_id)
    assert client.post(f"/api/v1/signature-requests/{request_id}/prepare", headers=headers).status_code == 200
    complete = client.post(f"/api/v1/signature-requests/{request_id}/complete", headers=headers)
    assert complete.status_code == 200
    return complete.json()


def test_prepare_requires_signing_token(client: TestClient, session: Session, local_cert: None) -> None:
    response = upload(client, valid_pdf())
    request_id = response.json()["id"]
    assert client.post(f"/api/v1/signature-requests/{request_id}/prepare").status_code == 401


def test_local_signing_happy_path_and_v1_unchanged(client: TestClient, session: Session, local_cert: None) -> None:
    pdf = valid_pdf()
    created = upload(client, pdf)
    request_id = uuid.UUID(created.json()["id"])
    document_id = uuid.UUID(created.json()["document_id"])
    v1 = session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == 1,
        )
    )
    v1_bytes = v1.content
    v1_hash = v1.document_hash

    body = sign_request(client, request_id)
    assert body["status"] == "signed"
    assert body["certificate"] is not None
    assert body["document"]["version_number"] == 2
    assert body["document"]["signature_level"] == "B-B"

    session.expire_all()
    v1_after = session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == 1,
        )
    )
    assert v1_after.content == v1_bytes
    assert v1_after.document_hash == v1_hash

    v2 = session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == 2,
        )
    )
    assert verify_pdf_signatures(v2.content) == 1


def test_prepare_on_signed_request_returns_409(client: TestClient, session: Session, local_cert: None) -> None:
    created = upload(client, valid_pdf())
    request_id = uuid.UUID(created.json()["id"])
    sign_request(client, request_id)
    headers = signing_headers(request_id)
    assert client.post(f"/api/v1/signature-requests/{request_id}/prepare", headers=headers).status_code == 409


def test_complete_twice_returns_409(client: TestClient, session: Session, local_cert: None) -> None:
    created = upload(client, valid_pdf())
    request_id = uuid.UUID(created.json()["id"])
    headers = signing_headers(request_id)
    client.post(f"/api/v1/signature-requests/{request_id}/prepare", headers=headers)
    assert client.post(f"/api/v1/signature-requests/{request_id}/complete", headers=headers).status_code == 200
    assert client.post(f"/api/v1/signature-requests/{request_id}/complete", headers=headers).status_code == 409


def test_expired_challenge_returns_409(client: TestClient, session: Session, local_cert: None) -> None:
    from unittest.mock import patch

    created = upload(client, valid_pdf())
    request_id = uuid.UUID(created.json()["id"])
    headers = signing_headers(request_id)
    prep = client.post(f"/api/v1/signature-requests/{request_id}/prepare", headers=headers).json()
    expires_at = datetime.fromisoformat(prep["expires_at"].replace("Z", "+00:00"))
    with patch("app.services.local_signing.datetime") as mock_dt:
        mock_dt.UTC = UTC
        mock_dt.now.return_value = expires_at + timedelta(seconds=1)
        assert client.post(f"/api/v1/signature-requests/{request_id}/complete", headers=headers).status_code == 409


def test_second_signature_incremental(
    client: TestClient, session: Session, local_cert: None, integrator: IntegratingSystem
) -> None:
    first = send(client)
    assert first.status_code == 201
    request_id = uuid.UUID(first.json()["id"])
    document_id = uuid.UUID(first.json()["document_id"])
    sign_request(client, request_id)

    second = send(client, document_base64=None, file_name=None, document_id=str(document_id))
    assert second.status_code == 201
    second_id = uuid.UUID(second.json()["id"])
    sign_request(client, second_id)

    v3 = session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == 3,
        )
    )
    assert verify_pdf_signatures(v3.content) == 2