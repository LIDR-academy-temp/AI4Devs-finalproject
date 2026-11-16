from fastapi import FastAPI

from app.api import admin, documents, health, signature_requests
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.services.signing_links import MIN_SECRET_LENGTH

API_PREFIX = "/api/v1"


def _check_settings(settings: Settings) -> None:
    if len(settings.signing_link_secret) < MIN_SECRET_LENGTH:
        raise ValueError(
            f"FIRMADOC_SIGNING_LINK_SECRET debe tener al menos {MIN_SECRET_LENGTH} caracteres"
        )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    _check_settings(settings)
    app = FastAPI(title="Firmadoc API", version="0.1.0", openapi_url=f"{API_PREFIX}/openapi.json")
    app.state.settings = settings
    register_error_handlers(app)
    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(admin.router, prefix=API_PREFIX)
    app.include_router(signature_requests.router, prefix=API_PREFIX)
    app.include_router(documents.router, prefix=API_PREFIX)
    return app
