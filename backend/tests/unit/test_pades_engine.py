from pathlib import Path

import pytest

from app.providers.pades_engine import sign_pdf_incremental
from app.services.demo_pki import generate_local_keystore, save_local_keystore
from app.services.local_signing import verify_pdf_signatures
from tests.fixtures.pdfs import valid_pdf

PASSPHRASE = "unit-test-pass"


@pytest.fixture
def keystore_path(tmp_path: Path) -> Path:
    path = tmp_path / "local.p12"
    save_local_keystore(generate_local_keystore(), path, PASSPHRASE)
    return path


def test_sign_pdf_incremental_produces_valid_signature(keystore_path: Path) -> None:
    signed = sign_pdf_incremental(
        valid_pdf(), keystore_path=keystore_path, passphrase=PASSPHRASE, field_name="TestSig"
    )
    assert signed != valid_pdf()
    assert verify_pdf_signatures(signed) == 1