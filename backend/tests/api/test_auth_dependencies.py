"""Authentication and role enforcement through the FastAPI dependencies.

No business endpoint exists yet, so the dependencies are exercised through
probe routes mounted on the real application for these tests only.
"""

from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient

from app.application.services.authentication_service import AuthenticationService
from app.domain.models.user import RoleName, User
from app.main import create_app
from app.presentation.dependencies.auth import get_current_user, require_roles
from app.presentation.dependencies.providers import get_authentication_service
from tests.fixtures.identity import (
    FakeIdentityTokenVerifier,
    InMemoryUserRepository,
    build_user,
)

TOKENS = {
    "ops-token": "ops@example.com",
    "multi-role-token": "multi@example.com",
    "stranger-token": "stranger@example.com",
}


def _client() -> TestClient:
    probe_router = APIRouter()

    @probe_router.get("/probe/authenticated")
    def authenticated_probe(user: User = Depends(get_current_user)) -> dict[str, str]:
        return {"email": user.email}

    @probe_router.get("/probe/finance")
    def finance_probe(user: User = Depends(require_roles(RoleName.FINANCE))) -> dict[str, str]:
        return {"email": user.email}

    @probe_router.get("/probe/operations-or-finance")
    def operations_or_finance_probe(
        user: User = Depends(require_roles(RoleName.OPERATIONS, RoleName.FINANCE)),
    ) -> dict[str, str]:
        return {"email": user.email}

    app = create_app()
    app.include_router(probe_router)
    service = AuthenticationService(
        token_verifier=FakeIdentityTokenVerifier(TOKENS),
        user_repository=InMemoryUserRepository(
            [
                build_user(email="ops@example.com", roles=[RoleName.OPERATIONS]),
                build_user(
                    email="multi@example.com",
                    roles=[RoleName.BUSINESS, RoleName.FINANCE],
                    user_id=2,
                ),
            ]
        ),
    )
    app.dependency_overrides[get_authentication_service] = lambda: service
    return TestClient(app)


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_missing_token_is_unauthenticated() -> None:
    response = _client().get("/probe/authenticated")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["code"] == "unauthenticated"


def test_invalid_token_is_unauthenticated() -> None:
    response = _client().get("/probe/authenticated", headers=_bearer("forged-token"))

    assert response.status_code == 401
    assert response.json()["code"] == "unauthenticated"


def test_valid_token_without_local_user_is_forbidden_not_unauthenticated() -> None:
    response = _client().get("/probe/authenticated", headers=_bearer("stranger-token"))

    assert response.status_code == 403
    assert response.json()["code"] == "user_not_registered"


def test_registered_user_is_authenticated() -> None:
    response = _client().get("/probe/authenticated", headers=_bearer("ops-token"))

    assert response.status_code == 200
    assert response.json() == {"email": "ops@example.com"}


def test_user_without_required_role_is_forbidden() -> None:
    response = _client().get("/probe/finance", headers=_bearer("ops-token"))

    assert response.status_code == 403
    assert response.json()["code"] == "missing_role"


def test_user_holding_the_required_role_among_several_is_authorized() -> None:
    response = _client().get("/probe/finance", headers=_bearer("multi-role-token"))

    assert response.status_code == 200


def test_user_holding_any_one_of_the_accepted_roles_is_authorized() -> None:
    response = _client().get("/probe/operations-or-finance", headers=_bearer("ops-token"))

    assert response.status_code == 200
