from typing import Protocol


class SignatureProvider(Protocol):
    def sign(self, pdf_bytes: bytes, field_name: str) -> bytes: ...