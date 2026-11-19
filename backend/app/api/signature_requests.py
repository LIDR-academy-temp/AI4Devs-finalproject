import base64
import binascii
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.core.auth import Principal, require_integrator, require_request_reader
from app.core.config import Settings
from app.core.dependencies import get_app_settings
from app.db import get_session
from app.models import IntegratingSystem
from app.models import Certificate
from app.schemas import (
    CertificateSummary,
    ChallengeOut,
    CompleteRequest,
    CreateSignatureRequest,
    DocumentResult,
    PrepareRequest,
    PrepareResponse,
    SignatureRequestCreated,
    SignatureRequestOut,
)
from app.services.intake import IntakeCommand, NewDocument, SignerData, base_file_name, create_signature_request
from app.services.local_signing import complete_local_signature, prepare_local_signature
from app.services.pdf_validation import ValidatedPdf, file_too_large, invalid_pdf, max_base64_length, validate_pdf
from app.services.request_status import get_request_status

router = APIRouter(prefix="/signature-requests", tags=["signature-requests"])


def _certificate_summary(session, certificate_id: uuid.UUID | None) -> CertificateSummary | None:
    if certificate_id is None:
        return None
    cert = session.get(Certificate, certificate_id)
    if cert is None:
        return None
    return CertificateSummary(subject=cert.subject, serial_number=cert.serial_number)


def _signature_request_out(request: Request, found, session: Session) -> SignatureRequestOut:
    download_url = request.url_for(
        "download_version", document_id=found.document.id, version_number=found.version.version_number
    )
    return SignatureRequestOut(
        id=found.request.id,
        status=found.request.status,
        provider=found.request.provider,
        certificate=_certificate_summary(session, found.request.certificate_id),
        created_at=found.request.created_at,
        signed_at=found.request.signed_at,
        document=DocumentResult(
            id=found.document.id,
            external_document_id=found.document.external_document_id,
            version_number=found.version.version_number,
            is_active_version=True,
            signing_status=found.document.signing_status,
            signature_level=found.version.signature_level,
            file_name=found.version.file_name,
            size_bytes=found.version.size_bytes,
            download_url=str(download_url),
        ),
    )


def _decode_pdf(document_base64: str, max_bytes: int) -> ValidatedPdf:
    if len(document_base64) > max_base64_length(max_bytes):
        raise file_too_large(max_bytes)
    try:
        data = base64.b64decode(document_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise invalid_pdf("document_base64 no es base64 válido") from exc
    return validate_pdf(data, max_bytes=max_bytes)


@router.get("/{request_id}", response_model=SignatureRequestOut)
def get_signature_request(
    request_id: uuid.UUID,
    request: Request,
    principal: Annotated[Principal, Depends(require_request_reader)],
    session: Annotated[Session, Depends(get_session)],
) -> SignatureRequestOut:
    found = get_request_status(session, principal, request_id)
    return _signature_request_out(request, found, session)


@router.post("/{request_id}/prepare", response_model=PrepareResponse)
def prepare_signature(
    request_id: uuid.UUID,
    principal: Annotated[Principal, Depends(require_request_reader)],
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    x_signing_token: Annotated[str | None, Header()] = None,
    _body: PrepareRequest = PrepareRequest(),
) -> PrepareResponse:
    if not x_signing_token:
        from app.core.errors import unauthorized

        raise unauthorized()
    prep, _request = prepare_local_signature(session, settings, principal, request_id, x_signing_token)
    session.commit()
    return PrepareResponse(
        challenges=[
            ChallengeOut(
                challenge_id=prep.challenge_id,
                document_name=prep.document_name,
                hash_algorithm=prep.hash_algorithm,
                hash_to_sign=prep.hash_to_sign,
            )
        ],
        expires_at=prep.expires_at,
    )


@router.post("/{request_id}/complete", response_model=SignatureRequestOut)
def complete_signature(
    request_id: uuid.UUID,
    request: Request,
    principal: Annotated[Principal, Depends(require_request_reader)],
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    x_signing_token: Annotated[str | None, Header()] = None,
    _body: CompleteRequest = CompleteRequest(),
) -> SignatureRequestOut:
    if not x_signing_token:
        from app.core.errors import unauthorized

        raise unauthorized()
    complete_local_signature(session, settings, principal, request_id, x_signing_token)
    session.commit()
    found = get_request_status(session, principal, request_id)
    return _signature_request_out(request, found, session)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SignatureRequestCreated)
def create_signature_request_endpoint(
    payload: CreateSignatureRequest,
    system: Annotated[IntegratingSystem, Depends(require_integrator)],
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> SignatureRequestCreated:
    document: NewDocument | uuid.UUID
    if payload.document_id is not None:
        document = payload.document_id
    else:
        file_name = base_file_name(payload.file_name or "")
        pdf = _decode_pdf(payload.document_base64 or "", settings.max_upload_mb * 1024 * 1024)
        document = NewDocument(pdf=pdf, file_name=file_name, external_document_id=payload.external_document_id)

    command = IntakeCommand(
        signer=SignerData(
            full_name=payload.signer.full_name, identifier=payload.signer.identifier, email=payload.signer.email
        ),
        document=document,
        provider=payload.provider,
        integrating_system_id=system.id,
        callback_url=str(payload.callback_url) if payload.callback_url else None,
    )
    return create_signature_request(session, settings, command)
