from collections.abc import Iterator

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import get_session


def test_health_ok_when_database_responds(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_does_not_require_credentials(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"X-API-Key": "cualquier-cosa"})

    assert response.status_code == 200


def test_health_503_when_database_is_unreachable(app: FastAPI) -> None:
    unreachable = create_engine(
        "postgresql+psycopg://firmadoc:firmadoc@127.0.0.1:1/firmadoc",
        connect_args={"connect_timeout": 1},
    )

    def broken_session() -> Iterator[Session]:
        with Session(bind=unreachable) as session:
            yield session

    app.dependency_overrides[get_session] = broken_session
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 503
    assert response.json()["code"] == "database_unavailable"
