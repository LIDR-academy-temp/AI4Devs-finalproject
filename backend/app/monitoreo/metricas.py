"""Métricas para Prometheus (D5 de weather-track-monitoreo).

El worker calcula una foto en cada evaluación y la publica en un puerto interno. Ninguna métrica
lleva correos, direcciones IP ni credenciales: la única etiqueta con texto es el nombre público de
la estación.
"""

from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime

from prometheus_client import CollectorRegistry, generate_latest
from prometheus_client.core import GaugeMetricFamily
from prometheus_client.registry import Collector
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.datos.modelos import (
    TIPOS_ALERTA,
    AlertaSistema,
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    Observacion,
    Sensor,
)
from app.monitoreo import umbrales

NOMBRES = (
    "weathertrack_lectura_antiguedad_segundos",
    "weathertrack_ciclos_fallidos_seguidos",
    "weathertrack_ciclo_ultimo_timestamp_segundos",
    "weathertrack_base_tamano_bytes",
    "weathertrack_disco_libre_ratio",
    "weathertrack_ingresos_fallidos_15m",
    "weathertrack_alertas_abiertas",
)
# Para contar los errores seguidos alcanza con mirar los últimos ciclos.
CICLOS_A_MIRAR = 50


@dataclass(frozen=True)
class FotoEstacion:
    nombre: str
    antiguedad_segundos: float | None
    fallidos_seguidos: int
    ultimo_ciclo: float | None


@dataclass
class Foto:
    estaciones: list[FotoEstacion] = field(default_factory=list)
    base_bytes: int = 0
    disco_libre: float | None = None
    ingresos_fallidos: int = 0
    alertas_abiertas: dict[str, int] = field(default_factory=dict)


class _Coleccionista(Collector):
    def __init__(self) -> None:
        self.foto = Foto()

    def collect(self) -> Iterator[GaugeMetricFamily]:
        foto = self.foto
        antiguedad = GaugeMetricFamily(
            NOMBRES[0], "Segundos desde la última lectura de la estación", labels=["estacion"]
        )
        fallidos = GaugeMetricFamily(
            NOMBRES[1], "Ciclos seguidos terminados en error", labels=["estacion"]
        )
        ultimo = GaugeMetricFamily(
            NOMBRES[2], "Momento del último ciclo terminado, en segundos Unix", labels=["estacion"]
        )
        for estacion in foto.estaciones:
            if estacion.antiguedad_segundos is not None:
                antiguedad.add_metric([estacion.nombre], estacion.antiguedad_segundos)
            fallidos.add_metric([estacion.nombre], estacion.fallidos_seguidos)
            if estacion.ultimo_ciclo is not None:
                ultimo.add_metric([estacion.nombre], estacion.ultimo_ciclo)
        yield antiguedad
        yield fallidos
        yield ultimo
        yield GaugeMetricFamily(NOMBRES[3], "Tamaño de la base de datos en bytes", value=foto.base_bytes)
        if foto.disco_libre is not None:
            yield GaugeMetricFamily(
                NOMBRES[4], "Proporción libre del disco de la base", value=foto.disco_libre
            )
        yield GaugeMetricFamily(
            NOMBRES[5], "Ingresos fallidos en los últimos 15 minutos", value=foto.ingresos_fallidos
        )
        abiertas = GaugeMetricFamily(NOMBRES[6], "Alertas abiertas por control", labels=["tipo"])
        for tipo in TIPOS_ALERTA:
            abiertas.add_metric([tipo], foto.alertas_abiertas.get(tipo, 0))
        yield abiertas


REGISTRO = CollectorRegistry()
_COLECCIONISTA = _Coleccionista()
REGISTRO.register(_COLECCIONISTA)


def _fallidos_seguidos(resultados: list[str]) -> int:
    seguidos = 0
    for resultado in resultados:
        if resultado != "ERROR":
            break
        seguidos += 1
    return seguidos


def _foto_de_estacion(sesion: Session, estacion: Estacion, ahora: datetime) -> FotoEstacion:
    ultima = sesion.scalar(
        select(func.max(Observacion.medido_en)).join(Sensor).where(Sensor.estacion_id == estacion.id)
    )
    ciclos = sesion.execute(
        select(EjecucionIngesta.resultado, EjecucionIngesta.finalizada_en)
        .where(
            EjecucionIngesta.estacion_id == estacion.id,
            EjecucionIngesta.tipo == "CICLO",
            EjecucionIngesta.finalizada_en.is_not(None),
        )
        .order_by(EjecucionIngesta.iniciada_en.desc())
        .limit(CICLOS_A_MIRAR)
    ).all()
    return FotoEstacion(
        nombre=estacion.nombre,
        antiguedad_segundos=(ahora - ultima).total_seconds() if ultima else None,
        fallidos_seguidos=_fallidos_seguidos([resultado for resultado, _ in ciclos]),
        ultimo_ciclo=ciclos[0][1].timestamp() if ciclos else None,
    )


def actualizar_metricas(sesion: Session, ahora: datetime, modo: str, disco) -> None:
    """Calcula la foto que publica `/metrics`. En modo prueba no hay ingesta que medir."""
    estaciones = []
    if modo != "prueba":
        activas = sesion.scalars(select(Estacion).where(Estacion.activa).order_by(Estacion.id)).all()
        estaciones = [_foto_de_estacion(sesion, estacion, ahora) for estacion in activas]
    abiertas = dict(
        sesion.execute(
            select(AlertaSistema.tipo, func.count())
            .where(AlertaSistema.cerrada_en.is_(None))
            .group_by(AlertaSistema.tipo)
        ).all()
    )
    _COLECCIONISTA.foto = Foto(
        estaciones=estaciones,
        base_bytes=sesion.scalar(select(func.pg_database_size(func.current_database()))),
        disco_libre=(disco.libre / disco.total if disco and disco.total else None),
        ingresos_fallidos=sesion.scalar(
            select(func.count())
            .select_from(IntentoAcceso)
            .where(IntentoAcceso.ocurrido_en > ahora - umbrales.VENTANA_INGRESOS)
        ),
        alertas_abiertas=abiertas,
    )


def exponer() -> bytes:
    return generate_latest(REGISTRO)
