from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.config import Settings
from app.core.dependencies import get_app_settings
from app.core.errors import validation_error
from app.db import get_session
from app.models.enums import Provider
from app.schemas import SignatureRequestCreated, SignerIn
from app.services.intake import IntakeCommand, NewDocument, SignerData, base_file_name, create_signature_request
from app.services.pdf_validation import validate_pdf

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _signer(full_name: str, identifier: str, email: str | None) -> SignerData:
    try:
        signer = SignerIn(full_name=full_name, identifier=identifier, email=email or None)
    except ValidationError as exc:
        errors = [
            {"field": f"signer_{'.'.join(str(p) for p in error['loc'])}", "message": error["msg"]}
            for error in exc.errors()
        ]
        raise validation_error("Datos del firmante inválidos", {"errors": errors}) from exc
    return SignerData(full_name=signer.full_name, identifier=signer.identifier, email=signer.email)


@router.post("/signing-uploads", status_code=status.HTTP_201_CREATED, response_model=SignatureRequestCreated)
async def create_signing_upload(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    file: Annotated[UploadFile, File()],
    signer_full_name: Annotated[str, Form()],
    signer_identifier: Annotated[str, Form()],
    signer_email: Annotated[str | None, Form()] = None,
    provider: Annotated[Provider, Form()] = Provider.LOCAL,
) -> SignatureRequestCreated:
    signer = _signer(signer_full_name, signer_identifier, signer_email)
    file_name = base_file_name(file.filename or "")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    pdf = validate_pdf(await file.read(max_bytes + 1), max_bytes=max_bytes)

    command = IntakeCommand(signer=signer, document=NewDocument(pdf=pdf, file_name=file_name), provider=provider)
    return create_signature_request(session, settings, command)
