import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, created_at_column, uuid_pk
from app.models.enums import (
    Provider,
    RevocationStatus,
    SignatureLevel,
    SignatureRequestStatus,
    SigningStatus,
    VersionOrigin,
    WebhookStatus,
)

CUIL_PATTERN = "^[0-9]{11}$"


def enum_type(enum_cls: type[enum.Enum], name: str) -> Enum:
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [member.value for member in members],
        validate_strings=True,
    )


class IntegratingSystem(Base):
    __tablename__ = "integrating_system"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    api_key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    allowed_origins: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    created_at: Mapped[datetime] = created_at_column()


class Signer(Base):
    __tablename__ = "signer"
    __table_args__ = (CheckConstraint(f"identifier ~ '{CUIL_PATTERN}'", name="identifier_is_cuil"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    identifier: Mapped[str] = mapped_column(String(11), nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(320))
    created_at: Mapped[datetime] = created_at_column()


class Certificate(Base):
    __tablename__ = "certificate"
    __table_args__ = (
        CheckConstraint(f"cuil IS NULL OR cuil ~ '{CUIL_PATTERN}'", name="cuil_format"),
        CheckConstraint("expires_at > issued_at", name="validity_period"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    signer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("signer.id"))
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    issuer_subject: Mapped[str] = mapped_column(Text, nullable=False)
    cuil: Mapped[str | None] = mapped_column(String(11))
    serial_number: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    provider: Mapped[Provider] = mapped_column(enum_type(Provider, "provider"), nullable=False)
    revocation_status: Mapped[RevocationStatus] = mapped_column(
        enum_type(RevocationStatus, "revocation_status"),
        nullable=False,
        server_default=RevocationStatus.UNKNOWN.value,
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = created_at_column()


class Document(Base):
    """Identidad lógica de un documento. `integrating_system_id` es nulo cuando se cargó desde el panel."""

    __tablename__ = "document"
    __table_args__ = (
        CheckConstraint(
            "signature_deadline IS NULL OR signing_status = 'pending_signature'",
            name="deadline_only_when_pending",
        ),
        Index(
            "uq_document_external_id_per_system",
            "integrating_system_id",
            "external_document_id",
            unique=True,
            postgresql_where=text("external_document_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    integrating_system_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("integrating_system.id"))
    external_document_id: Mapped[str | None] = mapped_column(String(200))
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("document_version.id", use_alter=True, name="fk_document_current_version_id_document_version")
    )
    signing_status: Mapped[SigningStatus] = mapped_column(
        enum_type(SigningStatus, "signing_status"),
        nullable=False,
        server_default=SigningStatus.PENDING_SIGNATURE.value,
    )
    signature_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()

    versions: Mapped[list["DocumentVersion"]] = relationship(
        back_populates="document",
        foreign_keys="DocumentVersion.document_id",
        order_by="DocumentVersion.version_number",
    )
    current_version: Mapped["DocumentVersion | None"] = relationship(
        foreign_keys=[current_version_id], post_update=True
    )


class DocumentVersion(Base):
    """Versión inmutable de un documento: la base rechaza UPDATE, DELETE y TRUNCATE."""

    __tablename__ = "document_version"
    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_document_version_number"),
        CheckConstraint("version_number >= 1", name="version_number_positive"),
        CheckConstraint(
            "(origin = 'signed') = (signature_request_id IS NOT NULL)",
            name="signed_origin_has_request",
        ),
        CheckConstraint(
            "signature_level IS NULL OR origin = 'signed'",
            name="level_only_when_signed",
        ),
        CheckConstraint("document_hash ~ '^[0-9a-f]{64}$'", name="document_hash_sha256"),
        CheckConstraint("octet_length(content) > 0", name="content_not_empty"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    origin: Mapped[VersionOrigin] = mapped_column(enum_type(VersionOrigin, "version_origin"), nullable=False)
    signature_request_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "signature_request.id",
            use_alter=True,
            name="fk_document_version_signature_request_id_signature_request",
        )
    )
    signature_level: Mapped[SignatureLevel | None] = mapped_column(enum_type(SignatureLevel, "signature_level"))
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    document_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = created_at_column()

    document: Mapped[Document] = relationship(back_populates="versions", foreign_keys=[document_id])


class SignatureRequest(Base):
    __tablename__ = "signature_request"
    __table_args__ = (
        CheckConstraint(
            "(status = 'signed') = (signed_at IS NOT NULL)",
            name="signed_at_only_when_signed",
        ),
        Index("ix_signature_request_document_id", "document_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document.id"), nullable=False)
    integrating_system_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("integrating_system.id"))
    signer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("signer.id"), nullable=False)
    certificate_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("certificate.id"))
    provider: Mapped[Provider] = mapped_column(enum_type(Provider, "provider"), nullable=False)
    status: Mapped[SignatureRequestStatus] = mapped_column(
        enum_type(SignatureRequestStatus, "signature_request_status"),
        nullable=False,
        server_default=SignatureRequestStatus.PENDING.value,
    )
    callback_url: Mapped[str | None] = mapped_column(String(2048))
    created_at: Mapped[datetime] = created_at_column()
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    document: Mapped[Document] = relationship(foreign_keys=[document_id])
    signer: Mapped[Signer] = relationship()
    certificate: Mapped[Certificate | None] = relationship()


class SigningChallenge(Base):
    """Hash a firmar. Una vez consumido, la base impide volver a modificar `consumed_at`."""

    __tablename__ = "signing_challenge"
    __table_args__ = (
        CheckConstraint("expires_at > created_at", name="expires_after_creation"),
        CheckConstraint("hash_algorithm = 'SHA-256'", name="hash_algorithm_supported"),
        Index("ix_signing_challenge_signature_request_id", "signature_request_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    signature_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("signature_request.id"), nullable=False)
    certificate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("certificate.id"), nullable=False)
    hash_to_sign: Mapped[str] = mapped_column(Text, nullable=False)
    hash_algorithm: Mapped[str] = mapped_column(String(16), nullable=False, server_default="SHA-256")
    session_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()


class AuditEvent(Base):
    """Evento append-only. `batch_id` se agrega junto con SignatureBatch en la versión 2."""

    __tablename__ = "audit_event"
    __table_args__ = (Index("ix_audit_event_signature_request_id", "signature_request_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    signature_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("signature_request.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = created_at_column()


class WebhookDelivery(Base):
    __tablename__ = "webhook_delivery"
    __table_args__ = (
        CheckConstraint("attempts >= 0", name="attempts_non_negative"),
        Index("ix_webhook_delivery_signature_request_id", "signature_request_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    signature_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("signature_request.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    status: Mapped[WebhookStatus] = mapped_column(
        enum_type(WebhookStatus, "webhook_status"),
        nullable=False,
        server_default=WebhookStatus.PENDING.value,
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()
