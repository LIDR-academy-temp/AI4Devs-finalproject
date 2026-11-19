import unicodedata
import uuid
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Principal, require_document_reader
from app.core.errors import not_found
from app.db import get_session
from app.models import Document, DocumentVersion, SignatureRequest

router = APIRouter(prefix="/documents", tags=["documents"])


def content_disposition(file_name: str) -> str:
    """`attachment` con nombre ASCII de respaldo y `filename*` UTF-8 (RFC 6266)."""
    ascii_name = unicodedata.normalize("NFKD", file_name).encode("ascii", "ignore").decode("ascii")
    ascii_name = "".join("_" if char in '"\\' or not char.isprintable() else char for char in ascii_name) or "documento.pdf"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(file_name, safe='')}"


def _can_read(session: Session, principal: Principal, document: Document) -> bool:
    if principal.kind == "admin":
        return True
    if principal.kind == "integrator":
        return document.integrating_system_id == principal.integrating_system_id
    request_document_id = session.scalar(
        select(SignatureRequest.document_id).where(SignatureRequest.id == principal.signature_request_id)
    )
    return request_document_id == document.id


@router.get("/{document_id}/versions/{version_number}/download")
def download_version(
    document_id: uuid.UUID,
    version_number: int,
    principal: Annotated[Principal, Depends(require_document_reader)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    document = session.get(Document, document_id)
    if document is None or not _can_read(session, principal, document):
        raise not_found("Documento inexistente")
    version = session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id, DocumentVersion.version_number == version_number
        )
    )
    if version is None:
        raise not_found("Versión inexistente")
    return Response(
        content=version.content,
        media_type="application/pdf",
        headers={"Content-Disposition": content_disposition(version.file_name)},
    )
