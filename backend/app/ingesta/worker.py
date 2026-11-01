"""Proceso de ingesta. Debe correr en una sola instancia."""

import logging
import os
import sys
import time
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler

from app.ingesta.cliente_sat2 import ClienteSat2, ClienteSat2Http
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.ingesta.configuracion import ConfiguracionIncompleta, cargar_configuracion

MODO_SIMULADO = "simulado"
MODO_REAL = "real"
INTERVALO_LATIDO_SEGUNDOS = 30
ANTIGUEDAD_MAXIMA_LATIDO_SEGUNDOS = 120
RUTA_LATIDO = Path(os.environ.get("WORKER_RUTA_LATIDO", "/tmp/weather-track-latido"))
RUTA_ENV = Path(os.environ.get("WORKER_RUTA_ENV", ".env"))

registro = logging.getLogger("weather_track.worker")


def crear_cliente(modo: str) -> ClienteSat2:
    if modo == MODO_SIMULADO:
        return ClienteSat2Simulado()
    if modo == MODO_REAL:
        return ClienteSat2Http(cargar_configuracion(RUTA_ENV))
    raise ConfiguracionIncompleta(f"SAT2_MODO no admitido: {modo}")


def registrar_latido(ruta: Path = RUTA_LATIDO) -> None:
    ruta.touch()


def latido_vigente(ruta: Path = RUTA_LATIDO, ahora: float | None = None) -> bool:
    """Usado por el control de salud del contenedor."""
    if not ruta.exists():
        return False
    momento = time.time() if ahora is None else ahora
    return momento - ruta.stat().st_mtime <= ANTIGUEDAD_MAXIMA_LATIDO_SEGUNDOS


def principal() -> int:
    logging.basicConfig(level=logging.INFO)
    modo = os.environ.get("SAT2_MODO", MODO_SIMULADO)
    try:
        crear_cliente(modo)
    except ConfiguracionIncompleta as error:
        # El mensaje solo nombra variables, nunca sus valores.
        registro.error("Configuración incompleta: %s", error)
        return 2

    registro.info("Worker iniciado en modo %s", modo)
    registrar_latido()
    planificador = BlockingScheduler(timezone="UTC")
    planificador.add_job(registrar_latido, "interval", seconds=INTERVALO_LATIDO_SEGUNDOS)
    planificador.start()
    return 0


if __name__ == "__main__":
    sys.exit(principal())
