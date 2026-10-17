import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.infrastructure.persistence.base import Base


@pytest.fixture(scope="session")
def test_db_engine():
    """Create a test database engine using SQLite."""
    # Use SQLite in memory for tests, but could use PostgreSQL in CI
    database_url = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    engine = create_engine(database_url, echo=False)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture
def test_db_session(test_db_engine):
    """Create a test database session."""
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
