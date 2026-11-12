"""Estado del sistema en la API de administración (D4 de weather-track-monitoreo)."""

# Los fixtures de las pruebas de administración se importan y se reciben como parámetros.
# ruff: noqa: F811

from datetime import timedelta
from decimal import Decimal

import pytest

from app.datos.modelos import AlertaSistema, EjecucionIngesta, Estacion, Observacion, Sensor
from tests.test_administracion_api import (  # noqa: F401
    ADMIN,
    COMUN,
    INICIO,
    admin,
    claves,
    cliente,
    comun,
    ingresar,
    reloj,
)

ESTADO = "/api/v1/administracion/estado"


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
            medido_en=INICIO - timedelta(minutes=5),
            valor=Decimal("20"),
            calidad="OK",
            origen="INSTANTANEO",
            recibido_en=INICIO,
        )
    )
    sesion.commit()
    return estacion


def ciclo(sesion, estacion, hace: timedelta, resultado="EXITO"):
    momento = INICIO - hace
    sesion.add(
        EjecucionIngesta(
            estacion_id=estacion.id, tipo="CICLO", iniciada_en=momento, finalizada_en=momento, resultado=resultado
        )
    )
    sesion.commit()


@pytest.mark.parametrize("quien", ["sin_sesion", "comun"])
def test_para_el_resto_la_ruta_no_existe(cliente, comun, quien):
    if quien == "comun":
        ingresar(cliente, COMUN)
    inexistente = cliente.get("/api/v1/no-existe")

    respuesta = cliente.get(ESTADO)

    assert respuesta.status_code == 404
    assert respuesta.json() == inexistente.json()


def test_muestra_cada_control_con_su_estado(cliente, sesion, admin, estacion, monkeypatch):
    monkeypatch.setenv("SAT2_MODO", "real")
    ciclo(sesion, estacion, timedelta(minutes=5))
    ingresar(cliente, ADMIN)

    estado = cliente.get(ESTADO).json()

    controles = {(c["tipo"], c["objeto"]): c for c in estado["controles"]}
    assert controles[("DATOS_VIEJOS", "INTA Pergamino")]["estado"] == "OK"
    assert "hace 5 minutos" in controles[("DATOS_VIEJOS", "INTA Pergamino")]["detalle"]
    assert controles[("CICLOS_FALLIDOS", "INTA Pergamino")]["estado"] == "OK"
    assert controles[("FUERZA_BRUTA", "")]["estado"] == "OK"
    assert controles[("DISCO_CASI_LLENO", "")]["estado"] == "OK"


def test_el_disco_toma_el_estado_de_su_alerta(cliente, sesion, admin, monkeypatch):
    """La API no ve el disco: lo mide el worker y deja la alerta abierta."""
    sesion.add(
        AlertaSistema(
            tipo="DISCO_CASI_LLENO", objeto="", abierta_en=INICIO, detalle="Queda el 7 % libre en el disco de la base."
        )
    )
    sesion.commit()
    ingresar(cliente, ADMIN)

    [disco] = [c for c in cliente.get(ESTADO).json()["controles"] if c["tipo"] == "DISCO_CASI_LLENO"]

    assert disco["estado"] == "ALERTA"
    assert disco["detalle"] == "Queda el 7 % libre en el disco de la base."


@pytest.mark.parametrize(
    ("hace", "esperado"),
    [(timedelta(minutes=5), "ACTIVO"), (timedelta(minutes=20), "ACTIVO"), (timedelta(minutes=21), "SIN_ACTIVIDAD")],
)
def test_el_estado_del_worker_sale_del_ultimo_ciclo(cliente, sesion, admin, estacion, monkeypatch, hace, esperado):
    monkeypatch.setenv("SAT2_MODO", "real")
    ciclo(sesion, estacion, hace)
    ingresar(cliente, ADMIN)

    worker = cliente.get(ESTADO).json()["worker"]

    assert worker["estado"] == esperado
    assert worker["ultimo_ciclo_en"] is not None


def test_sin_ciclos_el_worker_esta_sin_actividad(cliente, admin, monkeypatch):
    monkeypatch.setenv("SAT2_MODO", "real")
    ingresar(cliente, ADMIN)

    assert cliente.get(ESTADO).json()["worker"] == {"estado": "SIN_ACTIVIDAD", "ultimo_ciclo_en": None}


def test_en_modo_prueba_no_hay_ciclos_que_esperar(cliente, admin, estacion, monkeypatch):
    monkeypatch.setenv("SAT2_MODO", "prueba")
    ingresar(cliente, ADMIN)

    estado = cliente.get(ESTADO).json()

    assert estado["worker"]["estado"] == "MODO_PRUEBA"
    assert {c["tipo"] for c in estado["controles"]} == {"DISCO_CASI_LLENO", "FUERZA_BRUTA"}


def test_muestra_las_ultimas_20_alertas_de_la_mas_nueva_a_la_mas_vieja(cliente, sesion, admin):
    for n in range(22):
        sesion.add(
            AlertaSistema(
                tipo="FUERZA_BRUTA",
                objeto="",
                abierta_en=INICIO - timedelta(hours=n + 1),
                cerrada_en=INICIO - timedelta(hours=n + 1) + timedelta(minutes=30),
                detalle=f"{20 + n} ingresos fallidos en 15 minutos.",
            )
        )
    sesion.commit()
    ingresar(cliente, ADMIN)

    alertas = cliente.get(ESTADO).json()["alertas"]

    assert len(alertas) == 20
    assert alertas[0]["detalle"] == "20 ingresos fallidos en 15 minutos."
    assert alertas[0]["cerrada_en"] is not None


def test_informa_el_tamano_de_la_base(cliente, admin):
    ingresar(cliente, ADMIN)

    assert cliente.get(ESTADO).json()["base_tamano_bytes"] > 0
