from pathlib import Path

from app.core.config import Settings
from app.providers.pades_engine import sign_pdf_incremental


class LocalPAdESProvider:
    def __init__(self, settings: Settings) -> None:
        self._keystore_path = Path(settings.local_keystore_path)
        self._passphrase = settings.local_keystore_passphrase

    def sign(self, pdf_bytes: bytes, field_name: str) -> bytes:
        if not self._passphrase:
            raise ValueError("FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE no está configurado")
        if not self._keystore_path.is_file():
            raise FileNotFoundError(f"No se encontró el keystore en {self._keystore_path}")
        return sign_pdf_incremental(
            pdf_bytes,
            keystore_path=self._keystore_path,
            passphrase=self._passphrase,
            field_name=field_name,
        )