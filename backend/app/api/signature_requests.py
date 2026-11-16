import base64
import binascii
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth import require_integrator
from app.core.config import Settings
from app.core.dependencies import get_app_settings
from app.db import get_session
from app.models import IntegratingSystem
from app.schemas import CreateSignatureRequest, SignatureRequestCreated
from app.services.intake import IntakeCommand, NewDocument, SignerData, base_file_name, create_signature_request
from app.services.pdf_validation import ValidatedPdf, file_too_large, invalid_pdf, max_base64_length, validate_pdf

router = APIRouter(prefix="/signature-requests", tags=["signature-requests"])


def _decode_pdf(document_base64: str, max_bytes: int) -> ValidatedPdf:
    if len(document_base64) > max_base64_length(max_bytes):
        raise file_too_large(max_bytes)
    try:
        data = base64.b64decode(document_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise invalid_pdf("document_base64 no es base64 válido") from exc
    return validate_pdf(data, max_bytes=max_bytes)


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
