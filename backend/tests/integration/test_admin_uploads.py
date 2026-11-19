import hashlib
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Document, DocumentVersion, SignatureRequest, Signer
from app.models.enums import Provider, SignatureRequestStatus, VersionOrigin
from app.services.signing_links import verify_signing_token
from tests.fixtures.pdfs import NOT_A_PDF, PNG_HEADER, encrypted_pdf, oversized_pdf, truncated_pdf, valid_pdf
from tests.integration.conftest import ADMIN_TOKEN, SIGNING_LINK_SECRET

URL = "/api/v1/admin/signing-uploads"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
CUIL = "20304050607"


def form(**overrides: str) -> dict[str, str]:
    data = {"signer_full_name": "Ana Gómez", "signer_identifier": CUIL, "signer_email": "ana@example.org"}
    data.update(overrides)
    return {key: value for key, value in data.items() if value is not None}


def upload(client: TestClient, content: bytes | None = None, file_name: str = "resolucion.pdf", **fields: str):
    files = None if content is None else {"file": (file_name, content, "application/pdf")}
    return client.post(URL, headers=ADMIN_HEADERS, data=form(**fields), files=files)


def row_counts(session: Session) -> dict[str, int]:
    return {
        model.__tablename__: session.scalar(select(func.count()).select_from(model))
        for model in (Signer, Document, DocumentVersion, SignatureRequest)
    }


@pytest.fixture
def empty_counts(session: Session) -> dict[str, int]:
    return row_counts(session)


def test_valid_upload_creates_pending_request_with_signing_url(client: TestClient, session: Session) -> None:
    pdf = valid_pdf()

    response = upload(client, pdf)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    request_id = uuid.UUID(body["id"])
    base, token = body["signing_url"].split("#t=")
    assert base == f"http://firmadoc.test/sign/{request_id}"
    assert verify_signing_token(token, SIGNING_LINK_SECRET) == request_id
    assert body["created_at"]

    document = session.get(Document, uuid.UUID(body["document_id"]))
    assert document is not None
    assert document.integrating_system_id is None
    assert [(v.version_number, v.origin) for v in document.versions] == [(1, VersionOrigin.UPLOADED)]
    version = document.versions[0]
    assert document.current_version_id == version.id
    assert version.content == pdf
    assert version.document_hash == hashlib.sha256(pdf).hexdigest()
    assert version.file_name == "resolucion.pdf"

    request = session.get(SignatureRequest, request_id)
    assert request.provider == Provider.LOCAL
    assert request.status == SignatureRequestStatus.PENDING
    assert request.integrating_system_id is None
    assert (request.signer.full_name, request.signer.identifier, request.signer.email) == (
        "Ana Gómez",
        CUIL,
        "ana@example.org",
    )


def test_upload_accepts_token_provider(client: TestClient, session: Session) -> None:
    response = upload(client, valid_pdf(), provider="token")

    assert response.status_code == 201
    assert session.get(SignatureRequest, uuid.UUID(response.json()["id"])).provider == Provider.TOKEN


def test_upload_without_file_is_rejected(client: TestClient, session: Session, empty_counts: dict[str, int]) -> None:
    response = upload(client, None)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert row_counts(session) == empty_counts


@pytest.mark.parametrize(
    "content",
    [NOT_A_PDF, PNG_HEADER, truncated_pdf(), encrypted_pdf()],
    ids=["texto", "imagen", "truncado", "cifrado"],
)
def test_invalid_pdf_is_rejected_without_creating_rows(
    client: TestClient, session: Session, empty_counts: dict[str, int], content: bytes
) -> None:
    response = upload(client, content)

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_pdf"
    assert row_counts(session) == empty_counts


def test_pdf_over_the_configured_limit_is_rejected(
    client: TestClient, session: Session, empty_counts: dict[str, int]
) -> None:
    response = upload(client, oversized_pdf(1024 * 1024))

    assert response.status_code == 422
    assert response.json()["code"] == "file_too_large"
    assert row_counts(session) == empty_counts


def test_existing_signer_is_reused_without_changing_its_name(client: TestClient, session: Session) -> None:
    first = upload(client, valid_pdf("uno"))
    second = upload(client, valid_pdf("dos"), signer_full_name="Ana María Gómez", signer_email="otra@example.org")

    assert (first.status_code, second.status_code) == (201, 201)
    signers = session.scalars(select(Signer).where(Signer.identifier == CUIL)).all()
    assert len(signers) == 1
    assert (signers[0].full_name, signers[0].email) == ("Ana Gómez", "ana@example.org")
    second_request = session.get(SignatureRequest, uuid.UUID(second.json()["id"]))
    assert second_request.signer_id == signers[0].id


@pytest.mark.parametrize("cuil", ["20-30405060-7", "2030405060", "2030405060A", ""])
def test_invalid_cuil_is_rejected(
    client: TestClient, session: Session, empty_counts: dict[str, int], cuil: str
) -> None:
    response = upload(client, valid_pdf(), signer_identifier=cuil)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert row_counts(session) == empty_counts


@pytest.mark.parametrize("name", ["", "   "], ids=["vacio", "espacios"])
def test_blank_signer_name_is_rejected(client: TestClient, session: Session, empty_counts: dict[str, int], name: str) -> None:
    response = upload(client, valid_pdf(), signer_full_name=name)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert row_counts(session) == empty_counts


def test_missing_signer_name_is_rejected(client: TestClient) -> None:
    response = client.post(
        URL,
        headers=ADMIN_HEADERS,
        data={"signer_identifier": CUIL},
        files={"file": ("resolucion.pdf", valid_pdf(), "application/pdf")},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_reserved_provider_is_rejected(client: TestClient, session: Session, empty_counts: dict[str, int]) -> None:
    response = upload(client, valid_pdf(), provider="firmar")

    assert response.status_code == 422
    assert response.json()["code"] == "unsupported_provider"
    assert row_counts(session) == empty_counts


@pytest.mark.parametrize(
    ("sent", "stored"),
    [
        ("C:\\expedientes\\resolucion-0457.pdf", "resolucion-0457.pdf"),
        ("/var/tmp/resolución 0457.pdf", "resolución 0457.pdf"),
    ],
)
def test_only_the_base_file_name_is_stored(client: TestClient, session: Session, sent: str, stored: str) -> None:
    response = upload(client, valid_pdf(), file_name=sent)

    assert response.status_code == 201
    document = session.get(Document, uuid.UUID(response.json()["document_id"]))
    assert document.versions[0].file_name == stored


def test_file_name_that_is_only_a_path_is_rejected(
    client: TestClient, session: Session, empty_counts: dict[str, int]
) -> None:
    response = upload(client, valid_pdf(), file_name="carpeta/")

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert row_counts(session) == empty_counts


def test_upload_requires_admin_token(client: TestClient) -> None:
    response = client.post(
        URL, data=form(), files={"file": ("resolucion.pdf", valid_pdf(), "application/pdf")}
    )

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"
