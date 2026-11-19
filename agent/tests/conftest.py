import pytest
from fastapi.testclient import TestClient

from firmadoc_agent.app import create_app
from firmadoc_agent.config import AgentSettings

WIDGET_ORIGIN = "http://localhost:5173"


@pytest.fixture
def settings() -> AgentSettings:
    return AgentSettings(
        _env_file=None,
        FIRMADOC_AGENT_ALLOWED_ORIGINS=f"{WIDGET_ORIGIN}, https://firmadoc.example",
        FIRMADOC_PKCS11_LIB="",
    )


@pytest.fixture
def client(settings: AgentSettings) -> TestClient:
    return TestClient(create_app(settings))
