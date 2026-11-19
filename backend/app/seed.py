"""Datos de demostración idempotentes: `python -m app.seed` puede ejecutarse varias veces."""

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.security import generate_api_key, hash_api_key
from app.models import Certificate, IntegratingSystem, Signer
from app.models.enums import Provider, RevocationStatus
from app.services.demo_pki import generate_local_keystore, load_local_keystore, save_local_keystore

DEMO_SYSTEM_NAME = "Sistema integrador demo"
DEMO_ALLOWED_ORIGINS = "http://localhost:4200"
DEMO_SIGNER_NAME = "Firmante Demo"
DEMO_SIGNER_CUIL = "20123456786"
DEMO_SIGNER_EMAIL = "firmante.demo@example.org"


@dataclass(frozen=True)
class SeedResult:
    generated_api_key: str | None
    created: list[str]


def _seed_integrating_system(session: Session, settings: Settings, created: list[str]) -> str | None:
    if session.scalar(select(IntegratingSystem).where(IntegratingSystem.name == DEMO_SYSTEM_NAME)):
        return None
    api_key = settings.demo_api_key or generate_api_key()
    session.add(
        IntegratingSystem(
            name=DEMO_SYSTEM_NAME,
            api_key_hash=hash_api_key(api_key),
            allowed_origins=DEMO_ALLOWED_ORIGINS,
        )
    )
    created.append("integrating_system")
    return None if settings.demo_api_key else api_key


def _seed_signer(session: Session, created: list[str]) -> None:
    if session.scalar(select(Signer).where(Signer.identifier == DEMO_SIGNER_CUIL)):
        return
    session.add(Signer(full_name=DEMO_SIGNER_NAME, identifier=DEMO_SIGNER_CUIL, email=DEMO_SIGNER_EMAIL))
    created.append("signer")


def _seed_local_certificate(session: Session, settings: Settings, keystore_path: Path, created: list[str]) -> None:
    if not settings.local_keystore_passphrase:
        raise SystemExit("Definí FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE en .env antes de ejecutar el seed.")

    if keystore_path.exists():
        keystore = load_local_keystore(keystore_path, settings.local_keystore_passphrase)
    else:
        keystore = generate_local_keystore()
        save_local_keystore(keystore, keystore_path, settings.local_keystore_passphrase)
        created.append("local_keystore")

    cert = keystore.certificate
    serial = format(cert.serial_number, "x")
    if session.scalar(select(Certificate).where(Certificate.serial_number == serial)):
        return
    session.add(
        Certificate(
            subject=cert.subject.rfc4514_string(),
            issuer_subject=cert.issuer.rfc4514_string(),
            serial_number=serial,
            provider=Provider.LOCAL,
            revocation_status=RevocationStatus.GOOD,
            issued_at=cert.not_valid_before_utc,
            expires_at=cert.not_valid_after_utc,
        )
    )
    created.append("certificate")


def run_seed(session: Session, settings: Settings, keystore_path: Path) -> SeedResult:
    created: list[str] = []
    api_key = _seed_integrating_system(session, settings, created)
    _seed_signer(session, created)
    _seed_local_certificate(session, settings, keystore_path, created)
    session.commit()
    return SeedResult(generated_api_key=api_key, created=created)


def main() -> None:
    from app.db import SessionLocal

    settings = get_settings()
    with SessionLocal() as session:
        result = run_seed(session, settings, Path(settings.local_keystore_path))

    print("Seed completo. Creados:", ", ".join(result.created) or "nada (ya existía todo)")
    if result.generated_api_key:
        print("API key del sistema integrador demo (se muestra una sola vez):")
        print(f"  {result.generated_api_key}")


if __name__ == "__main__":
    main()
