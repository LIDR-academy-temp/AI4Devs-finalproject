"""Recuperación de huecos en los últimos 31 días (D1 a D3 de weather-track-historicos-sin-huecos).

El ciclo de 10 minutos solo guarda la lectura actual: si la instalación estuvo apagada o SAT2 no
respondió, esas horas quedarían vacías para siempre. Esta tarea las pide como históricos, con las
mismas pausas y la misma ventana adaptable de la carga inicial.
"""

import time
from collections.abc import Callable
from datetime import date, datetime, timedelta
from itertools import pairwise

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.modelos import EjecucionIngesta, Estacion, Observacion, Sensor
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.ingesta.carga_inicial import (
    PAUSA_SEGUNDOS,
    VENTANA_MAXIMA_DIAS,
    _Avance,
    _cargar_sensor,
    _DetenerCarga,
    _inicio_del_dia,
    _marcar_humedad_incoherente,
)
from app.ingesta.cliente_sat2 import ClienteSat2, ErrorCredenciales

VENTANA_DIAS = 31
# Las lecturas llegan cada 10 minutos: más de 30 son al menos tres lecturas perdidas seguidas.
HUECO_MINIMO = timedelta(minutes=30)
INTERVALO_LECTURAS = timedelta(minutes=10)
# Un día pedido a SAT2 hasta una hora después de terminar puede no estar completo todavía.
MARGEN_DIA_TERMINADO = timedelta(hours=1)
TIPOS_QUE_REVISAN = ("CARGA_INICIAL", "RECUPERACION")
RESULTADOS_QUE_REVISAN = ("EXITO", "PARCIAL")


def _dia_local(momento: datetime) -> date:
    return momento.astimezone(ZONA_ARGENTINA).date()


def _dias_entre(desde: date, hasta: date) -> list[date]:
    return [desde + timedelta(days=n) for n in range((hasta - desde).days + 1)]


def _dias_con_huecos(
    sesion: Session, estacion: Estacion, inicio: datetime, ahora: datetime
) -> set[date]:
    """Los días con algún tramo de más de 30 minutos sin lecturas de la estación.

    Se mira la estación y no cada sensor: un sensor que SAT2 nunca informa no debe disparar
    consultas cada hora.
    """
    instantes = sesion.scalars(
        select(Observacion.medido_en)
        .join(Sensor)
        .where(
            Sensor.estacion_id == estacion.id,
            Observacion.medido_en >= inicio,
            Observacion.medido_en <= ahora,
        )
        .distinct()
        .order_by(Observacion.medido_en)
    ).all()
    # Los bordes de la ventana cuentan como lecturas, así los extremos vacíos también son huecos.
    bordes = [inicio - INTERVALO_LECTURAS, *instantes, ahora + INTERVALO_LECTURAS]
    dias: set[date] = set()
    for anterior, siguiente in pairwise(bordes):
        if siguiente - anterior > HUECO_MINIMO:
            primera_faltante = anterior + INTERVALO_LECTURAS
            ultima_faltante = min(siguiente - INTERVALO_LECTURAS, ahora)
            dias.update(_dias_entre(_dia_local(primera_faltante), _dia_local(ultima_faltante)))
    return dias


def _dias_ya_revisados(sesion: Session, estacion: Estacion, dias: set[date]) -> set[date]:
    """Los días terminados que SAT2 ya devolvió después de terminar: no tiene más para dar."""
    ejecuciones = sesion.execute(
        select(
            EjecucionIngesta.ventana_desde,
            EjecucionIngesta.ventana_hasta,
            EjecucionIngesta.iniciada_en,
        ).where(
            EjecucionIngesta.estacion_id == estacion.id,
            EjecucionIngesta.tipo.in_(TIPOS_QUE_REVISAN),
            EjecucionIngesta.resultado.in_(RESULTADOS_QUE_REVISAN),
            EjecucionIngesta.ventana_desde.is_not(None),
        )
    ).all()
    revisados = set()
    for dia in dias:
        inicio = _inicio_del_dia(dia)
        terminado = _inicio_del_dia(dia + timedelta(days=1)) + MARGEN_DIA_TERMINADO
        if any(
            desde <= inicio <= hasta and iniciada >= terminado
            for desde, hasta, iniciada in ejecuciones
        ):
            revisados.add(dia)
    return revisados


def _agrupar(dias: set[date]) -> list[tuple[date, date]]:
    """Días consecutivos en un solo rango: una consulta por sensor en lugar de una por día."""
    grupos: list[tuple[date, date]] = []
    for dia in sorted(dias):
        if grupos and dia == grupos[-1][1] + timedelta(days=1):
            grupos[-1] = (grupos[-1][0], dia)
        else:
            grupos.append((dia, dia))
    return grupos


def recuperar_huecos(
    sesion: Session,
    cliente: ClienteSat2,
    estacion: Estacion,
    ahora: datetime,
    dias: int = VENTANA_DIAS,
    pausa_segundos: float = PAUSA_SEGUNDOS,
    dormir: Callable[[float], None] = time.sleep,
) -> list[EjecucionIngesta]:
    """Pide a SAT2 los huecos de los últimos `dias`. Una ejecución por grupo de días seguidos."""
    hoy = _dia_local(ahora)
    inicio = _inicio_del_dia(hoy - timedelta(days=dias - 1))
    pendientes = _dias_con_huecos(sesion, estacion, inicio, ahora)
    pendientes -= _dias_ya_revisados(sesion, estacion, pendientes)
    if not pendientes:
        return []

    sensores = sesion.scalars(
        select(Sensor).where(Sensor.estacion_id == estacion.id).order_by(Sensor.id)
    ).all()
    avance = _Avance(ventana_dias=min(VENTANA_MAXIMA_DIAS, dias))

    def esperar() -> None:
        if avance.consultas:
            dormir(pausa_segundos)

    ejecuciones = []
    for desde, hasta in _agrupar(pendientes):
        ejecucion = EjecucionIngesta(
            estacion_id=estacion.id,
            tipo="RECUPERACION",
            ventana_desde=_inicio_del_dia(desde),
            ventana_hasta=_inicio_del_dia(hasta),
            iniciada_en=ahora,
            resultado="EN_CURSO",
        )
        sesion.add(ejecucion)
        sesion.commit()
        ejecuciones.append(ejecucion)
        guardadas_antes = avance.guardadas
        dias_sin_datos_antes = len(avance.dias_sin_datos)
        try:
            for sensor in sensores:
                _cargar_sensor(
                    sesion, cliente, estacion, sensor, desde, hasta, avance, ahora, esperar
                )
            _marcar_humedad_incoherente(sesion, estacion, desde)
            con_error = avance.dias_sin_datos[dias_sin_datos_antes:]
            ejecucion.resultado = "PARCIAL" if con_error else "EXITO"
            if con_error:
                ejecucion.detalle = "Días con error: " + ", ".join(con_error[:20])
            detener = False
        except (_DetenerCarga, ErrorCredenciales) as motivo:
            sesion.rollback()
            ejecucion.resultado = "ERROR"
            ejecucion.detalle = f"Recuperación detenida: {type(motivo).__name__}"
            detener = True
        ejecucion.lecturas_guardadas = avance.guardadas - guardadas_antes
        ejecucion.finalizada_en = ahora
        sesion.commit()
        if detener:
            # SAT2 falla seguido o rechaza las credenciales: se reintenta en la próxima hora.
            break
    return ejecuciones
