"""Composition root: the one place where presentation wires infrastructure to interfaces.

Tests replace get_authentication_service through app.dependency_overrides,
so no other module needs to know which implementations are in use.
"""

from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session, sessionmaker

from app.application.services.authentication_service import AuthenticationService
from app.config import get_settings
from app.infrastructure.auth.cognito_token_verifier import CognitoTokenVerifier
from app.infrastructure.persistence.database import build_engine, build_session_factory
from app.infrastructure.persistence.repositories.sqlalchemy_user_repository import (
    SqlAlchemyUserRepository,
)


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return build_session_factory(build_engine(get_settings().database_url))


@lru_cache
def _token_verifier() -> CognitoTokenVerifier:
    # One instance per process, so the JWKS is fetched once and cached, not per request.
    settings = get_settings()
    return CognitoTokenVerifier(
        region=settings.cognito_region,
        user_pool_id=settings.cognito_user_pool_id,
        client_id=settings.cognito_client_id,
    )


def get_db_session() -> Iterator[Session]:
    with _session_factory()() as session:
        yield session


def get_authentication_service(
    session: Annotated[Session, Depends(get_db_session)],
) -> AuthenticationService:
    return AuthenticationService(
        token_verifier=_token_verifier(),
        user_repository=SqlAlchemyUserRepository(session),
    )
