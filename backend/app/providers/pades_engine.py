"""Firma PAdES B-B con pyHanko (incremental)."""

from io import BytesIO
from pathlib import Path

from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import signers


def sign_pdf_incremental(pdf_bytes: bytes, *, keystore_path: Path, passphrase: str, field_name: str) -> bytes:
    signer = signers.SimpleSigner.load_pkcs12(str(keystore_path), passphrase=passphrase.encode("utf-8"))
    writer = IncrementalPdfFileWriter(BytesIO(pdf_bytes))
    meta = signers.PdfSignatureMetadata(field_name=field_name)
    output = BytesIO()
    signers.PdfSigner(meta, signer=signer).sign_pdf(writer, output=output)
    return output.getvalue()