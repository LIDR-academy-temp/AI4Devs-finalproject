from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app import semillas
from app.datos.modelos import Estacion, Sensor, Usuario, UsuarioEstacion
from app.dominio.catalogo import (
    SensorNoClasificable,
    clasificar_magnitud,
    leer_altura_m,
    normalizar_nombre,
)
from app.ingesta.cliente_simulado import ClienteSat2Simulado


def contar(sesion, modelo) -> int:
    return sesion.scalar(select(func.count()).select_from(modelo))


def test_ejecutar_dos_veces_no_duplica(sesion):
    primera_clave = semillas.cargar_semillas(sesion)
    sesion.flush()
    conteos = [contar(sesion, m) for m in (Estacion, Sensor, Usuario, UsuarioEstacion)]
    assert conteos == [1, 11, 1, 1]
    assert primera_clave

    assert semillas.cargar_semillas(sesion) is None
    sesion.flush()
    assert [contar(sesion, m) for m in (Estacion, Sensor, Usuario, UsuarioEstacion)] == conteos


def test_la_contrasena_se_guarda_solo_como_hash(sesion):
    clave = semillas.cargar_semillas(sesion)
    sesion.flush()
    guardado = sesion.scalar(select(Usuario.password_hash))
    assert guardado.startswith("$argon2id$")
    assert clave not in guardado


def test_los_sensores_quedan_clasificados(sesion):
    semillas.cargar_semillas(sesion)
    sesion.flush()
    temperatura = sesion.scalar(
        select(Sensor).where(Sensor.clave_normalizada == "temp amb a 10 mts")
    )
    assert temperatura.magnitud == "TEMPERATURA"
    assert temperatura.altura_m == Decimal("10")
    anemometro = sesion.scalar(select(Sensor).where(Sensor.nombre == "Anemómetro"))
    assert anemometro.clave_normalizada == "anemometro"
    assert anemometro.altura_m is None


def test_no_carga_datos_ficticios_en_modo_real(monkeypatch, capsys):
    monkeypatch.setenv("SAT2_MODO", "real")
    assert semillas.principal() == 2
    assert "modo simulado" in capsys.readouterr().err


def test_con_escenarios_asigna_todas_las_estaciones_menos_la_ajena(sesion):
    assert semillas.cargar_semillas_de_escenarios(sesion)
    sesion.flush()
    asignadas = sesion.scalars(
        select(Estacion.nombre).join(UsuarioEstacion, UsuarioEstacion.estacion_id == Estacion.id)
    ).all()
    assert len(asignadas) == contar(sesion, Estacion) - 1 == 9
    assert semillas.ESTACION_AJENA not in asignadas

    assert semillas.cargar_semillas_de_escenarios(sesion) is None


@pytest.mark.parametrize(
    ("nombre", "clave"),
    [
        ("Pres Atmosférica", "pres atmosferica"),
        ("Anemómetro", "anemometro"),
        ("Temp Amb. a 2 Mts", "temp amb a 2 mts"),
        ("  HUM  Amb.  a 10 Mts ", "hum amb a 10 mts"),
    ],
)
def test_normaliza_nombres(nombre, clave):
    assert normalizar_nombre(nombre) == clave


@pytest.mark.parametrize(
    ("nombre", "magnitud"),
    [
        ("Bateria", "BATERIA"),
        ("Pres Atmosférica", "PRESION"),
        ("Rad Solar", "RADIACION"),
        ("Hum Amb. a 2 Mts", "HUMEDAD_RELATIVA"),
        ("Humedad de Hoja", "MOJADO_FOLIAR"),
        ("Temp Amb. a 2 Mts", "TEMPERATURA"),
        ("Veleta", "VIENTO_DIRECCION"),
        ("Anemómetro", "VIENTO_VELOCIDAD"),
        ("Pluviometro", "PRECIPITACION"),
    ],
)
def test_clasifica_las_magnitudes(nombre, magnitud):
    assert clasificar_magnitud(nombre) == magnitud


def test_todos_los_sensores_simulados_se_clasifican():
    for sensor in ClienteSat2Simulado().recuperar_equipos()[0]["sensores"]:
        assert clasificar_magnitud(sensor["nombre"])


def test_sensor_desconocido_no_se_clasifica():
    with pytest.raises(SensorNoClasificable):
        clasificar_magnitud("Sensor nuevo")


def test_lee_la_altura():
    assert leer_altura_m("Hum Amb. a 10 Mts") == Decimal("10")
    assert leer_altura_m("Veleta") is None
