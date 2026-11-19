from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from firmadoc_agent import __version__
from firmadoc_agent.config import AgentSettings


class Health(BaseModel):
    status: str
    version: str
    pkcs11_library_configured: bool


class OriginGuard:
    """Rechaza con 403 cualquier pedido de navegador cuyo `Origin` no esté en la lista, incluido `null`."""

    def __init__(self, app: ASGIApp, allowed_origins: list[str]) -> None:
        self.app = app
        self.allowed = frozenset(allowed_origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            origin = Headers(scope=scope).get("origin")
            if origin is not None and origin not in self.allowed:
                body = {"code": "origin_not_allowed", "message": "Origen no permitido", "details": None}
                await JSONResponse(body, status_code=403)(scope, receive, send)
                return
        await self.app(scope, receive, send)


def create_app(settings: AgentSettings | None = None) -> FastAPI:
    settings = settings or AgentSettings()
    app = FastAPI(title="Firmadoc Agent", version=__version__, docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.add_middleware(OriginGuard, allowed_origins=settings.allowed_origin_list)

    @app.get("/health", response_model=Health)
    def health() -> Health:
        return Health(status="ok", version=__version__, pkcs11_library_configured=bool(settings.pkcs11_lib.strip()))

    return app
