"""Sincronización del catálogo de estaciones y sensores."""

import logging
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.modelos import Estacion, Sensor
from app.dominio.catalogo import (
    SensorNoClasificable,
    clasificar_magnitud,
    leer_altura_m,
    normalizar_nombre,
    normalizar_unidad,
    unidad_admitida,
)
from app.ingesta.cliente_sat2 import ClienteSat2

registro = logging.getLogger("weather_track.catalogo")


def _sincronizar_sensor(sesion: Session, estacion: Estacion, datos: dict) -> None:
    try:
        magnitud = clasificar_magnitud(datos["nombre"])
    except SensorNoClasificable:
        # Sin magnitud no puede guardarse; sus lecturas se informan como desconocidas.
        registro.warning("Sensor sin clasificar: %s", datos["nombre"])
        return
    sensor = sesion.scalar(
        select(Sensor).where(
            Sensor.estacion_id == estacion.id,
            Sensor.id_sensor_sat2 == datos["idSensor"],
        )
    )
    if sensor is None:
        sensor = Sensor(estacion_id=estacion.id, id_sensor_sat2=datos["idSensor"])
        sesion.add(sensor)
    sensor.nombre = datos["nombre"]
    sensor.clave_normalizada = normalizar_nombre(datos["nombre"])
    sensor.magnitud = magnitud
    sensor.altura_m = leer_altura_m(datos["nombre"])
    sensor.unidad = normalizar_unidad(datos.get("unidad") or "")
    if not unidad_admitida(magnitud, sensor.unidad):
        # Sus lecturas quedarán faltantes y el índice informará datos insuficientes.
        registro.warning("Unidad no admitida en %s: %s", datos["nombre"], sensor.unidad)


def sincronizar_catalogo(
    sesion: Session, cliente: ClienteSat2, ahora: datetime | None = None
) -> list[Estacion]:
    """Crea o actualiza estaciones y sensores, e inactiva las que dejaron de llegar. No hace commit.

    Devuelve las estaciones de los equipos que informó SAT2.
    """
    momento = ahora or datetime.now(UTC)
    equipos = cliente.recuperar_equipos()
    estaciones = []
    for equipo in equipos:
        estacion = sesion.scalar(
            select(Estacion).where(Estacion.id_equipo_sat2 == equipo["idEquipo"])
        )
        if estacion is None:
            estacion = Estacion(id_equipo_sat2=equipo["idEquipo"])
            sesion.add(estacion)
        elif not estacion.activa:
            registro.info("El equipo %s volvió a SAT2: estación reactivada", equipo["idEquipo"])
        estacion.nombre = equipo["descripcion"]
        estacion.nro_serie = equipo.get("NroSerie")
        estacion.latitud = Decimal(str(equipo["lat"]))
        estacion.longitud = Decimal(str(equipo["lng"]))
        estacion.activa = True
        estacion.inactiva_desde = None
        sesion.flush()
        for datos in equipo.get("sensores", []):
            _sincronizar_sensor(sesion, estacion, datos)
        estaciones.append(estacion)
    # Una lista vacía suele ser una falla de la fuente: apagaría todas las estaciones de golpe.
    if equipos:
        _inactivar_ausentes(sesion, {equipo["idEquipo"] for equipo in equipos}, momento)
    sesion.flush()
    return estaciones


def _inactivar_ausentes(sesion: Session, informados: set[int], ahora: datetime) -> None:
    ausentes = sesion.scalars(
        select(Estacion).where(Estacion.activa, Estacion.id_equipo_sat2.not_in(informados))
    )
    for estacion in ausentes:
        registro.warning(
            "El equipo %s ya no llega de SAT2: estación inactiva", estacion.id_equipo_sat2
        )
        estacion.activa = False
        estacion.inactiva_desde = ahora
