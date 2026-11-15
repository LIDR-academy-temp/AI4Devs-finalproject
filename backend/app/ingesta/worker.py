"""Proceso de ingesta. Debe correr en una sola instancia."""

import logging
import os
import shutil
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from functools import partial
from pathlib import Path
from typing import Any

from apscheduler.schedulers.blocking import BlockingScheduler
from prometheus_client import start_http_server
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from app.cuentas.ciclo_de_vida import borrar_cuentas_sin_confirmar
from app.cuentas.envio import (
    Enviador,
    cargar_configuracion_smtp,
    enviador_smtp,
    enviar_pendientes,
)
from app.datos.conexion import obtener_motor
from app.datos.modelos import EjecucionIngesta, Estacion, IntentoAcceso, LimiteIp, Sesion
from app.datos.naturaleza import NaturalezaIncompatible, asegurar_naturaleza
from app.ingesta.carga_inicial import ejecutar_carga_inicial
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.ciclo import ejecutar_ciclo
from app.ingesta.cliente_sat2 import ClienteSat2
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.ingesta.configuracion import ConfiguracionIncompleta
from app.ingesta.modo_prueba import preparar_modo_prueba
from app.ingesta.origen_sat2 import (
    ClienteSerializado,
    ConfiguracionSat2Ilegible,
    OrigenFijo,
    OrigenSat2,
    tarea_con_origen,
)
from app.ingesta.recuperacion import recuperar_huecos
from app.monitoreo.alertas import actualizar_alertas
from app.monitoreo.controles import Disco, evaluar
from app.monitoreo.metricas import REGISTRO, actualizar_metricas

MODO_SIMULADO = "simulado"
MODO_REAL = "real"
MODO_PRUEBA = "prueba"
INTERVALO_LATIDO_SEGUNDOS = 30
INTERVALO_CICLO_MINUTOS = 10
INTERVALO_CATALOGO_HORAS = 24
INTERVALO_CARGA_MINUTOS = 60
INTERVALO_CORREO_SEGUNDOS = 10
ANTIGUEDAD_MAXIMA_LATIDO_SEGUNDOS = 120
ANTIGUEDAD_INTENTOS_HORAS = 24
RUTA_LATIDO = Path(os.environ.get("WORKER_RUTA_LATIDO", "/tmp/weather-track-latido"))
RUTA_ENV = Path(os.environ.get("WORKER_RUTA_ENV", ".env"))
# El volumen de la base, montado en modo solo lectura para medir su espacio libre.
RUTA_DISCO = Path(os.environ.get("MONITOREO_RUTA_DISCO", "/datos_db"))
# Interno: Prometheus lo consulta por la red de Compose; nunca se publica (weather-track-monitoreo, D5).
PUERTO_METRICAS = int(os.environ.get("MONITOREO_PUERTO_METRICAS", "9464"))

registro = logging.getLogger("weather_track.worker")


def crear_cliente(modo: str) -> ClienteSat2:
    """Solo el modo simulado: el real toma su configuración en cada tarea (`crear_origen_real`)."""
    if modo == MODO_SIMULADO:
        return ClienteSat2Simulado()
    raise ConfiguracionIncompleta(f"SAT2_MODO no admitido: {modo}")


def crear_origen_real(fabrica: Callable[[], Session]) -> OrigenSat2:
    """La configuración guardada por un administrador o, si no hay, la del entorno (D6)."""
    return OrigenSat2(fabrica, RUTA_ENV)


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
    """Evita que sesiones, intentos y contadores del límite por IP crezcan sin límite."""
    sesion.execute(delete(Sesion).where(Sesion.vence_en < ahora))
    limite = ahora.timestamp() - ANTIGUEDAD_INTENTOS_HORAS * 3600
    sesion.execute(
        delete(IntentoAcceso).where(
            IntentoAcceso.ocurrido_en < datetime.fromtimestamp(limite, UTC)
        )
    )
    # La ventana más larga del límite por IP es de una hora.
    sesion.execute(delete(LimiteIp).where(LimiteIp.ventana_inicio < ahora - timedelta(hours=2)))
    borradas = borrar_cuentas_sin_confirmar(sesion, ahora)
    if borradas:
        registro.info("Cuentas sin confirmar borradas: %s", borradas)
    sesion.commit()


def tarea_limpieza(fabrica: Callable[[], Session], reloj: Callable[[], datetime] = _ahora) -> None:
    with fabrica() as sesion:
        _limpiar_vencidos(sesion, reloj())


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
                carga = ejecutar_carga_inicial(
                    sesion, cliente, estacion, reloj(), pausa_segundos=pausa, dormir=dormir
                )
                # Con la carga sin terminar, recuperar pediría los mismos días otra vez.
                if carga.resultado != "EXITO":
                    continue
            recuperar_huecos(sesion, cliente, estacion, reloj(), pausa_segundos=pausa, dormir=dormir)


def medir_disco() -> Disco | None:
    """El espacio del disco de la base. Sin el volumen montado, no hay medición."""
    if not RUTA_DISCO.is_dir():
        return None
    uso = shutil.disk_usage(RUTA_DISCO)
    return Disco(total=uso.total, libre=uso.free)


def tarea_monitoreo(
    fabrica: Callable[[], Session],
    modo: str,
    reloj: Callable[[], datetime] = _ahora,
    medir_disco: Callable[[], Disco | None] = medir_disco,
) -> None:
    """Evalúa los controles de salud y abre o cierra sus alertas (weather-track-monitoreo, D2 y D3)."""
    ahora = reloj()
    disco = medir_disco()
    with fabrica() as sesion:
        actualizar_alertas(sesion, evaluar(sesion, ahora, modo, disco), ahora)
        actualizar_metricas(sesion, ahora, modo, disco)


def iniciar_servidor_de_metricas() -> None:
    start_http_server(PUERTO_METRICAS, registry=REGISTRO)


def programar_monitoreo(planificador: BlockingScheduler, fabrica: Callable[[], Session], modo: str) -> None:
    iniciar_servidor_de_metricas()
    # Un minuto después del ciclo, para evaluar los datos que acaba de traer.
    planificador.add_job(
        protegida,
        "interval",
        minutes=INTERVALO_CICLO_MINUTOS,
        args=["monitoreo", tarea_monitoreo, fabrica, modo],
        next_run_time=_ahora() + timedelta(minutes=1),
    )


def tarea_correo(
    fabrica: Callable[[], Session],
    enviar: Enviador,
    remitente: str,
    reloj: Callable[[], datetime] = _ahora,
) -> None:
    with fabrica() as sesion:
        enviar_pendientes(sesion, enviar, remitente, reloj())


def programar_correo(planificador: BlockingScheduler, fabrica: Callable[[], Session]) -> bool:
    """Sin servidor de correo configurado, los correos esperan en la bandeja."""
    configuracion = cargar_configuracion_smtp()
    if configuracion is None:
        registro.warning("Sin SMTP_HOST: los correos quedan en la bandeja de salida")
        return False
    planificador.add_job(
        protegida,
        "interval",
        seconds=INTERVALO_CORREO_SEGUNDOS,
        args=["correo", tarea_correo, fabrica, enviador_smtp(configuracion), configuracion.remitente],
    )
    return True


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
    planificador = BlockingScheduler(
        timezone="UTC",
        job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 300},
    )
    planificador.add_job(registrar_latido, "interval", seconds=INTERVALO_LATIDO_SEGUNDOS)
    programar_correo(planificador, fabrica)
    planificador.add_job(
        protegida, "interval", minutes=INTERVALO_CICLO_MINUTOS, args=["limpieza", tarea_limpieza, fabrica]
    )
    programar_monitoreo(planificador, fabrica, MODO_PRUEBA)
    planificador.start()
    return 0


def principal() -> int:
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    modo = os.environ.get("SAT2_MODO", MODO_SIMULADO)
    if modo == MODO_PRUEBA:
        return principal_de_prueba(sessionmaker(obtener_motor()))
    try:
        if modo == MODO_REAL:
            fabrica = sessionmaker(obtener_motor())
            origen: OrigenSat2 | OrigenFijo = crear_origen_real(fabrica)
            # Sin ninguna configuración no arranca; después, cada cambio se toma sin reiniciar.
            origen.cliente()
        else:
            origen = OrigenFijo(ClienteSerializado(crear_cliente(modo)))
            fabrica = sessionmaker(obtener_motor())
    except (ConfiguracionIncompleta, ConfiguracionSat2Ilegible) as error:
        # El mensaje solo nombra variables, nunca sus valores.
        registro.error("Configuración incompleta: %s", error)
        return 2

    if not preparar_base(fabrica, modo):
        return 2
    ciclo = partial(tarea_con_origen, registrar_ciclo=True)

    registro.info("Worker iniciado en modo %s", modo)
    registrar_latido()
    # Antes de planificar: si corriera junto al ciclo, ambos crearían las mismas estaciones.
    protegida("catálogo", tarea_con_origen, tarea_catalogo, fabrica, origen)
    ahora = _ahora()
    planificador = BlockingScheduler(
        timezone="UTC",
        job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 300},
    )
    planificador.add_job(registrar_latido, "interval", seconds=INTERVALO_LATIDO_SEGUNDOS)
    programar_correo(planificador, fabrica)
    planificador.add_job(
        protegida,
        "interval",
        hours=INTERVALO_CATALOGO_HORAS,
        args=["catálogo", tarea_con_origen, tarea_catalogo, fabrica, origen],
    )
    planificador.add_job(
        protegida,
        "interval",
        minutes=INTERVALO_CICLO_MINUTOS,
        args=["ciclo", ciclo, tarea_ciclo, fabrica, origen],
        next_run_time=ahora,
    )
    planificador.add_job(
        protegida,
        "interval",
        minutes=INTERVALO_CARGA_MINUTOS,
        args=["carga y huecos", tarea_con_origen, tarea_carga, fabrica, origen],
        next_run_time=ahora,
    )
    programar_monitoreo(planificador, fabrica, modo)
    planificador.start()
    return 0


if __name__ == "__main__":
    sys.exit(principal())
