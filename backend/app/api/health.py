from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
def get_health(session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    try:
        session.execute(text("SELECT 1"))
    except DBAPIError as exc:
        raise AppError(503, "database_unavailable", "La base de datos no responde") from exc
    return {"status": "ok"}
