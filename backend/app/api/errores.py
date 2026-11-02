"""Errores de la API con el esquema común de la sección 4 del README."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErrorApi(Exception):
    def __init__(
        self,
        estado: int,
        codigo: str,
        mensaje: str,
        encabezados: dict[str, str] | None = None,
    ) -> None:
        super().__init__(mensaje)
        self.estado = estado
        self.codigo = codigo
        self.mensaje = mensaje
        self.encabezados = encabezados


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorApi)
    def manejar_error_api(_solicitud: Request, error: ErrorApi) -> JSONResponse:
        return JSONResponse(
            status_code=error.estado,
            content={"codigo": error.codigo, "mensaje": error.mensaje},
            headers=error.encabezados,
        )

    @app.exception_handler(RequestValidationError)
    def manejar_validacion(_solicitud: Request, _error: RequestValidationError) -> JSONResponse:
        # La respuesta por defecto repite lo enviado, y eso podría incluir una contraseña.
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"codigo": "SOLICITUD_INVALIDA", "mensaje": "La solicitud no es válida."},
        )
