"""Sincronización del catálogo de estaciones y sensores."""

import logging
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.modelos import Estacion, Sensor
from app.dominio.catalogo import (
    SensorNoClasificable,
    clasificar_magnitud,
    leer_altura_m,
    normalizar_nombre,
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
    sensor.unidad = datos.get("unidad") or ""


def sincronizar_catalogo(sesion: Session, cliente: ClienteSat2) -> list[Estacion]:
    """Crea o actualiza estaciones y sensores. No hace commit."""
    estaciones = []
    for equipo in cliente.recuperar_equipos():
        estacion = sesion.scalar(
            select(Estacion).where(Estacion.id_equipo_sat2 == equipo["idEquipo"])
        )
        if estacion is None:
            estacion = Estacion(id_equipo_sat2=equipo["idEquipo"])
            sesion.add(estacion)
        estacion.nombre = equipo["descripcion"]
        estacion.nro_serie = equipo.get("NroSerie")
        estacion.latitud = Decimal(str(equipo["lat"]))
        estacion.longitud = Decimal(str(equipo["lng"]))
        sesion.flush()
        for datos in equipo.get("sensores", []):
            _sincronizar_sensor(sesion, estacion, datos)
        estaciones.append(estacion)
    sesion.flush()
    return estaciones
