import base64
import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import hash_api_key
from app.models import Document, DocumentVersion, IntegratingSystem, SignatureRequest, Signer
from app.models.enums import Provider
from app.services import intake
from app.services.intake import IntakeCommand, NewDocument, SignerData, create_signature_request
from app.services.pdf_validation import validate_pdf
from tests.fixtures.pdfs import NOT_A_PDF, encrypted_pdf, oversized_pdf, valid_pdf

URL = "/api/v1/signature-requests"
API_KEY = "fdk_gestor-documental-de-prueba"
OTHER_API_KEY = "fdk_otro-integrador-de-prueba"
SIGNER = {"full_name": "Carlos Ruiz", "identifier": "27111222333", "email": "carlos@example.org"}


@pytest.fixture
def integrators(session: Session) -> tuple[IntegratingSystem, IntegratingSystem]:
    own = IntegratingSystem(name="Gestor documental", api_key_hash=hash_api_key(API_KEY))
    other = IntegratingSystem(name="Otro sistema", api_key_hash=hash_api_key(OTHER_API_KEY))
    session.add_all([own, other])
    session.commit()
    return own, other


def body(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "document_base64": base64.b64encode(valid_pdf()).decode(),
        "file_name": "resolucion-0457.pdf",
        "signer": SIGNER,
    }
    data.update(overrides)
    return {key: value for key, value in data.items() if value is not None}


def send(client: TestClient, api_key: str = API_KEY, **overrides: Any):
    return client.post(URL, headers={"X-API-Key": api_key}, json=body(**overrides))


def row_counts(session: Session) -> dict[str, int]:
    return {
        model.__tablename__: session.scalar(select(func.count()).select_from(model))
        for model in (Signer, Document, DocumentVersion, SignatureRequest)
    }


def test_valid_submission_is_associated_with_the_integrator(
    client: TestClient, session: Session, integrators: tuple[IntegratingSystem, IntegratingSystem]
) -> None:
    own, _ = integrators

    response = send(client, external_document_id="EXP-2026-0457")

    assert response.status_code == 201
    created = response.json()
    assert created["status"] == "pending"
    assert created["signing_url"].startswith(f"http://firmadoc.test/sign/{created['id']}#t=")
    document = session.get(Document, uuid.UUID(created["document_id"]))
    assert (document.integrating_system_id, document.external_document_id) == (own.id, "EXP-2026-0457")
    assert document.versions[0].file_name == "resolucion-0457.pdf"
    request = session.get(SignatureRequest, uuid.UUID(created["id"]))
    assert request.integrating_system_id == own.id
    assert request.provider == Provider.LOCAL


def test_submission_requires_api_key(client: TestClient, integrators: Any) -> None:
    response = client.post(URL, json=body())

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


@pytest.mark.parametrize("payload", ["no es base64 !!", "QUJD$", "QQ"], ids=["texto", "caracter", "relleno"])
def test_invalid_base64_is_rejected(client: TestClient, integrators: Any, payload: str) -> None:
    response = send(client, document_base64=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_pdf"


@pytest.mark.parametrize("content", [NOT_A_PDF, encrypted_pdf()], ids=["texto", "cifrado"])
def test_invalid_pdf_in_base64_is_rejected_without_rows(
    client: TestClient, session: Session, integrators: Any, content: bytes
) -> None:
    before = row_counts(session)

    response = send(client, document_base64=base64.b64encode(content).decode())

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_pdf"
    assert row_counts(session) == before


def test_pdf_over_the_limit_is_rejected(client: TestClient, integrators: Any) -> None:
    response = send(client, document_base64=base64.b64encode(oversized_pdf(1024 * 1024)).decode())

    assert response.status_code == 422
    assert response.json()["code"] == "file_too_large"


def test_new_request_on_existing_document_reuses_the_current_version(
    client: TestClient, session: Session, integrators: Any
) -> None:
    first = send(client).json()

    response = send(client, document_base64=None, file_name=None, document_id=first["document_id"])

    assert response.status_code == 201
    assert response.json()["document_id"] == first["document_id"]
    document_id = uuid.UUID(first["document_id"])
    assert session.scalar(select(func.count()).where(DocumentVersion.document_id == document_id)) == 1
    assert session.scalar(select(func.count()).where(SignatureRequest.document_id == document_id)) == 2


def test_unknown_or_foreign_document_id_is_not_found(client: TestClient, integrators: Any) -> None:
    foreign = send(client, api_key=OTHER_API_KEY).json()["document_id"]

    for document_id in (str(uuid.uuid4()), foreign):
        response = send(client, document_base64=None, file_name=None, document_id=document_id)
        assert response.status_code == 404
        assert response.json()["code"] == "not_found"


def test_panel_document_is_not_reachable_by_an_integrator(
    client: TestClient, session: Session, integrators: Any
) -> None:
    command = IntakeCommand(
        signer=SignerData(**SIGNER),
        document=NewDocument(pdf=validate_pdf(valid_pdf(), max_bytes=1024 * 1024), file_name="panel.pdf"),
    )
    panel_document = create_signature_request(session, client.app.state.settings, command).document_id

    response = send(client, document_base64=None, file_name=None, document_id=str(panel_document))

    assert response.status_code == 404


@pytest.mark.parametrize(
    "overrides",
    [
        {"document_id": str(uuid.uuid4())},
        {"document_base64": None, "file_name": None},
        {"file_name": None},
    ],
    ids=["ambos", "ninguno", "base64-sin-nombre"],
)
def test_document_source_must_be_exactly_one(client: TestClient, integrators: Any, overrides: dict[str, Any]) -> None:
    response = send(client, **overrides)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_repeated_external_id_returns_conflict_with_existing_document(client: TestClient, integrators: Any) -> None:
    first = send(client, external_document_id="EXP-1").json()

    response = send(client, external_document_id="EXP-1")

    assert response.status_code == 409
    assert response.json()["code"] == "duplicate_external_document_id"
    assert response.json()["details"] == {"document_id": first["document_id"]}


def test_same_external_id_in_different_integrators_is_allowed(client: TestClient, integrators: Any) -> None:
    own = send(client, external_document_id="EXP-1")
    other = send(client, api_key=OTHER_API_KEY, external_document_id="EXP-1")

    assert (own.status_code, other.status_code) == (201, 201)


def test_concurrent_duplicate_external_id_maps_integrity_error_to_conflict(
    session: Session, settings: Settings, integrators: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    own, _ = integrators
    pdf = validate_pdf(valid_pdf(), max_bytes=1024 * 1024)

    def command() -> IntakeCommand:
        return IntakeCommand(
            signer=SignerData(**SIGNER),
            document=NewDocument(pdf=pdf, file_name="a.pdf", external_document_id="EXP-RACE"),
            integrating_system_id=own.id,
        )

    first = create_signature_request(session, settings, command())
    real_lookup = intake._existing_by_external_id
    calls = iter([None])
    monkeypatch.setattr(
        intake, "_existing_by_external_id", lambda *args: next(calls, None) or real_lookup(*args)
    )

    with pytest.raises(AppError) as exc_info:
        create_signature_request(session, settings, command())

    assert exc_info.value.status_code == 409
    assert exc_info.value.details == {"document_id": str(first.document_id)}


def test_reserved_provider_is_rejected(client: TestClient, integrators: Any) -> None:
    response = send(client, provider="firmar")

    assert response.status_code == 422
    assert response.json()["code"] == "unsupported_provider"


def test_unknown_provider_is_a_validation_error(client: TestClient, integrators: Any) -> None:
    response = send(client, provider="otro")

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_token_provider_and_callback_url_are_stored(client: TestClient, session: Session, integrators: Any) -> None:
    callback = "https://gestor.example.org/webhooks/firmadoc"

    response = send(client, provider="token", callback_url=callback)

    assert response.status_code == 201
    request = session.get(SignatureRequest, uuid.UUID(response.json()["id"]))
    assert (request.provider, request.callback_url) == (Provider.TOKEN, callback)


@pytest.mark.parametrize("callback", ["ftp://gestor.example.org", "no es una url"])
def test_invalid_callback_url_is_rejected(client: TestClient, integrators: Any, callback: str) -> None:
    response = send(client, callback_url=callback)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


@pytest.mark.parametrize("file_name", ["", "carpeta/", "C:\\docs\\"])
def test_empty_file_name_is_rejected(client: TestClient, integrators: Any, file_name: str) -> None:
    response = send(client, file_name=file_name)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_file_name_path_is_stripped(client: TestClient, session: Session, integrators: Any) -> None:
    response = send(client, file_name="C:\\expedientes\\resolucion-0457.pdf")

    document = session.get(Document, uuid.UUID(response.json()["document_id"]))
    assert document.versions[0].file_name == "resolucion-0457.pdf"


@pytest.mark.parametrize(
    "signer",
    [
        {**SIGNER, "identifier": "27-11122233-3"},
        {**SIGNER, "full_name": "  "},
        {"identifier": SIGNER["identifier"]},
    ],
    ids=["cuil-con-guiones", "nombre-vacio", "sin-nombre"],
)
def test_invalid_signer_is_rejected(client: TestClient, integrators: Any, signer: dict[str, str]) -> None:
    response = send(client, signer=signer)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
