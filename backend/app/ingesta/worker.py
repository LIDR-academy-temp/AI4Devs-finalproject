"""Proceso de ingesta. Debe correr en una sola instancia."""

import logging
import os
import sys
import threading
import time
from collections.abc import Callable
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from app.datos.conexion import obtener_motor
from app.datos.modelos import EjecucionIngesta, Estacion, IntentoAcceso, Sesion
from app.datos.naturaleza import NaturalezaIncompatible, asegurar_naturaleza
from app.ingesta.carga_inicial import ejecutar_carga_inicial
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.ciclo import ejecutar_ciclo
from app.ingesta.cliente_sat2 import ClienteSat2, ClienteSat2Http
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.ingesta.configuracion import ConfiguracionIncompleta, cargar_configuracion
from app.ingesta.modo_prueba import preparar_modo_prueba

MODO_SIMULADO = "simulado"
MODO_REAL = "real"
MODO_PRUEBA = "prueba"
INTERVALO_LATIDO_SEGUNDOS = 30
INTERVALO_CICLO_MINUTOS = 10
INTERVALO_CATALOGO_HORAS = 24
INTERVALO_CARGA_MINUTOS = 60
ANTIGUEDAD_MAXIMA_LATIDO_SEGUNDOS = 120
ANTIGUEDAD_INTENTOS_HORAS = 24
RUTA_LATIDO = Path(os.environ.get("WORKER_RUTA_LATIDO", "/tmp/weather-track-latido"))
RUTA_ENV = Path(os.environ.get("WORKER_RUTA_ENV", ".env"))

registro = logging.getLogger("weather_track.worker")


class ClienteSerializado:
    """Garantiza una sola consulta a SAT2 por vez entre el ciclo y la carga.

    El bloqueo se toma por consulta: el ciclo espera como máximo una consulta en curso
    y nunca a toda la carga.
    """

    def __init__(self, cliente: ClienteSat2) -> None:
        self._cliente = cliente
        self._bloqueo = threading.Lock()

    def recuperar_equipos(self) -> list[dict[str, Any]]:
        with self._bloqueo:
            return self._cliente.recuperar_equipos()

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        with self._bloqueo:
            return self._cliente.recuperar_instantaneos(id_equipo)

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        with self._bloqueo:
            return self._cliente.recuperar_historicos(id_equipo, id_sensor, desde, hasta)


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


def _ahora() -> datetime:
    return datetime.now(UTC)


def _estaciones_activas(sesion: Session) -> list[Estacion]:
    return list(sesion.scalars(select(Estacion).where(Estacion.activa)))


def tarea_catalogo(fabrica: Callable[[], Session], cliente: ClienteSat2) -> None:
    with fabrica() as sesion:
        sincronizar_catalogo(sesion, cliente)
        sesion.commit()


def tarea_ciclo(
    fabrica: Callable[[], Session],
    cliente: ClienteSat2,
    reloj: Callable[[], datetime] = _ahora,
) -> None:
    with fabrica() as sesion:
        estaciones = _estaciones_activas(sesion)
        if not estaciones:
            sincronizar_catalogo(sesion, cliente)
            sesion.commit()
            estaciones = _estaciones_activas(sesion)
        for estacion in estaciones:
            ejecutar_ciclo(sesion, cliente, estacion, reloj())
        _limpiar_vencidos(sesion, reloj())


def _limpiar_vencidos(sesion: Session, ahora: datetime) -> None:
    """D8 del diseño: evita que sesiones e intentos crezcan sin límite."""
    sesion.execute(delete(Sesion).where(Sesion.vence_en < ahora))
    limite = ahora.timestamp() - ANTIGUEDAD_INTENTOS_HORAS * 3600
    sesion.execute(
        delete(IntentoAcceso).where(
            IntentoAcceso.ocurrido_en < datetime.fromtimestamp(limite, UTC)
        )
    )
    sesion.commit()


def tarea_carga(
    fabrica: Callable[[], Session],
    cliente: ClienteSat2,
    reloj: Callable[[], datetime] = _ahora,
    pausa_segundos: float | None = None,
    dormir: Callable[[float], None] = time.sleep,
) -> None:
    pausa = (
        float(os.environ.get("CARGA_PAUSA_SEGUNDOS", "2"))
        if pausa_segundos is None
        else pausa_segundos
    )
    with fabrica() as sesion:
        for estacion in _estaciones_activas(sesion):
            ya_cargada = sesion.scalar(
                select(EjecucionIngesta.id)
                .where(
                    EjecucionIngesta.estacion_id == estacion.id,
                    EjecucionIngesta.tipo == "CARGA_INICIAL",
                    EjecucionIngesta.resultado == "EXITO",
                )
                .limit(1)
            )
            if ya_cargada is None:
                ejecutar_carga_inicial(
                    sesion, cliente, estacion, reloj(), pausa_segundos=pausa, dormir=dormir
                )


def preparar_base(fabrica: Callable[[], Session], modo: str) -> bool:
    """No arranca sobre una base de otra naturaleza, para no mezclar datos reales y ficticios."""
    try:
        with fabrica() as sesion:
            naturaleza = asegurar_naturaleza(sesion, modo)
            sesion.commit()
    except NaturalezaIncompatible as error:
        registro.error("%s", error)
        return False
    registro.info("Base con datos de naturaleza %s", naturaleza)
    return True


def protegida(nombre: str, tarea: Callable[..., None], *argumentos: Any) -> None:
    """Una falla no debe detener el planificador. Solo se registra el tipo de error."""
    try:
        tarea(*argumentos)
    except Exception as error:  # noqa: BLE001
        registro.error("La tarea %s falló: %s", nombre, type(error).__name__)


def principal_de_prueba(fabrica: Callable[[], Session]) -> int:
    """Modo de prueba: no crea el cliente de SAT2 ni programa el ciclo y la carga.

    Solo prepara los dos casos y mantiene el latido que usa la comprobación de salud.
    """
    if not preparar_base(fabrica, MODO_PRUEBA):
        return 2
    with fabrica() as sesion:
        preparar_modo_prueba(sesion, _ahora())
    registro.info("Worker iniciado en modo prueba, sin consultar SAT2")
    registrar_latido()
    planificador = BlockingScheduler(timezone="UTC")
    planificador.add_job(registrar_latido, "interval", seconds=INTERVALO_LATIDO_SEGUNDOS)
    planificador.start()
    return 0


def principal() -> int:
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    modo = os.environ.get("SAT2_MODO", MODO_SIMULADO)
    if modo == MODO_PRUEBA:
        return principal_de_prueba(sessionmaker(obtener_motor()))
    try:
        cliente = ClienteSerializado(crear_cliente(modo))
    except ConfiguracionIncompleta as error:
        # El mensaje solo nombra variables, nunca sus valores.
        registro.error("Configuración incompleta: %s", error)
        return 2

    fabrica = sessionmaker(obtener_motor())
    if not preparar_base(fabrica, modo):
        return 2

    registro.info("Worker iniciado en modo %s", modo)
    registrar_latido()
    # Antes de planificar: si corriera junto al ciclo, ambos crearían las mismas estaciones.
    protegida("catálogo", tarea_catalogo, fabrica, cliente)
    ahora = _ahora()
    planificador = BlockingScheduler(
        timezone="UTC",
        job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 300},
    )
    planificador.add_job(registrar_latido, "interval", seconds=INTERVALO_LATIDO_SEGUNDOS)
    planificador.add_job(
        protegida,
        "interval",
        hours=INTERVALO_CATALOGO_HORAS,
        args=["catálogo", tarea_catalogo, fabrica, cliente],
    )
    planificador.add_job(
        protegida,
        "interval",
        minutes=INTERVALO_CICLO_MINUTOS,
        args=["ciclo", tarea_ciclo, fabrica, cliente],
        next_run_time=ahora,
    )
    planificador.add_job(
        protegida,
        "interval",
        minutes=INTERVALO_CARGA_MINUTOS,
        args=["carga inicial", tarea_carga, fabrica, cliente],
        next_run_time=ahora,
    )
    planificador.start()
    return 0


if __name__ == "__main__":
    sys.exit(principal())
