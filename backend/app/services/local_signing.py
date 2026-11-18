"""Flujo prepare / complete para el proveedor `local`."""

from __future__ import annotations

import base64
import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Principal
from app.core.config import Settings
from app.core.errors import AppError, conflict, not_found
from app.models import Certificate, Document, DocumentVersion, SignatureRequest, SigningChallenge
from app.models.enums import Provider, SignatureLevel, SignatureRequestStatus, SigningStatus, VersionOrigin
from app.providers.local_pades import LocalPAdESProvider

CHALLENGE_TTL = timedelta(minutes=5)
SIG_FIELD_PREFIX = "FirmadocSig"


@dataclass(frozen=True)
class PrepareResult:
    challenge_id: uuid.UUID
    document_name: str
    hash_algorithm: str
    hash_to_sign: str
    expires_at: datetime


def session_ref_from_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _load_request(session: Session, principal: Principal, request_id: uuid.UUID) -> SignatureRequest:
    request = session.get(SignatureRequest, request_id)
    if request is None or (
        principal.kind == "signing_link" and principal.signature_request_id != request_id
    ):
        raise not_found("Solicitud de firma inexistente")
    return request


def _current_version(session: Session, document: Document) -> DocumentVersion:
    version = session.get(DocumentVersion, document.current_version_id)
    if version is None:
        raise AppError(500, "internal_error", "El documento no tiene versión vigente")
    return version


def _local_certificate(session: Session) -> Certificate:
    cert = session.scalar(select(Certificate).where(Certificate.provider == Provider.LOCAL).limit(1))
    if cert is None:
        raise AppError(500, "internal_error", "No hay certificado local de demostración; ejecutá el seed.")
    return cert


def _challenge_hash(pdf_hash: str, challenge_id: uuid.UUID) -> str:
    digest = hashlib.sha256(f"{pdf_hash}:{challenge_id}".encode()).digest()
    return base64.b64encode(digest).decode("ascii")


def prepare_local_signature(
    session: Session,
    settings: Settings,
    principal: Principal,
    request_id: uuid.UUID,
    signing_token: str,
) -> tuple[PrepareResult, SignatureRequest]:
    request = _load_request(session, principal, request_id)
    if request.provider != Provider.LOCAL:
        raise AppError(422, "unsupported_provider", "Este change solo implementa el proveedor local")
    if request.status != SignatureRequestStatus.PENDING:
        raise conflict("La solicitud no está pendiente de firma")

    version = _current_version(session, request.document)
    certificate = _local_certificate(session)
    now = datetime.now(UTC)
    expires_at = now + CHALLENGE_TTL
    challenge_id = uuid.uuid4()
    challenge = SigningChallenge(
        id=challenge_id,
        signature_request_id=request.id,
        certificate_id=certificate.id,
        hash_to_sign=_challenge_hash(version.document_hash, challenge_id),
        session_ref=session_ref_from_token(signing_token),
        expires_at=expires_at,
    )
    request.status = SignatureRequestStatus.SIGNING
    request.certificate_id = certificate.id
    session.add(challenge)
    session.flush()

    result = PrepareResult(
        challenge_id=challenge_id,
        document_name=version.file_name,
        hash_algorithm="SHA-256",
        hash_to_sign=challenge.hash_to_sign,
        expires_at=expires_at,
    )
    return result, request


def _active_challenge(
    session: Session, request_id: uuid.UUID, session_ref: str
) -> SigningChallenge:
    challenge = session.scalar(
        select(SigningChallenge)
        .where(
            SigningChallenge.signature_request_id == request_id,
            SigningChallenge.consumed_at.is_(None),
        )
        .order_by(SigningChallenge.created_at.desc())
    )
    if challenge is None:
        raise conflict("No hay un desafío de firma vigente; llamá a prepare primero")
    now = datetime.now(UTC)
    if challenge.expires_at <= now:
        raise conflict("El desafío de firma venció", code="challenge_expired")
    if challenge.session_ref != session_ref:
        raise conflict("El desafío no pertenece a esta sesión")
    return challenge


def complete_local_signature(
    session: Session,
    settings: Settings,
    principal: Principal,
    request_id: uuid.UUID,
    signing_token: str,
) -> SignatureRequest:
    request = _load_request(session, principal, request_id)
    if request.provider != Provider.LOCAL:
        raise AppError(422, "unsupported_provider", "Este change solo implementa el proveedor local")
    if request.status != SignatureRequestStatus.SIGNING:
        raise conflict("La solicitud no está en proceso de firma")

    session_ref = session_ref_from_token(signing_token)
    challenge = _active_challenge(session, request_id, session_ref)

    source_version = _current_version(session, request.document)
    field_name = f"{SIG_FIELD_PREFIX}{source_version.version_number + 1}"
    provider = LocalPAdESProvider(settings)
    signed_bytes = provider.sign(source_version.content, field_name)

    now = datetime.now(UTC)
    challenge.consumed_at = now
    new_version_number = source_version.version_number + 1
    signed_version = DocumentVersion(
        document_id=request.document_id,
        version_number=new_version_number,
        origin=VersionOrigin.SIGNED,
        signature_request_id=request.id,
        signature_level=SignatureLevel.B_B,
        file_name=source_version.file_name,
        content=signed_bytes,
        document_hash=hashlib.sha256(signed_bytes).hexdigest(),
    )
    session.add(signed_version)
    session.flush()

    document = request.document
    document.current_version_id = signed_version.id
    document.signing_status = SigningStatus.SIGNED
    request.status = SignatureRequestStatus.SIGNED
    request.signed_at = now
  # certificate_id set in prepare

    session.flush()
    return request


def verify_pdf_signatures(pdf_bytes: bytes) -> int:
    from io import BytesIO

    from pyhanko.pdf_utils.reader import PdfFileReader
    from pyhanko.sign.validation import validate_pdf_signature

    reader = PdfFileReader(BytesIO(pdf_bytes))
    count = 0
    for embedded in reader.embedded_signatures:
        status = validate_pdf_signature(embedded, skip_diff=True)
        if not status.intact:
            raise ValueError("Firma PAdES inválida")
        count += 1
    return count