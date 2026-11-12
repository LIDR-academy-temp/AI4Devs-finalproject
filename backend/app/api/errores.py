"""Errores de la API con el esquema común de la sección 4 del README."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

MENSAJE_CAMPO = "Revise este dato."


class ErrorApi(Exception):
    def __init__(
        self,
        estado: int,
        codigo: str,
        mensaje: str,
        encabezados: dict[str, str] | None = None,
        campos: dict[str, str] | None = None,
    ) -> None:
        super().__init__(mensaje)
        self.estado = estado
        self.codigo = codigo
        self.mensaje = mensaje
        self.encabezados = encabezados
        # Campo del formulario: mensaje para mostrar junto a él.
        self.campos = campos


def _contenido(codigo: str, mensaje: str, campos: dict[str, str] | None) -> dict:
    contenido: dict = {"codigo": codigo, "mensaje": mensaje}
    if campos:
        contenido["campos"] = campos
    return contenido


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorApi)
    def manejar_error_api(_solicitud: Request, error: ErrorApi) -> JSONResponse:
        return JSONResponse(
            status_code=error.estado,
            content=_contenido(error.codigo, error.mensaje, error.campos),
            headers=error.encabezados,
        )

    @app.exception_handler(RequestValidationError)
    def manejar_validacion(_solicitud: Request, error: RequestValidationError) -> JSONResponse:
        # La respuesta por defecto repite lo enviado, y eso podría incluir una contraseña:
        # solo se informa qué campos revisar.
        campos = {
            str(detalle["loc"][-1]): MENSAJE_CAMPO
            for detalle in error.errors()
            if len(detalle.get("loc", ())) > 1 and detalle["loc"][0] == "body"
        }
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=_contenido("SOLICITUD_INVALIDA", "La solicitud no es válida.", campos),
        )
