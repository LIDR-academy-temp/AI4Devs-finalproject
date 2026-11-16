import base64
import hashlib

import pytest

from app.core.errors import AppError
from app.services.pdf_validation import max_base64_length, validate_pdf
from tests.fixtures.pdfs import NOT_A_PDF, PNG_HEADER, encrypted_pdf, oversized_pdf, truncated_pdf, valid_pdf

TEN_MB = 10 * 1024 * 1024


def test_valid_pdf_returns_content_and_sha256() -> None:
    data = valid_pdf()

    result = validate_pdf(data, max_bytes=TEN_MB)

    assert result.content == data
    assert result.sha256 == hashlib.sha256(data).hexdigest()


@pytest.mark.parametrize("data", [NOT_A_PDF, PNG_HEADER, b""], ids=["texto", "imagen", "vacio"])
def test_non_pdf_is_rejected(data: bytes) -> None:
    with pytest.raises(AppError) as exc_info:
        validate_pdf(data, max_bytes=TEN_MB)

    assert (exc_info.value.status_code, exc_info.value.code) == (422, "invalid_pdf")


def test_truncated_pdf_is_rejected() -> None:
    data = truncated_pdf()
    assert data.startswith(b"%PDF-")

    with pytest.raises(AppError) as exc_info:
        validate_pdf(data, max_bytes=TEN_MB)

    assert exc_info.value.code == "invalid_pdf"


def test_encrypted_pdf_is_rejected() -> None:
    with pytest.raises(AppError) as exc_info:
        validate_pdf(encrypted_pdf(), max_bytes=TEN_MB)

    assert exc_info.value.code == "invalid_pdf"
    assert "cifrado" in exc_info.value.message


def test_pdf_over_the_limit_is_rejected_before_parsing() -> None:
    data = oversized_pdf(TEN_MB)
    assert len(data) > TEN_MB

    with pytest.raises(AppError) as exc_info:
        validate_pdf(data, max_bytes=TEN_MB)

    assert (exc_info.value.status_code, exc_info.value.code) == (422, "file_too_large")


def test_pdf_exactly_at_the_limit_is_accepted() -> None:
    data = valid_pdf()

    assert validate_pdf(data, max_bytes=len(data)).content == data


@pytest.mark.parametrize("max_bytes", [999, 1000, 1001])
def test_max_base64_length_is_an_upper_bound_for_max_bytes(max_bytes: int) -> None:
    """El corte previo sobre el base64 no rechaza archivos válidos; el límite exacto lo aplica `validate_pdf`."""
    assert len(base64.b64encode(b"x" * max_bytes)) <= max_base64_length(max_bytes)
    assert len(base64.b64encode(b"x" * (max_bytes + 3))) > max_base64_length(max_bytes)
