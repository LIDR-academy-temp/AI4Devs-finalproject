from fastapi.testclient import TestClient

from firmadoc_agent import __version__
from firmadoc_agent.app import create_app
from firmadoc_agent.config import AgentSettings


def test_health_reports_version_and_missing_library(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": __version__, "pkcs11_library_configured": False}


def test_health_reports_configured_library() -> None:
    settings = AgentSettings(_env_file=None, FIRMADOC_PKCS11_LIB=r"C:\SoftHSM2\lib\softhsm2-x64.dll")

    response = TestClient(create_app(settings)).get("/health")

    assert response.json()["pkcs11_library_configured"] is True


def test_health_does_not_expose_the_library_path() -> None:
    settings = AgentSettings(_env_file=None, FIRMADOC_PKCS11_LIB=r"C:\SoftHSM2\lib\softhsm2-x64.dll")

    response = TestClient(create_app(settings)).get("/health")

    assert "softhsm" not in response.text.lower()
