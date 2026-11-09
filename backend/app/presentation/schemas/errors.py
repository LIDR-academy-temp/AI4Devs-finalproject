from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Consistent error body: a machine-readable code and a human-readable message."""

    code: str
    message: str
