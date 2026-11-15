"""Métricas para Prometheus (D5 de weather-track-monitoreo). Ninguna lleva datos personales."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from prometheus_client.parser import text_string_to_metric_families

from app.datos.modelos import (
    AlertaSistema,
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    Observacion,
    Sensor,
)
from app.monitoreo.controles import Disco
from app.monitoreo.metricas import NOMBRES, actualizar_metricas, exponer

AHORA = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


@pytest.fixture
def estacion(sesion):
    estacion = Estacion(id_equipo_sat2=1, nombre="INTA Pergamino", latitud=Decimal("-34"), longitud=Decimal("-60"))
    sesion.add(estacion)
    sesion.flush()
    sensor = Sensor(
        estacion_id=estacion.id,
        id_sensor_sat2=217,
        nombre="Temp Amb. a 2 Mts",
        clave_normalizada="temp amb. a 2 mts",
        magnitud="TEMPERATURA",
        unidad="°C",
    )
    sesion.add(sensor)
    sesion.flush()
    sesion.add(
        Observacion(
            sensor_id=sensor.id,
            medido_en=AHORA - timedelta(minutes=7),
            valor=Decimal("20"),
            calidad="OK",
            origen="INSTANTANEO",
            recibido_en=AHORA,
        )
    )
    for minutos, resultado in ((30, "EXITO"), (20, "ERROR"), (10, "ERROR")):
        momento = AHORA - timedelta(minutes=minutos)
        sesion.add(
            EjecucionIngesta(
                estacion_id=estacion.id, tipo="CICLO", iniciada_en=momento, finalizada_en=momento, resultado=resultado
            )
        )
    sesion.flush()
    return estacion


def familias() -> dict[str, list]:
    return {
        familia.name: familia.samples
        for familia in text_string_to_metric_families(exponer().decode("utf-8"))
    }


def valor(muestras, **etiquetas) -> float:
    [muestra] = [m for m in muestras if all(m.labels.get(k) == v for k, v in etiquetas.items())]
    return muestra.value


def test_publica_todas_las_metricas_del_diseno(sesion, estacion):
    actualizar_metricas(sesion, AHORA, "real", Disco(total=200, libre=50))

    assert set(NOMBRES) <= set(familias())


def test_frescura_ciclos_y_ultimo_ciclo_por_estacion(sesion, estacion):
    actualizar_metricas(sesion, AHORA, "real", None)
    medidas = familias()

    assert valor(medidas["weathertrack_lectura_antiguedad_segundos"], estacion="INTA Pergamino") == 7 * 60
    assert valor(medidas["weathertrack_ciclos_fallidos_seguidos"], estacion="INTA Pergamino") == 2
    assert valor(medidas["weathertrack_ciclo_ultimo_timestamp_segundos"], estacion="INTA Pergamino") == (
        (AHORA - timedelta(minutes=10)).timestamp()
    )


def test_base_disco_ingresos_y_alertas(sesion, estacion):
    for n in range(4):
        sesion.add(IntentoAcceso(email=f"persona{n}@ejemplo.example", ocurrido_en=AHORA - timedelta(minutes=2)))
    sesion.add(AlertaSistema(tipo="DATOS_VIEJOS", objeto="INTA Pergamino", abierta_en=AHORA, detalle="x"))
    sesion.flush()

    actualizar_metricas(sesion, AHORA, "real", Disco(total=200, libre=50))
    medidas = familias()

    assert valor(medidas["weathertrack_base_tamano_bytes"]) > 0
    assert valor(medidas["weathertrack_disco_libre_ratio"]) == 0.25
    assert valor(medidas["weathertrack_ingresos_fallidos_15m"]) == 4
    assert valor(medidas["weathertrack_alertas_abiertas"], tipo="DATOS_VIEJOS") == 1
    assert valor(medidas["weathertrack_alertas_abiertas"], tipo="FUERZA_BRUTA") == 0


def test_sin_medicion_del_disco_no_publica_un_valor_inventado(sesion, estacion):
    actualizar_metricas(sesion, AHORA, "real", Disco(total=200, libre=50))

    actualizar_metricas(sesion, AHORA, "real", None)

    assert "weathertrack_disco_libre_ratio" not in {
        m.name for muestras in familias().values() for m in muestras
    }


def test_una_estacion_que_se_inactiva_deja_de_publicarse(sesion, estacion):
    actualizar_metricas(sesion, AHORA, "real", None)
    estacion.activa = False
    estacion.inactiva_desde = AHORA
    sesion.flush()

    actualizar_metricas(sesion, AHORA, "real", None)

    assert familias()["weathertrack_lectura_antiguedad_segundos"] == []


def test_en_modo_prueba_no_publica_la_ingesta(sesion, estacion):
    actualizar_metricas(sesion, AHORA, "prueba", None)

    assert familias()["weathertrack_lectura_antiguedad_segundos"] == []


def test_ninguna_metrica_lleva_correos_ni_direcciones_ip(sesion, estacion):
    sesion.add(IntentoAcceso(email="victima@ejemplo.example", ocurrido_en=AHORA))
    sesion.flush()

    actualizar_metricas(sesion, AHORA, "real", Disco(total=200, libre=50))
    texto = exponer().decode("utf-8")

    assert "@" not in texto
    assert "victima" not in texto
