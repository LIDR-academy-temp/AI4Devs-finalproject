"""Test database setup for infrastructure tests."""

import pytest
from sqlalchemy.orm import Session
from alembic.config import Config
from alembic.command import upgrade

from app.infrastructure.persistence.database import build_engine, build_session_factory
from app.config import get_settings


@pytest.fixture(scope="session")
def test_db_session_factory():
    """Create database session factory for testing."""
    settings = get_settings()
    engine = build_engine(settings.database_url)

    # Run migrations for test database
    alembic_config = Config("alembic.ini")
    with engine.begin() as connection:
        alembic_config.set_main_option("sqlalchemy.url", settings.database_url)
        upgrade(alembic_config, "head")

    return build_session_factory(engine)


@pytest.fixture
def test_db_session(test_db_session_factory):
    """Provide a clean database session for each test."""
    session = test_db_session_factory()
    yield session
    session.close()
