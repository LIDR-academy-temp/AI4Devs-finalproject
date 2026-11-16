"""PDF de prueba generados en el momento con pyHanko."""

from io import BytesIO

from pyhanko.pdf_utils import generic
from pyhanko.pdf_utils.writer import PageObject, PdfFileWriter

NOT_A_PDF = b"Esto es un archivo de texto, no un PDF.\n"
PNG_HEADER = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def valid_pdf(text: str = "Resolucion 0457", padding_bytes: int = 0, password: str | None = None) -> bytes:
    writer = PdfFileWriter()
    content = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("latin-1")
    if padding_bytes:
        content += b"\n%" + b"0" * padding_bytes
    stream = writer.add_object(generic.StreamObject(stream_data=content))
    writer.insert_page(PageObject(contents=stream, media_box=(0, 0, 595, 842)))
    if password:
        writer.encrypt(password, password)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def encrypted_pdf() -> bytes:
    return valid_pdf(password="clave-de-prueba")


def truncated_pdf() -> bytes:
    data = valid_pdf()
    return data[: len(data) // 2]


def oversized_pdf(max_bytes: int) -> bytes:
    """PDF válido cuyo tamaño supera `max_bytes`."""
    return valid_pdf(padding_bytes=max_bytes + 1)
