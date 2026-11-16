import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field


class EchoBody(BaseModel):
    name: str = Field(min_length=1)
    count: int


@pytest.fixture
def app(app: FastAPI) -> FastAPI:
    router = APIRouter()

    @router.post("/api/v1/_test/echo")
    def echo(body: EchoBody) -> EchoBody:
        return body

    app.include_router(router)
    return app


def assert_error_body(body: dict, code: str) -> None:
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert body["message"]


def test_invalid_json_body_returns_validation_error_with_fields(client: TestClient) -> None:
    response = client.post("/api/v1/_test/echo", json={"name": "", "count": "muchos"})

    assert response.status_code == 422
    body = response.json()
    assert_error_body(body, "validation_error")
    assert {error["field"] for error in body["details"]["errors"]} == {"name", "count"}


def test_malformed_json_returns_validation_error(client: TestClient) -> None:
    response = client.post(
        "/api/v1/_test/echo", content=b"{no es json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422
    assert_error_body(response.json(), "validation_error")


def test_unknown_route_returns_not_found_in_error_format(client: TestClient) -> None:
    response = client.get("/api/v1/no-existe")

    assert response.status_code == 404
    assert_error_body(response.json(), "not_found")
