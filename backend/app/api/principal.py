"""Punto de entrada de la API."""

from fastapi import FastAPI, Response, status

from app.datos.conexion import verificar_conexion

app = FastAPI(
    title="Weather Track API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


@app.get("/api/v1/salud", tags=["operación"])
def salud(respuesta: Response) -> dict[str, str]:
    if verificar_conexion():
        return {"estado": "ok"}
    respuesta.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"estado": "sin_base_de_datos"}
