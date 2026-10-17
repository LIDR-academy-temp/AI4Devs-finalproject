import time
from dataclasses import dataclass

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from jwt import PyJWKClientConnectionError, PyJWKClientError

from app.domain.exceptions import IdentityProviderUnavailableError, InvalidIdentityTokenError
from app.infrastructure.auth.cognito_token_verifier import CognitoTokenVerifier

REGION = "eu-central-1"
USER_POOL_ID = "eu-central-1_TestPool1"
CLIENT_ID = "test-client-id"
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"


def _generate_private_key() -> RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


SIGNING_KEY = _generate_private_key()
FOREIGN_KEY = _generate_private_key()


@dataclass(frozen=True)
class _SigningKey:
    key: RSAPublicKey


class _StaticJwksClient:
    """Stands in for PyJWKClient: returns one public key, or raises a given error."""

    def __init__(self, public_key: RSAPublicKey, error: PyJWKClientError | None = None) -> None:
        self._public_key = public_key
        self._error = error

    def get_signing_key_from_jwt(self, token: str) -> _SigningKey:
        if self._error is not None:
            raise self._error
        return _SigningKey(key=self._public_key)


def _id_token(
    claim_overrides: dict[str, object] | None = None, private_key: RSAPrivateKey = SIGNING_KEY
) -> str:
    now = int(time.time())
    claims: dict[str, object] = {
        "sub": "user-sub-123",
        "email": "ops@example.com",
        "email_verified": True,
        "iss": ISSUER,
        "aud": CLIENT_ID,
        "token_use": "id",
        "iat": now,
        "exp": now + 3600,
    }
    claims.update(claim_overrides or {})
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "test-kid"})


def _verifier(jwks_client: _StaticJwksClient | None = None) -> CognitoTokenVerifier:
    return CognitoTokenVerifier(
        region=REGION,
        user_pool_id=USER_POOL_ID,
        client_id=CLIENT_ID,
        jwks_client=jwks_client or _StaticJwksClient(SIGNING_KEY.public_key()),
    )


def test_verify_returns_identity_from_valid_id_token() -> None:
    identity = _verifier().verify(_id_token())

    assert identity.email == "ops@example.com"
    assert identity.subject == "user-sub-123"


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"aud": "another-client"}, id="wrong-audience"),
        pytest.param({"iss": "https://cognito-idp.eu-west-1.amazonaws.com/other"}, id="wrong-issuer"),
        pytest.param({"exp": int(time.time()) - 60}, id="expired"),
        pytest.param({"token_use": "access"}, id="access-token-instead-of-id-token"),
        pytest.param({"email_verified": False}, id="unverified-email"),
        pytest.param({"email": None}, id="missing-email"),
    ],
)
def test_verify_rejects_token_with_invalid_claims(overrides: dict[str, object]) -> None:
    with pytest.raises(InvalidIdentityTokenError):
        _verifier().verify(_id_token(overrides))


def test_verify_rejects_token_signed_with_a_key_outside_the_user_pool() -> None:
    with pytest.raises(InvalidIdentityTokenError):
        _verifier().verify(_id_token(private_key=FOREIGN_KEY))


def test_verify_rejects_malformed_token() -> None:
    with pytest.raises(InvalidIdentityTokenError):
        _verifier().verify("not-a-jwt")


def test_verify_rejects_token_whose_key_id_is_not_in_the_jwks() -> None:
    jwks_client = _StaticJwksClient(SIGNING_KEY.public_key(), error=PyJWKClientError("kid not found"))

    with pytest.raises(InvalidIdentityTokenError):
        _verifier(jwks_client).verify(_id_token())


def test_verify_reports_unreachable_jwks_as_provider_unavailable_not_as_invalid_token() -> None:
    jwks_client = _StaticJwksClient(
        SIGNING_KEY.public_key(), error=PyJWKClientConnectionError("connection refused")
    )

    with pytest.raises(IdentityProviderUnavailableError):
        _verifier(jwks_client).verify(_id_token())
