from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_api_key
from app.models import Certificate, IntegratingSystem, Signer
from app.seed import DEMO_SIGNER_CUIL, run_seed


def count(session: Session, model: type) -> int:
    return session.scalar(select(func.count()).select_from(model))


def test_seed_is_idempotent(session: Session, tmp_path: Path) -> None:
    settings = Settings(FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE="test-passphrase", FIRMADOC_DEMO_API_KEY="")
    keystore = tmp_path / "keys" / "local-signer.p12"

    first = run_seed(session, settings, keystore)
    second = run_seed(session, settings, keystore)

    assert first.generated_api_key is not None
    assert set(first.created) == {"integrating_system", "signer", "local_keystore", "certificate"}
    assert second.generated_api_key is None
    assert second.created == []
    assert (count(session, IntegratingSystem), count(session, Signer), count(session, Certificate)) == (1, 1, 1)
    assert keystore.exists()
    assert (keystore.parent / "demo-ca.crt").exists()


def test_seed_stores_only_the_api_key_hash(session: Session, tmp_path: Path) -> None:
    settings = Settings(
        FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE="test-passphrase",
        FIRMADOC_DEMO_API_KEY="fdk_clave-de-prueba",
    )

    result = run_seed(session, settings, tmp_path / "local-signer.p12")
    system = session.scalar(select(IntegratingSystem))

    assert result.generated_api_key is None
    assert system.api_key_hash == hash_api_key("fdk_clave-de-prueba")
    assert "clave-de-prueba" not in system.api_key_hash
    assert session.scalar(select(Signer.identifier)) == DEMO_SIGNER_CUIL
