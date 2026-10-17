import pytest
from httpx import AsyncClient

from app.main import create_app


@pytest.fixture
async def client():
    """Provide an async HTTP client for API testing."""
    app = create_app()
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
