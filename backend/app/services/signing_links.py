"""Token del enlace de firma: `base64url(payload).base64url(hmac_sha256(secret, payload))`."""

import base64
import binascii
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta

SIGNING_LINK_TTL = timedelta(hours=24)
MIN_SECRET_LENGTH = 32


class InvalidSigningToken(Exception):
    pass


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _sign(payload: str, secret: str) -> str:
    return _b64encode(hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest())


def issue_signing_token(signature_request_id: uuid.UUID, secret: str, now: datetime | None = None) -> str:
    expires_at = (now or datetime.now(UTC)) + SIGNING_LINK_TTL
    payload = _b64encode(
        json.dumps({"rid": str(signature_request_id), "exp": int(expires_at.timestamp())}, separators=(",", ":")).encode()
    )
    return f"{payload}.{_sign(payload, secret)}"


def verify_signing_token(token: str, secret: str, now: datetime | None = None) -> uuid.UUID:
    payload, separator, signature = token.partition(".")
    if not separator or not payload or "." in signature:
        raise InvalidSigningToken("Token de enlace mal formado")
    if not hmac.compare_digest(signature, _sign(payload, secret)):
        raise InvalidSigningToken("La firma del token de enlace no verifica")

    try:
        claims = json.loads(_b64decode(payload))
        signature_request_id = uuid.UUID(claims["rid"])
        expires_at = datetime.fromtimestamp(int(claims["exp"]), UTC)
    except (binascii.Error, ValueError, KeyError, TypeError) as exc:
        raise InvalidSigningToken("Token de enlace mal formado") from exc

    if (now or datetime.now(UTC)) >= expires_at:
        raise InvalidSigningToken("Token de enlace vencido")
    return signature_request_id


def build_signing_url(
    public_base_url: str, signature_request_id: uuid.UUID, secret: str, now: datetime | None = None
) -> str:
    token = issue_signing_token(signature_request_id, secret, now=now)
    return f"{public_base_url.rstrip('/')}/sign/{signature_request_id}#t={token}"
