import hashlib
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, inspect, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    AuditEvent,
    Certificate,
    DocumentVersion,
    SignatureRequest,
    SigningChallenge,
)
from app.models.enums import Provider, VersionOrigin
from tests.integration.conftest import PDF_BYTES, make_document_with_v1, make_signer

MVP_TABLES = {
    "integrating_system",
    "signer",
    "certificate",
    "document",
    "document_version",
    "signature_request",
    "signing_challenge",
    "audit_event",
    "webhook_delivery",
}
INSUFFICIENT_PRIVILEGE = "42501"


@contextmanager
def expect_db_error(session: Session, sqlstate: str | None = None):
    with pytest.raises(DBAPIError) as caught:
        with session.begin_nested():
            yield
    if sqlstate:
        assert caught.value.orig.sqlstate == sqlstate, caught.value


def make_signature_request(session: Session) -> SignatureRequest:
    document = make_document_with_v1(session)
    request = SignatureRequest(document_id=document.id, signer_id=make_signer(session).id, provider=Provider.LOCAL)
    session.add(request)
    session.flush()
    return request


def make_certificate(session: Session) -> Certificate:
    now = datetime.now(UTC)
    certificate = Certificate(
        subject="CN=Firmadoc Demo",
        issuer_subject="CN=Firmadoc Demo CA",
        serial_number="abc123",
        provider=Provider.LOCAL,
        issued_at=now - timedelta(days=1),
        expires_at=now + timedelta(days=365),
    )
    session.add(certificate)
    session.flush()
    return certificate


def test_upgrade_head_creates_mvp_schema(engine: Engine) -> None:
    tables = set(inspect(engine).get_table_names())

    assert MVP_TABLES <= tables
    assert "alembic_version" in tables


def test_document_version_rejects_update(session: Session) -> None:
    version_id = make_document_with_v1(session).current_version_id

    with expect_db_error(session, INSUFFICIENT_PRIVILEGE):
        session.execute(text("UPDATE document_version SET file_name = 'otro.pdf' WHERE id = :id"), {"id": version_id})


def test_document_version_rejects_delete(session: Session) -> None:
    version_id = make_document_with_v1(session).current_version_id

    with expect_db_error(session, INSUFFICIENT_PRIVILEGE):
        session.execute(text("DELETE FROM document_version WHERE id = :id"), {"id": version_id})


@pytest.mark.parametrize("table", ["document_version", "audit_event"])
def test_append_only_tables_reject_truncate(session: Session, table: str) -> None:
    with expect_db_error(session, INSUFFICIENT_PRIVILEGE):
        session.execute(text(f"TRUNCATE {table} CASCADE"))


def test_audit_event_rejects_update_and_delete(session: Session) -> None:
    event = AuditEvent(signature_request_id=make_signature_request(session).id, event_type="created")
    session.add(event)
    session.flush()

    with expect_db_error(session, INSUFFICIENT_PRIVILEGE):
        session.execute(text("UPDATE audit_event SET event_type = 'signed' WHERE id = :id"), {"id": event.id})
    with expect_db_error(session, INSUFFICIENT_PRIVILEGE):
        session.execute(text("DELETE FROM audit_event WHERE id = :id"), {"id": event.id})


def test_moving_current_version_does_not_touch_previous_versions(session: Session) -> None:
    document = make_document_with_v1(session)
    v1 = session.get(DocumentVersion, document.current_version_id)
    request = SignatureRequest(document_id=document.id, signer_id=make_signer(session).id, provider=Provider.LOCAL)
    session.add(request)
    session.flush()
    signed_content = PDF_BYTES + b"%firma\n"
    v2 = DocumentVersion(
        document_id=document.id,
        version_number=2,
        origin=VersionOrigin.SIGNED,
        signature_request_id=request.id,
        file_name="resolucion.pdf",
        content=signed_content,
        document_hash=hashlib.sha256(signed_content).hexdigest(),
    )
    session.add(v2)
    session.flush()

    document.current_version_id = v2.id
    session.flush()
    session.expire_all()

    assert document.current_version_id == v2.id
    assert session.get(DocumentVersion, v1.id).content == PDF_BYTES


def test_version_number_is_unique_per_document(session: Session) -> None:
    document = make_document_with_v1(session)
    duplicate = DocumentVersion(
        document_id=document.id,
        version_number=1,
        origin=VersionOrigin.UPLOADED,
        file_name="copia.pdf",
        content=PDF_BYTES,
        document_hash=hashlib.sha256(PDF_BYTES).hexdigest(),
    )

    with pytest.raises(IntegrityError):
        with session.begin_nested():
            session.add(duplicate)
            session.flush()


def test_signed_version_requires_signature_request(session: Session) -> None:
    document = make_document_with_v1(session)
    orphan_signed = DocumentVersion(
        document_id=document.id,
        version_number=2,
        origin=VersionOrigin.SIGNED,
        file_name="resolucion.pdf",
        content=PDF_BYTES,
        document_hash=hashlib.sha256(PDF_BYTES).hexdigest(),
    )

    with pytest.raises(IntegrityError):
        with session.begin_nested():
            session.add(orphan_signed)
            session.flush()


@pytest.mark.parametrize("cuil", ["20-12345678-6", "2012345678", "abcdefghijk"])
def test_signer_identifier_must_be_eleven_digit_cuil(session: Session, cuil: str) -> None:
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            make_signer(session, cuil=cuil)


def test_signing_challenge_cannot_change_after_consumed(session: Session) -> None:
    challenge = SigningChallenge(
        signature_request_id=make_signature_request(session).id,
        certificate_id=make_certificate(session).id,
        hash_to_sign="q1w2e3r4",
        session_ref="sesion-1",
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    session.add(challenge)
    session.flush()

    session.execute(
        text("UPDATE signing_challenge SET consumed_at = now() WHERE id = :id"), {"id": challenge.id}
    )

    with expect_db_error(session, INSUFFICIENT_PRIVILEGE):
        session.execute(
            text("UPDATE signing_challenge SET consumed_at = NULL WHERE id = :id"), {"id": challenge.id}
        )


def test_signed_status_requires_signed_at(session: Session) -> None:
    request = make_signature_request(session)

    with pytest.raises(IntegrityError):
        with session.begin_nested():
            session.execute(
                text("UPDATE signature_request SET status = 'signed' WHERE id = :id"), {"id": request.id}
            )

    assert session.scalar(select(SignatureRequest.status).where(SignatureRequest.id == request.id)) == "pending"
