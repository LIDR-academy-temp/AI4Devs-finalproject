import pytest

from app.config import Settings


def test_settings_derive_cognito_issuer_and_jwks_url_from_region_and_user_pool(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@db:5432/adops360")
    monkeypatch.setenv("COGNITO_REGION", "eu-central-1")
    monkeypatch.setenv("COGNITO_USER_POOL_ID", "eu-central-1_Example1")
    monkeypatch.setenv("COGNITO_CLIENT_ID", "example-client-id")

    settings = Settings()

    assert settings.cognito_issuer == "https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_Example1"
    assert settings.cognito_jwks_url == f"{settings.cognito_issuer}/.well-known/jwks.json"


def test_settings_fail_fast_when_required_variables_are_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    for variable in ("DATABASE_URL", "COGNITO_REGION", "COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID"):
        monkeypatch.delenv(variable, raising=False)

    with pytest.raises(ValueError):
        Settings()
