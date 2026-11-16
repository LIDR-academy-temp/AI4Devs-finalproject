import hmac
import uuid
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.dependencies import get_app_settings
from app.core.errors import unauthorized
from app.core.security import hash_api_key
from app.db import get_session
from app.models import IntegratingSystem
from app.services.signing_links import InvalidSigningToken, verify_signing_token

PrincipalKind = Literal["integrator", "admin", "signing_link"]


@dataclass(frozen=True)
class Principal:
    kind: PrincipalKind
    integrating_system_id: uuid.UUID | None = None
    signature_request_id: uuid.UUID | None = None


def _integrator_for_key(session: Session, api_key: str | None) -> IntegratingSystem | None:
    if not api_key:
        return None
    return session.scalar(select(IntegratingSystem).where(IntegratingSystem.api_key_hash == hash_api_key(api_key)))


def _is_admin(settings: Settings, authorization: str | None) -> bool:
    if not settings.admin_token or not authorization:
        return False
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return False
    return hmac.compare_digest(token.encode("utf-8"), settings.admin_token.encode("utf-8"))


def require_integrator(
    session: Annotated[Session, Depends(get_session)],
    x_api_key: Annotated[str | None, Header()] = None,
) -> IntegratingSystem:
    system = _integrator_for_key(session, x_api_key)
    if system is None:
        raise unauthorized()
    return system


def require_admin(
    settings: Annotated[Settings, Depends(get_app_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    if not _is_admin(settings, authorization):
        raise unauthorized()


def _resolve_principal(
    session: Session,
    settings: Settings,
    x_api_key: str | None,
    authorization: str | None,
    x_signing_token: str | None,
    allow_admin: bool,
) -> Principal:
    if x_api_key:
        system = _integrator_for_key(session, x_api_key)
        if system is None:
            raise unauthorized()
        return Principal(kind="integrator", integrating_system_id=system.id)
    if authorization:
        if not allow_admin or not _is_admin(settings, authorization):
            raise unauthorized()
        return Principal(kind="admin")
    if x_signing_token:
        try:
            request_id = verify_signing_token(x_signing_token, settings.signing_link_secret)
        except InvalidSigningToken as exc:
            raise unauthorized(str(exc)) from exc
        return Principal(kind="signing_link", signature_request_id=request_id)
    raise unauthorized()


def require_document_reader(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    x_api_key: Annotated[str | None, Header()] = None,
    authorization: Annotated[str | None, Header()] = None,
    x_signing_token: Annotated[str | None, Header()] = None,
) -> Principal:
    return _resolve_principal(session, settings, x_api_key, authorization, x_signing_token, allow_admin=True)


def require_request_reader(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    x_api_key: Annotated[str | None, Header()] = None,
    authorization: Annotated[str | None, Header()] = None,
    x_signing_token: Annotated[str | None, Header()] = None,
) -> Principal:
    """Integrador o enlace de firma; el contrato no admite el token de administración en la consulta."""
    return _resolve_principal(session, settings, x_api_key, authorization, x_signing_token, allow_admin=False)
