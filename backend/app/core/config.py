from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://firmadoc:firmadoc@localhost:5432/firmadoc"
    test_database_url: str = "postgresql+psycopg://firmadoc:firmadoc@localhost:5432/firmadoc_test"

    public_base_url: str = Field("http://localhost:8000", alias="FIRMADOC_PUBLIC_BASE_URL")
    admin_token: str = Field("", alias="FIRMADOC_ADMIN_TOKEN")
    signing_link_secret: str = Field("", alias="FIRMADOC_SIGNING_LINK_SECRET")
    require_cuil_match: bool = Field(False, alias="FIRMADOC_REQUIRE_CUIL_MATCH")
    max_upload_mb: int = Field(10, alias="FIRMADOC_MAX_UPLOAD_MB")

    local_keystore_path: str = Field("var/keys/local-signer.p12", alias="FIRMADOC_LOCAL_KEYSTORE_PATH")
    local_keystore_passphrase: str = Field("", alias="FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE")

    demo_api_key: str = Field("", alias="FIRMADOC_DEMO_API_KEY")


@lru_cache
def get_settings() -> Settings:
    return Settings()
