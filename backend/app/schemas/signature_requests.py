import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, StringConstraints, UrlConstraints, model_validator

from app.models.entities import CUIL_PATTERN
from app.models.enums import Provider, SignatureRequestStatus

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


class SignatureRequestCreated(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    status: SignatureRequestStatus
    signing_url: str
    created_at: datetime
