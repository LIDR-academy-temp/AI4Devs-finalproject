"""Punto de entrada de la API."""

import logging
import os
from collections.abc import AsyncIterator, Callable
from contextlib import AbstractContextManager, asynccontextmanager

from fastapi import FastAPI, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api import administracion, autenticacion, cuenta, estaciones, lecturas
from app.api import registro as registro_publico
from app.api.errores import registrar_manejadores
from app.api.registros import instalar_filtro_de_codigos
from app.datos.conexion import obtener_motor, verificar_conexion
from app.datos.naturaleza import ADMITIDAS, verificar_naturaleza

registro = logging.getLogger("weather_track.api")
instalar_filtro_de_codigos()


def _abrir_sesion() -> AbstractContextManager[Session]:
    return Session(obtener_motor())


def comprobar_base(abrir_sesion: Callable[[], AbstractContextManager[Session]] = _abrir_sesion) -> None:
    """Corta el arranque si la base no corresponde al modo (D4 de weather-track-estaciones).

    Solo lee: la naturaleza la fija el worker o la siembra. Sin base disponible, arranca igual
    y la ruta de salud lo informa.
    """
    modo = os.environ.get("SAT2_MODO", "simulado")
    try:
        with abrir_sesion() as sesion:
            verificar_naturaleza(sesion, modo)
    except (KeyError, SQLAlchemyError) as error:
        registro.warning("No se pudo verificar la base al arrancar: %s", type(error).__name__)


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI) -> AsyncIterator[None]:
    comprobar_base()
    yield


app = FastAPI(
    title="Weather Track API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=ciclo_de_vida,
)
registrar_manejadores(app)
app.include_router(autenticacion.router)
app.include_router(registro_publico.router)
app.include_router(cuenta.router)
app.include_router(estaciones.router)
app.include_router(lecturas.router)
app.include_router(administracion.router)


def modo_publico() -> str:
    """El modo de datos, para los avisos de la interfaz. Nunca otro dato de la configuración."""
    modo = os.environ.get("SAT2_MODO", "simulado")
    return modo if modo in ADMITIDAS else "desconocido"


@app.get("/api/v1/salud", tags=["operación"])
def salud(respuesta: Response) -> dict[str, str]:
    if verificar_conexion():
        return {"estado": "ok", "modo": modo_publico()}
    respuesta.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"estado": "sin_base_de_datos", "modo": modo_publico()}
