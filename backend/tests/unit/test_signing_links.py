import base64
import json
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.services.signing_links import (
    SIGNING_LINK_TTL,
    InvalidSigningToken,
    build_signing_url,
    issue_signing_token,
    verify_signing_token,
)

SECRET = "secreto-de-enlaces-de-prueba-de-32-caracteres"
NOW = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)


def test_token_round_trip_returns_the_request_id() -> None:
    request_id = uuid.uuid4()

    token = issue_signing_token(request_id, SECRET, now=NOW)

    assert verify_signing_token(token, SECRET, now=NOW) == request_id


def test_token_is_valid_until_expiry() -> None:
    token = issue_signing_token(uuid.uuid4(), SECRET, now=NOW)

    verify_signing_token(token, SECRET, now=NOW + SIGNING_LINK_TTL - timedelta(seconds=1))
    with pytest.raises(InvalidSigningToken, match="vencido"):
        verify_signing_token(token, SECRET, now=NOW + SIGNING_LINK_TTL)


def test_token_signed_with_another_secret_is_rejected() -> None:
    token = issue_signing_token(uuid.uuid4(), "otro-secreto-de-al-menos-32-caracteres-xx", now=NOW)

    with pytest.raises(InvalidSigningToken):
        verify_signing_token(token, SECRET, now=NOW)


def test_token_with_modified_payload_is_rejected() -> None:
    token = issue_signing_token(uuid.uuid4(), SECRET, now=NOW)
    _, signature = token.split(".")
    forged_payload = base64.urlsafe_b64encode(
        json.dumps({"rid": str(uuid.uuid4()), "exp": int((NOW + timedelta(days=30)).timestamp())}).encode()
    ).rstrip(b"=").decode()

    with pytest.raises(InvalidSigningToken):
        verify_signing_token(f"{forged_payload}.{signature}", SECRET, now=NOW)


@pytest.mark.parametrize("token", ["", "sin-punto", "a.b.c", "!!!.???", "e30.e30"])
def test_malformed_tokens_are_rejected(token: str) -> None:
    with pytest.raises(InvalidSigningToken):
        verify_signing_token(token, SECRET, now=NOW)


def test_signing_url_carries_the_token_in_the_fragment() -> None:
    request_id = uuid.uuid4()

    url = build_signing_url("http://firmadoc.test/", request_id, SECRET, now=NOW)

    path, fragment = url.split("#t=")
    assert path == f"http://firmadoc.test/sign/{request_id}"
    assert verify_signing_token(fragment, SECRET, now=NOW) == request_id
