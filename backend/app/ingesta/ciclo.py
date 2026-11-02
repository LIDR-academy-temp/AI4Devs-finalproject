"""Ciclo de 10 minutos: lecturas actuales, calidad y recomendación."""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.datos.modelos import EjecucionIngesta, Estacion, Observacion, Recomendacion, Sensor
from app.dominio.catalogo import normalizar_nombre
from app.dominio.motor_tis import (
    CALIDAD_FALTANTE,
    CALIDAD_SOSPECHOSO,
    Lectura,
    LecturasTis,
    evaluar,
)
from app.dominio.normalizacion import (
    clasificar_lectura,
    humedad_incoherente,
    parsear_fecha,
)
from app.ingesta.cliente_sat2 import ClienteSat2, ErrorSat2

registro = logging.getLogger("weather_track.ciclo")

ORIGEN_INSTANTANEO = "INSTANTANEO"
DOS = Decimal("2")
DIEZ = Decimal("10")


class RespuestaInvalida(ErrorSat2):
    """La respuesta no trae lo mínimo para registrar una medición."""


def _es_sensor(sensor: Sensor, magnitud: str, altura: Decimal | None = None) -> bool:
    if sensor.magnitud != magnitud:
        return False
    return altura is None or sensor.altura_m == altura


def _marcar_humedad_incoherente(
    filas: dict[int, dict[str, Any]], sensores: list[Sensor]
) -> None:
    hr2m = next((s for s in sensores if _es_sensor(s, "HUMEDAD_RELATIVA", DOS)), None)
    hr10m = next((s for s in sensores if _es_sensor(s, "HUMEDAD_RELATIVA", DIEZ)), None)
    if hr2m is None or hr10m is None:
        return
    if humedad_incoherente(filas[hr2m.id]["valor"], filas[hr10m.id]["valor"]):
        filas[hr2m.id]["calidad"] = CALIDAD_SOSPECHOSO
        filas[hr10m.id]["calidad"] = CALIDAD_SOSPECHOSO


def _armar_filas(
    sensores: list[Sensor],
    lecturas_crudas: list[dict[str, Any]],
    medido_en: datetime,
    ahora: datetime,
) -> tuple[list[dict[str, Any]], list[str]]:
    por_clave = {normalizar_nombre(str(l.get("nombreSensor"))): l for l in lecturas_crudas}
    filas: dict[int, dict[str, Any]] = {}
    for sensor in sensores:
        cruda = por_clave.pop(sensor.clave_normalizada, None)
        if cruda is None:
            valor, calidad, alarma = None, CALIDAD_FALTANTE, None
        else:
            valor, calidad = clasificar_lectura(sensor.magnitud, cruda.get("valor"), sensor.unidad)
            alarma = cruda.get("alarma") if isinstance(cruda.get("alarma"), bool) else None
        filas[sensor.id] = {
            "sensor_id": sensor.id,
            "medido_en": medido_en,
            "valor": valor,
            "calidad": calidad,
            "alarma": alarma,
            "origen": ORIGEN_INSTANTANEO,
            "recibido_en": ahora,
        }
    _marcar_humedad_incoherente(filas, sensores)
    desconocidos = [str(l.get("nombreSensor")) for l in por_clave.values()]
    return list(filas.values()), desconocidos


def _lectura_de(
    sensores: list[Sensor],
    observaciones: dict[int, Observacion],
    magnitud: str,
    altura: Decimal | None = None,
) -> Lectura:
    sensor = next((s for s in sensores if _es_sensor(s, magnitud, altura)), None)
    observacion = observaciones.get(sensor.id) if sensor else None
    nombre = sensor.nombre if sensor else magnitud
    if observacion is None:
        return Lectura(nombre, None, CALIDAD_FALTANTE)
    return Lectura(nombre, observacion.valor, observacion.calidad)


def _guardar_recomendacion(
    sesion: Session,
    estacion: Estacion,
    sensores: list[Sensor],
    medido_en: datetime,
    ahora: datetime,
) -> None:
    observaciones = {
        o.sensor_id: o
        for o in sesion.scalars(
            select(Observacion).where(
                Observacion.medido_en == medido_en,
                Observacion.sensor_id.in_([s.id for s in sensores]),
            )
        )
    }
    resultado = evaluar(
        LecturasTis(
            t2m=_lectura_de(sensores, observaciones, "TEMPERATURA", DOS),
            t10m=_lectura_de(sensores, observaciones, "TEMPERATURA", DIEZ),
            hr2m=_lectura_de(sensores, observaciones, "HUMEDAD_RELATIVA", DOS),
            hr10m=_lectura_de(sensores, observaciones, "HUMEDAD_RELATIVA", DIEZ),
            viento=_lectura_de(sensores, observaciones, "VIENTO_VELOCIDAD"),
            radiacion=_lectura_de(sensores, observaciones, "RADIACION"),
        )
    )
    sesion.execute(
        insert(Recomendacion)
        .values(
            estacion_id=estacion.id,
            medido_en=medido_en,
            calculado_en=ahora,
            version_metodo=resultado.version_metodo,
            estado=resultado.estado,
            indice=resultado.indice,
            delta_t_c=resultado.delta_t_c,
            inversion_detectada=resultado.inversion_detectada,
            motivos=[{"codigo": m.codigo, "detalle": m.detalle} for m in resultado.motivos],
        )
        .on_conflict_do_nothing(index_elements=["estacion_id", "medido_en", "version_metodo"])
    )


def ejecutar_ciclo(
    sesion: Session, cliente: ClienteSat2, estacion: Estacion, ahora: datetime
) -> EjecucionIngesta:
    """Guarda las lecturas y la recomendación. Un error de la fuente queda registrado."""
    ejecucion = EjecucionIngesta(
        estacion_id=estacion.id, tipo="CICLO", iniciada_en=ahora, resultado="EN_CURSO"
    )
    sesion.add(ejecucion)
    sesion.commit()
    try:
        datos = cliente.recuperar_instantaneos(estacion.id_equipo_sat2)
        medido_en = parsear_fecha(datos.get("fechaUltimaActualizacionDatos"))
        lecturas_crudas = datos.get("datosSensores")
        if medido_en is None or not isinstance(lecturas_crudas, list):
            raise RespuestaInvalida("Respuesta de instantáneos sin fecha o sin lecturas")

        sensores = list(sesion.scalars(select(Sensor).where(Sensor.estacion_id == estacion.id)))
        filas, desconocidos = _armar_filas(sensores, lecturas_crudas, medido_en, ahora)
        guardadas = 0
        if filas:
            guardadas = len(
                sesion.execute(
                    insert(Observacion)
                    .values(filas)
                    .on_conflict_do_nothing()
                    .returning(Observacion.sensor_id)
                ).all()
            )
        _guardar_recomendacion(sesion, estacion, sensores, medido_en, ahora)

        ejecucion.lecturas_guardadas = guardadas
        ejecucion.resultado = "PARCIAL" if desconocidos else "EXITO"
        ejecucion.detalle = (
            f"Sensores desconocidos: {', '.join(desconocidos)}" if desconocidos else None
        )
    except ErrorSat2 as error:
        sesion.rollback()
        ejecucion.resultado = "ERROR"
        # Los mensajes de ErrorSat2 nunca incluyen cuerpos, tokens ni claves.
        ejecucion.detalle = f"{type(error).__name__}: {error}"
        registro.warning("Ciclo de la estación %s con error: %s", estacion.id, ejecucion.detalle)
    ejecucion.finalizada_en = ahora
    sesion.commit()
    return ejecucion
