"""Alta de solicitudes de firma, común al panel y a los sistemas integradores."""

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError, not_found, validation_error
from app.models import Document, DocumentVersion, SignatureRequest, Signer
from app.models.enums import Provider, VersionOrigin
from app.schemas import SignatureRequestCreated
from app.services.pdf_validation import ValidatedPdf
from app.services.signing_links import build_signing_url

SUPPORTED_PROVIDERS = frozenset({Provider.LOCAL, Provider.TOKEN})
MAX_FILE_NAME_LENGTH = 255
EXTERNAL_ID_INDEX = "uq_document_external_id_per_system"


@dataclass(frozen=True)
class SignerData:
    full_name: str
    identifier: str
    email: str | None = None


@dataclass(frozen=True)
class NewDocument:
    pdf: ValidatedPdf
    file_name: str
    external_document_id: str | None = None


@dataclass(frozen=True)
class IntakeCommand:
    """`document` es un PDF nuevo o el id de un documento existente del mismo integrador."""

    signer: SignerData
    document: NewDocument | uuid.UUID
    provider: Provider = Provider.LOCAL
    integrating_system_id: uuid.UUID | None = None
    callback_url: str | None = None


def base_file_name(file_name: str) -> str:
    name = re.split(r"[\\/]", file_name)[-1].strip()
    if not name:
        raise validation_error("El nombre del archivo está vacío", {"errors": [{"field": "file_name", "message": "vacío"}]})
    if len(name) > MAX_FILE_NAME_LENGTH:
        raise validation_error(
            f"El nombre del archivo supera los {MAX_FILE_NAME_LENGTH} caracteres",
            {"errors": [{"field": "file_name", "message": "demasiado largo"}]},
        )
    return name


def check_provider(provider: Provider) -> None:
    if provider not in SUPPORTED_PROVIDERS:
        raise AppError(422, "unsupported_provider", f"El proveedor {provider.value} no está disponible en el MVP")


def _signer_id(session: Session, signer: SignerData) -> uuid.UUID:
    session.execute(
        insert(Signer)
        .values(full_name=signer.full_name, identifier=signer.identifier, email=signer.email)
        .on_conflict_do_nothing(index_elements=[Signer.identifier])
    )
    return session.scalars(select(Signer.id).where(Signer.identifier == signer.identifier)).one()


def _duplicate_external_id(document_id: uuid.UUID | None) -> AppError:
    return AppError(
        409,
        "duplicate_external_document_id",
        "El external_document_id ya existe para este integrador; usá document_id para una nueva solicitud",
        {"document_id": str(document_id)} if document_id else {},
    )


def _existing_by_external_id(session: Session, integrating_system_id: uuid.UUID, external_id: str) -> uuid.UUID | None:
    return session.scalar(
        select(Document.id).where(
            Document.integrating_system_id == integrating_system_id,
            Document.external_document_id == external_id,
        )
    )


def _create_document(session: Session, command: IntakeCommand, new: NewDocument) -> Document:
    if new.external_document_id and command.integrating_system_id:
        existing = _existing_by_external_id(session, command.integrating_system_id, new.external_document_id)
        if existing:
            raise _duplicate_external_id(existing)

    document = Document(
        integrating_system_id=command.integrating_system_id,
        external_document_id=new.external_document_id,
    )
    session.add(document)
    session.flush()
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        origin=VersionOrigin.UPLOADED,
        file_name=new.file_name,
        content=new.pdf.content,
        document_hash=new.pdf.sha256,
    )
    session.add(version)
    session.flush()
    document.current_version_id = version.id
    return document


def _owned_document(session: Session, command: IntakeCommand, document_id: uuid.UUID) -> Document:
    document = session.get(Document, document_id)
    if document is None or document.integrating_system_id != command.integrating_system_id:
        raise not_found("Documento inexistente")
    return document


def create_signature_request(session: Session, settings: Settings, command: IntakeCommand) -> SignatureRequestCreated:
    check_provider(command.provider)
    try:
        signer_id = _signer_id(session, command.signer)
        if isinstance(command.document, NewDocument):
            document = _create_document(session, command, command.document)
        else:
            document = _owned_document(session, command, command.document)

        request = SignatureRequest(
            document_id=document.id,
            integrating_system_id=command.integrating_system_id,
            signer_id=signer_id,
            provider=command.provider,
            callback_url=command.callback_url,
        )
        session.add(request)
        session.flush()
        result = SignatureRequestCreated(
            id=request.id,
            document_id=document.id,
            status=request.status,
            signing_url=build_signing_url(settings.public_base_url, request.id, settings.signing_link_secret),
            created_at=request.created_at,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if EXTERNAL_ID_INDEX in str(exc.orig) and isinstance(command.document, NewDocument):
            existing = _existing_by_external_id(
                session, command.integrating_system_id, command.document.external_document_id
            )
            raise _duplicate_external_id(existing) from exc
        raise
    except Exception:
        session.rollback()
        raise
    return result
