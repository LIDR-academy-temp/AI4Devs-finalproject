import hashlib
from dataclasses import dataclass
from io import BytesIO

from pyhanko.pdf_utils.reader import PdfFileReader

from app.core.errors import AppError

PDF_HEADER = b"%PDF-"


@dataclass(frozen=True)
class ValidatedPdf:
    content: bytes
    sha256: str


def invalid_pdf(message: str) -> AppError:
    return AppError(422, "invalid_pdf", message)


def file_too_large(max_bytes: int) -> AppError:
    return AppError(422, "file_too_large", "El archivo supera el tamaño máximo permitido", {"max_bytes": max_bytes})


def max_base64_length(max_bytes: int) -> int:
    return 4 * ((max_bytes + 2) // 3)


def validate_pdf(data: bytes, max_bytes: int) -> ValidatedPdf:
    if len(data) > max_bytes:
        raise file_too_large(max_bytes)
    if not data.startswith(PDF_HEADER):
        raise invalid_pdf("El archivo no es un PDF")

    try:
        reader = PdfFileReader(BytesIO(data), strict=False)
        encrypted = reader.encrypted
        if not encrypted:
            reader.root["/Pages"]
    except Exception as exc:  # pyHanko lanza varios tipos según la parte del archivo que falla
        raise invalid_pdf("El PDF está dañado o no se puede leer") from exc
    if encrypted:
        raise invalid_pdf("El PDF está cifrado o protegido con contraseña")

    return ValidatedPdf(content=data, sha256=hashlib.sha256(data).hexdigest())
