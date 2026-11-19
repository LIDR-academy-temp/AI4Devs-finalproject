from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    port: int = Field(8765, alias="FIRMADOC_AGENT_PORT")
    allowed_origins: str = Field("http://localhost:5173", alias="FIRMADOC_AGENT_ALLOWED_ORIGINS")
    pkcs11_lib: str = Field("", alias="FIRMADOC_PKCS11_LIB")

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
