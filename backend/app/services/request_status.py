"""Consulta de una solicitud de firma y de la versión vigente de su documento."""

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import Principal
from app.core.errors import not_found
from app.models import Document, DocumentVersion, SignatureRequest


@dataclass(frozen=True)
class CurrentVersion:
    version_number: int
    signature_level: str | None
    file_name: str
    size_bytes: int


@dataclass(frozen=True)
class RequestStatus:
    request: SignatureRequest
    document: Document
    version: CurrentVersion


def _can_read(principal: Principal, request: SignatureRequest) -> bool:
    if principal.kind == "integrator":
        return request.integrating_system_id is not None and request.integrating_system_id == principal.integrating_system_id
    if principal.kind == "signing_link":
        return request.id == principal.signature_request_id
    return False


def get_request_status(session: Session, principal: Principal, request_id: uuid.UUID) -> RequestStatus:
    request = session.get(SignatureRequest, request_id)
    if request is None or not _can_read(principal, request):
        raise not_found("Solicitud de firma inexistente")

    document = request.document
    row = session.execute(
        select(
            DocumentVersion.version_number,
            DocumentVersion.signature_level,
            DocumentVersion.file_name,
            func.octet_length(DocumentVersion.content),
        ).where(DocumentVersion.id == document.current_version_id)
    ).one()
    version = CurrentVersion(
        version_number=row[0],
        signature_level=row[1],
        file_name=row[2],
        size_bytes=row[3],
    )
    return RequestStatus(request=request, document=document, version=version)
