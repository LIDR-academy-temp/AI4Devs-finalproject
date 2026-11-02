"""Carga de históricos por sensor, reanudable y con ventana adaptable (D1 y D12)."""

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.datos.modelos import EjecucionIngesta, Estacion, Observacion, Sensor
from app.dominio.motor_tis import CALIDAD_OK, CALIDAD_SOSPECHOSO
from app.dominio.normalizacion import (
    ZONA_ARGENTINA,
    clasificar_lectura,
    humedad_incoherente,
    parsear_fecha,
)
from app.ingesta.cliente_sat2 import ClienteSat2, ErrorCredenciales, ErrorSat2

registro = logging.getLogger("weather_track.carga_inicial")

DIAS_NUCLEO = 31
VENTANA_MAXIMA_DIAS = 365
PAUSA_SEGUNDOS = 2.0
MAX_ERRORES_SEGUIDOS = 5
FILAS_POR_LOTE = 1000
ORIGEN_HISTORICO = "HISTORICO"


class _DetenerCarga(Exception):
    """Errores repetidos: se retoma en el próximo intento programado."""


@dataclass
class _Avance:
    ventana_dias: int
    errores_seguidos: int = 0
    consultas: int = 0
    guardadas: int = 0
    dias_sin_datos: list[str] = field(default_factory=list)


def _inicio_del_dia(dia: date) -> datetime:
    return datetime(dia.year, dia.month, dia.day, tzinfo=ZONA_ARGENTINA)


def _sensor_completo(sesion: Session, sensor: Sensor, desde: date) -> bool:
    """Un sensor con históricos del primer día de la ventana ya terminó su carga."""
    mas_antigua = sesion.scalar(
        select(func.min(Observacion.medido_en)).where(
            Observacion.sensor_id == sensor.id,
            Observacion.origen == ORIGEN_HISTORICO,
            Observacion.medido_en >= _inicio_del_dia(desde),
        )
    )
    return mas_antigua is not None and mas_antigua < _inicio_del_dia(desde + timedelta(days=1))


def _partir(desde: date, hasta: date, tamano: int) -> list[tuple[date, date]]:
    """Ventanas de `tamano` días, ordenadas de la más antigua a la más reciente."""
    ventanas = []
    fin = hasta
    while fin >= desde:
        inicio = max(desde, fin - timedelta(days=tamano - 1))
        ventanas.append((inicio, fin))
        fin = inicio - timedelta(days=1)
    ventanas.reverse()
    return ventanas


def _guardar(
    sesion: Session, sensor: Sensor, registros: list[dict[str, Any]], ahora: datetime
) -> tuple[int, date | None]:
    """Devuelve la cantidad de filas nuevas y el día local más antiguo recibido."""
    filas = []
    mas_antiguo = None
    for crudo in registros:
        medido_en = parsear_fecha(crudo.get("fecha"))
        if medido_en is None:
            continue
        dia = medido_en.astimezone(ZONA_ARGENTINA).date()
        mas_antiguo = dia if mas_antiguo is None else min(mas_antiguo, dia)
        valor, calidad = clasificar_lectura(sensor.magnitud, crudo.get("valor"))
        filas.append(
            {
                "sensor_id": sensor.id,
                "medido_en": medido_en,
                "valor": valor,
                "calidad": calidad,
                "alarma": None,
                "origen": ORIGEN_HISTORICO,
                "recibido_en": ahora,
            }
        )
    guardadas = 0
    for inicio in range(0, len(filas), FILAS_POR_LOTE):
        guardadas += len(
            sesion.execute(
                insert(Observacion)
                .values(filas[inicio : inicio + FILAS_POR_LOTE])
                .on_conflict_do_nothing()
                .returning(Observacion.sensor_id)
            ).all()
        )
    return guardadas, mas_antiguo


def _cargar_sensor(
    sesion: Session,
    cliente: ClienteSat2,
    estacion: Estacion,
    sensor: Sensor,
    desde: date,
    hasta: date,
    avance: _Avance,
    ahora: datetime,
    esperar: Callable[[], None],
) -> None:
    # Pila con la ventana más reciente arriba: la carga avanza del presente al pasado.
    pendientes = _partir(desde, hasta, avance.ventana_dias)
    while pendientes:
        inicio, fin = pendientes.pop()
        esperar()
        avance.consultas += 1
        try:
            registros = cliente.recuperar_historicos(
                estacion.id_equipo_sat2, sensor.id_sensor_sat2, inicio, fin
            )
        except ErrorCredenciales:
            raise
        except ErrorSat2:
            avance.errores_seguidos += 1
            if avance.errores_seguidos >= MAX_ERRORES_SEGUIDOS:
                raise _DetenerCarga from None
            dias = (fin - inicio).days + 1
            if dias > 1:
                # Se reduce para todo lo que sigue: reintentar lo mismo solo insistiría.
                avance.ventana_dias = max(1, dias // 2)
                pendientes.extend(_partir(inicio, fin, avance.ventana_dias))
            else:
                avance.dias_sin_datos.append(inicio.isoformat())
            continue

        avance.errores_seguidos = 0
        guardadas, mas_antiguo = _guardar(sesion, sensor, registros, ahora)
        avance.guardadas += guardadas
        sesion.commit()
        # Respuesta recortada: faltan los días anteriores al primer dato recibido.
        if mas_antiguo is not None and mas_antiguo > inicio:
            pendientes.append((inicio, mas_antiguo - timedelta(days=1)))


def _id_de_humedad(sesion: Session, estacion: Estacion, altura: int) -> int | None:
    return sesion.scalar(
        select(Sensor.id).where(
            Sensor.estacion_id == estacion.id,
            Sensor.magnitud == "HUMEDAD_RELATIVA",
            Sensor.altura_m == altura,
        )
    )


def _marcar_humedad_incoherente(sesion: Session, estacion: Estacion, desde: date) -> None:
    hr2m = _id_de_humedad(sesion, estacion, 2)
    hr10m = _id_de_humedad(sesion, estacion, 10)
    if hr2m is None or hr10m is None:
        return

    def serie(sensor_id: int) -> dict[datetime, Decimal]:
        filas = sesion.execute(
            select(Observacion.medido_en, Observacion.valor).where(
                Observacion.sensor_id == sensor_id,
                Observacion.medido_en >= _inicio_del_dia(desde),
                Observacion.valor.is_not(None),
            )
        )
        return {momento: valor for momento, valor in filas}

    # Se compara en Python: justo después de la carga la base aún no tiene estadísticas y
    # un cruce entre tablas puede elegir un plan cuadrático.
    valores_2m = serie(hr2m)
    valores_10m = serie(hr10m)
    instantes = [
        momento
        for momento, valor in valores_2m.items()
        if humedad_incoherente(valor, valores_10m.get(momento))
    ]
    for inicio in range(0, len(instantes), FILAS_POR_LOTE):
        sesion.execute(
            update(Observacion)
            .where(
                Observacion.sensor_id.in_((hr2m, hr10m)),
                Observacion.medido_en.in_(instantes[inicio : inicio + FILAS_POR_LOTE]),
                Observacion.calidad == CALIDAD_OK,
            )
            .values(calidad=CALIDAD_SOSPECHOSO)
        )


def ejecutar_carga_inicial(
    sesion: Session,
    cliente: ClienteSat2,
    estacion: Estacion,
    ahora: datetime,
    dias: int = DIAS_NUCLEO,
    pausa_segundos: float = PAUSA_SEGUNDOS,
    dormir: Callable[[float], None] = time.sleep,
) -> EjecucionIngesta:
    """Carga los últimos `dias`. Repetirla solo completa lo que falta."""
    hasta = ahora.astimezone(ZONA_ARGENTINA).date()
    desde = hasta - timedelta(days=dias - 1)
    ejecucion = EjecucionIngesta(
        estacion_id=estacion.id,
        tipo="CARGA_INICIAL",
        ventana_desde=_inicio_del_dia(desde),
        ventana_hasta=_inicio_del_dia(hasta),
        iniciada_en=ahora,
        resultado="EN_CURSO",
    )
    sesion.add(ejecucion)
    sesion.commit()

    avance = _Avance(ventana_dias=min(VENTANA_MAXIMA_DIAS, dias))

    def esperar() -> None:
        if avance.consultas:
            dormir(pausa_segundos)

    sensores = sesion.scalars(
        select(Sensor).where(Sensor.estacion_id == estacion.id).order_by(Sensor.id)
    ).all()
    try:
        for sensor in sensores:
            if not _sensor_completo(sesion, sensor, desde):
                _cargar_sensor(
                    sesion, cliente, estacion, sensor, desde, hasta, avance, ahora, esperar
                )
        _marcar_humedad_incoherente(sesion, estacion, desde)
        ejecucion.resultado = "PARCIAL" if avance.dias_sin_datos else "EXITO"
        if avance.dias_sin_datos:
            ejecucion.detalle = "Días con error: " + ", ".join(avance.dias_sin_datos[:20])
    except (_DetenerCarga, ErrorCredenciales) as motivo:
        sesion.rollback()
        ejecucion.resultado = "ERROR"
        ejecucion.detalle = f"Carga detenida: {type(motivo).__name__}"
        registro.warning("Carga de la estación %s detenida", estacion.id)
    ejecucion.lecturas_guardadas = avance.guardadas
    ejecucion.finalizada_en = ahora
    sesion.commit()
    return ejecucion
