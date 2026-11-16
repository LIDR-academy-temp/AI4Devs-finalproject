from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

HTTP_STATUS_CODES = {
    401: "unauthorized",
    404: "not_found",
    405: "method_not_allowed",
}


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def unauthorized(message: str = "Credenciales ausentes o inválidas") -> AppError:
    return AppError(401, "unauthorized", message)


def not_found(message: str = "Recurso inexistente") -> AppError:
    return AppError(404, "not_found", message)


def validation_error(message: str, details: dict[str, Any] | None = None) -> AppError:
    return AppError(422, "validation_error", message, details)


def error_response(status_code: int, code: str, message: str, details: dict[str, Any] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"code": code, "message": message, "details": details or {}},
    )


def _field_name(error: dict[str, Any]) -> str:
    if error.get("type") == "json_invalid":
        return "body"
    location = [str(part) for part in error.get("loc", ())[1:]]
    return ".".join(location) or str(error.get("loc", ("request",))[0])


async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message, exc.details)


async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"field": _field_name(error), "message": error["msg"]} for error in exc.errors()]
    return error_response(422, "validation_error", "La petición no cumple el esquema", {"errors": errors})


async def _http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = HTTP_STATUS_CODES.get(exc.status_code, "http_error")
    message = exc.detail if isinstance(exc.detail, str) else "Error HTTP"
    return error_response(exc.status_code, code, message)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
