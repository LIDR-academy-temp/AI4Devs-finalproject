from typing import Any, Protocol

import jwt
from jwt import PyJWKClient, PyJWKClientConnectionError, PyJWKClientError

from app.domain.exceptions import IdentityProviderUnavailableError, InvalidIdentityTokenError
from app.domain.models.user import VerifiedIdentity
from app.domain.services.identity_token_verifier import IdentityTokenVerifier

_ALGORITHMS = ["RS256"]
_REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub", "token_use"]


class SigningKeyProvider(Protocol):
    """The subset of PyJWKClient this verifier uses, so tests can supply their own keys."""

    def get_signing_key_from_jwt(self, token: str) -> Any: ...


class CognitoTokenVerifier(IdentityTokenVerifier):
    """Verifies Cognito ID tokens against the User Pool's JWKS.

    The ID token is used, not the access token, because only the ID token carries
    the email claim that joins the caller to users.email, and its audience is the
    app client id.
    """

    def __init__(
        self,
        region: str,
        user_pool_id: str,
        client_id: str,
        jwks_client: SigningKeyProvider | None = None,
    ) -> None:
        self._issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
        self._client_id = client_id
        # PyJWKClient caches the key set and refetches it when an unknown kid appears.
        self._jwks_client = jwks_client or PyJWKClient(f"{self._issuer}/.well-known/jwks.json")

    def verify(self, token: str) -> VerifiedIdentity:
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
        except PyJWKClientConnectionError as error:
            raise IdentityProviderUnavailableError("Identity provider keys are unreachable") from error
        except (PyJWKClientError, jwt.PyJWTError) as error:
            raise InvalidIdentityTokenError("Token signing key could not be resolved") from error

        try:
            claims: dict[str, Any] = jwt.decode(
                token,
                signing_key.key,
                algorithms=_ALGORITHMS,
                audience=self._client_id,
                issuer=self._issuer,
                options={"require": _REQUIRED_CLAIMS},
            )
        except jwt.PyJWTError as error:
            raise InvalidIdentityTokenError("Token failed verification") from error

        if claims.get("token_use") != "id":
            raise InvalidIdentityTokenError("Token is not an ID token")

        email = claims.get("email")
        if not isinstance(email, str) or not email:
            raise InvalidIdentityTokenError("Token carries no email claim")
        # An unverified email must not be trusted as the join key to a local user.
        if claims.get("email_verified") is not True:
            raise InvalidIdentityTokenError("Token email is not verified")

        return VerifiedIdentity(subject=str(claims["sub"]), email=email)
