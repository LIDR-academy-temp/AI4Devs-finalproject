from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str


# Deliberately unauthenticated: nginx and deployment checks call it without a token.
# It reports liveness only and exposes no data.
@router.get("/health")
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")
