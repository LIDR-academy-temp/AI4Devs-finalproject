import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.main import create_app
from app.infrastructure.persistence.database import build_engine, build_session_factory
from app.config import get_settings
from tests.fixtures.master_data import seed_master_data, cleanup_master_data


@pytest.fixture(scope="session")
def db_session_factory():
    """Create database session factory for testing."""
    settings = get_settings()
    engine = build_engine(settings.database_url)
    return build_session_factory(engine)


@pytest.fixture
def db_session(db_session_factory):
    """Provide a database session with master data."""
    session = db_session_factory()
    seed_master_data(session)
    yield session
    cleanup_master_data(session)
    session.close()


@pytest.fixture
async def client(db_session):
    """Provide an async HTTP client with real database."""
    app = create_app()
    # Override dependency to use test session
    from app.presentation.dependencies import providers

    def override_get_db_session():
        yield db_session

    app.dependency_overrides[providers.get_db_session] = override_get_db_session

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    # Clean up overrides
    app.dependency_overrides.clear()
