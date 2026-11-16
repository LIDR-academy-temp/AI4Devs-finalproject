import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.auth import Principal, require_admin, require_document_reader, require_integrator
from app.core.config import Settings
from app.core.security import hash_api_key
from app.main import create_app
from app.models import IntegratingSystem
from app.services.signing_links import issue_signing_token
from tests.integration.conftest import ADMIN_TOKEN, SIGNING_LINK_SECRET

API_KEY = "fdk_clave-de-integrador-de-prueba"


@pytest.fixture
def app(app: FastAPI) -> FastAPI:
    router = APIRouter(prefix="/api/v1/_test")

    @router.get("/integrator")
    def integrator(system: Annotated[IntegratingSystem, Depends(require_integrator)]) -> dict[str, str]:
        return {"id": str(system.id)}

    @router.get("/admin")
    def admin(_: Annotated[None, Depends(require_admin)]) -> dict[str, str]:
        return {"ok": "admin"}

    @router.get("/reader")
    def reader(principal: Annotated[Principal, Depends(require_document_reader)]) -> dict[str, str | None]:
        return {
            "kind": principal.kind,
            "integrating_system_id": str(principal.integrating_system_id) if principal.integrating_system_id else None,
            "signature_request_id": str(principal.signature_request_id) if principal.signature_request_id else None,
        }

    app.include_router(router)
    return app


@pytest.fixture
def integrator(session: Session) -> IntegratingSystem:
    system = IntegratingSystem(name="Gestor documental", api_key_hash=hash_api_key(API_KEY))
    session.add(system)
    session.flush()
    return system


def test_valid_api_key_identifies_integrator(client: TestClient, integrator: IntegratingSystem) -> None:
    response = client.get("/api/v1/_test/integrator", headers={"X-API-Key": API_KEY})

    assert response.status_code == 200
    assert response.json() == {"id": str(integrator.id)}


@pytest.mark.parametrize("headers", [{}, {"X-API-Key": "fdk_desconocida"}, {"X-API-Key": ""}])
def test_missing_or_unknown_api_key_is_rejected(
    client: TestClient, integrator: IntegratingSystem, headers: dict[str, str]
) -> None:
    response = client.get("/api/v1/_test/integrator", headers=headers)

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_valid_admin_token_is_accepted(client: TestClient) -> None:
    response = client.get("/api/v1/_test/admin", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})

    assert response.status_code == 200


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer otro-token"}, {"Authorization": ADMIN_TOKEN}, {"Authorization": "Basic abc"}],
)
def test_invalid_or_missing_admin_token_is_rejected(client: TestClient, headers: dict[str, str]) -> None:
    response = client.get("/api/v1/_test/admin", headers=headers)

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_admin_endpoints_are_closed_when_admin_token_is_not_configured(app: FastAPI) -> None:
    app.state.settings = app.state.settings.model_copy(update={"admin_token": ""})

    with TestClient(app) as client:
        response = client.get("/api/v1/_test/admin", headers={"Authorization": "Bearer "})
        response_with_value = client.get("/api/v1/_test/admin", headers={"Authorization": "Bearer x"})

    assert response.status_code == 401
    assert response_with_value.status_code == 401


def test_reader_accepts_integrator_admin_and_signing_link(client: TestClient, integrator: IntegratingSystem) -> None:
    request_id = uuid.uuid4()
    token = issue_signing_token(request_id, SIGNING_LINK_SECRET)

    as_integrator = client.get("/api/v1/_test/reader", headers={"X-API-Key": API_KEY}).json()
    as_admin = client.get("/api/v1/_test/reader", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}).json()
    as_link = client.get("/api/v1/_test/reader", headers={"X-Signing-Token": token}).json()

    assert as_integrator == {"kind": "integrator", "integrating_system_id": str(integrator.id), "signature_request_id": None}
    assert as_admin == {"kind": "admin", "integrating_system_id": None, "signature_request_id": None}
    assert as_link == {"kind": "signing_link", "integrating_system_id": None, "signature_request_id": str(request_id)}


def test_reader_without_credentials_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/_test/reader")

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_expired_signing_token_is_rejected(client: TestClient) -> None:
    issued_two_days_ago = datetime.now(UTC) - timedelta(days=2)
    token = issue_signing_token(uuid.uuid4(), SIGNING_LINK_SECRET, now=issued_two_days_ago)

    response = client.get("/api/v1/_test/reader", headers={"X-Signing-Token": token})

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_tampered_signing_token_is_rejected(client: TestClient) -> None:
    forged = issue_signing_token(uuid.uuid4(), "otro-secreto-que-no-es-el-del-servidor-1234")

    response = client.get("/api/v1/_test/reader", headers={"X-Signing-Token": forged})

    assert response.status_code == 401


@pytest.mark.parametrize("secret", ["", "corto"])
def test_app_refuses_to_start_with_weak_signing_link_secret(settings: Settings, secret: str) -> None:
    with pytest.raises(ValueError, match="FIRMADOC_SIGNING_LINK_SECRET"):
        create_app(settings.model_copy(update={"signing_link_secret": secret}))
