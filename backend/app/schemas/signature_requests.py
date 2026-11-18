import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, StringConstraints, UrlConstraints, model_validator

from app.models.entities import CUIL_PATTERN
from app.models.enums import Provider, SignatureLevel, SignatureRequestStatus, SigningStatus

Cuil = Annotated[str, StringConstraints(pattern=CUIL_PATTERN)]
SignerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
CallbackUrl = Annotated[AnyUrl, UrlConstraints(allowed_schemes=["http", "https"], max_length=2048)]


class SignerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: SignerName
    identifier: Cuil
    email: Annotated[str, StringConstraints(strip_whitespace=True, max_length=320)] | None = None


class CreateSignatureRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_base64: str | None = None
    file_name: str | None = None
    document_id: uuid.UUID | None = None
    external_document_id: Annotated[str, StringConstraints(min_length=1, max_length=200)] | None = None
    signer: SignerIn
    provider: Provider = Provider.LOCAL
    callback_url: CallbackUrl | None = None

    @model_validator(mode="after")
    def exactly_one_document_source(self) -> Self:
        if (self.document_base64 is None) == (self.document_id is None):
            raise ValueError("Debe venir exactamente uno de document_base64 o document_id")
        if self.document_base64 is not None and self.file_name is None:
            raise ValueError("file_name es obligatorio junto con document_base64")
        return self


class DocumentResult(BaseModel):
    id: uuid.UUID
    external_document_id: str | None
    version_number: int
    is_active_version: bool
    signing_status: SigningStatus
    signature_level: SignatureLevel | None
    file_name: str
    size_bytes: int
    download_url: str


class CertificateSummary(BaseModel):
    subject: str
    serial_number: str


class PrepareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    certificate_pem: str | None = None


class ChallengeOut(BaseModel):
    challenge_id: uuid.UUID
    document_name: str
    hash_algorithm: str = "SHA-256"
    hash_to_sign: str


class PrepareResponse(BaseModel):
    challenges: list[ChallengeOut]
    expires_at: datetime


class CompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signatures: list[dict[str, str]] | None = None


class SignatureRequestOut(BaseModel):
    id: uuid.UUID
    status: SignatureRequestStatus
    provider: Provider
    certificate: CertificateSummary | None = None
    document: DocumentResult
    created_at: datetime
    signed_at: datetime | None


class SignatureRequestCreated(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    status: SignatureRequestStatus
    signing_url: str
    created_at: datetime
