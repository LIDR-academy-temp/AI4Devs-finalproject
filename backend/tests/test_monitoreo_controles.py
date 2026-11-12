"""Controles de salud de `system-monitoring` (D2 de weather-track-monitoreo), con sus límites."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.api.limite_ip import LIMITES, _inicio_de_ventana
from app.datos.modelos import (
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    LimiteIp,
    Observacion,
    Sensor,
)
from app.monitoreo import umbrales
from app.monitoreo.controles import Disco, evaluar

AHORA = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


@pytest.fixture
def estacion(sesion):
    estacion = Estacion(id_equipo_sat2=1, nombre="INTA Pergamino", latitud=Decimal("-34"), longitud=Decimal("-60"))
    sesion.add(estacion)
    sesion.flush()
    sesion.add(
        Sensor(
            estacion_id=estacion.id,
            id_sensor_sat2=217,
            nombre="Temp Amb. a 2 Mts",
            clave_normalizada="temp amb. a 2 mts",
            magnitud="TEMPERATURA",
            unidad="°C",
        )
    )
    sesion.flush()
    return estacion


def leer(sesion, estacion, hace: timedelta):
    sensor = sesion.query(Sensor).filter_by(estacion_id=estacion.id).one()
    sesion.add(
        Observacion(
            sensor_id=sensor.id,
            medido_en=AHORA - hace,
            valor=Decimal("20"),
            calidad="OK",
            origen="INSTANTANEO",
            recibido_en=AHORA - hace,
        )
    )
    sesion.flush()


def ciclo(sesion, estacion, resultado: str, hace: timedelta):
    momento = AHORA - hace
    sesion.add(
        EjecucionIngesta(
            estacion_id=estacion.id,
            tipo="CICLO",
            iniciada_en=momento,
            finalizada_en=momento,
            resultado=resultado,
        )
    )
    sesion.flush()


def resultado(resultados, tipo, objeto=""):
    [encontrado] = [r for r in resultados if r.tipo == tipo and r.objeto == objeto]
    return encontrado


def test_los_umbrales_reutilizan_la_vigencia_de_r2():
    from app.dominio.vigencia import ANTIGUEDAD_MAXIMA

    assert umbrales.DATOS_VIEJOS_DESPUES_DE == ANTIGUEDAD_MAXIMA == timedelta(minutes=30)


# Datos viejos


@pytest.mark.parametrize(
    ("minutos", "en_alerta"),
    [(10, False), (30, False), (31, True), (60 * 24 * 7, True)],
)
def test_datos_viejos_con_su_limite(sesion, estacion, minutos, en_alerta):
    leer(sesion, estacion, timedelta(minutes=minutos))

    control = resultado(evaluar(sesion, AHORA, "real", None), "DATOS_VIEJOS", "INTA Pergamino")

    assert control.en_alerta is en_alerta
    if en_alerta:
        assert f"{minutos} minutos" in control.detalle


def test_una_estacion_sin_lecturas_todavia_no_esta_en_alerta(sesion, estacion):
    control = resultado(evaluar(sesion, AHORA, "real", None), "DATOS_VIEJOS", "INTA Pergamino")

    assert control.en_alerta is False


def test_una_estacion_inactiva_no_se_vigila(sesion, estacion):
    leer(sesion, estacion, timedelta(days=3))
    estacion.activa = False
    estacion.inactiva_desde = AHORA - timedelta(days=2)
    sesion.flush()

    resultados = evaluar(sesion, AHORA, "real", None)

    assert not [r for r in resultados if r.objeto == "INTA Pergamino"]


# Ciclos fallidos


@pytest.mark.parametrize(
    ("ultimos", "en_alerta"),
    [
        (["ERROR", "ERROR"], False),
        (["ERROR", "ERROR", "ERROR"], True),
        (["ERROR", "ERROR", "EXITO"], False),
        (["EXITO", "ERROR", "ERROR"], False),
        (["ERROR", "ERROR", "ERROR", "ERROR"], True),
    ],
    ids=["dos", "tres", "tres-con-el-mas-viejo-bien", "el-ultimo-bien", "cuatro"],
)
def test_ciclos_fallidos_seguidos(sesion, estacion, ultimos, en_alerta):
    # El primero de la lista es el más reciente.
    for n, valor in enumerate(ultimos):
        ciclo(sesion, estacion, valor, timedelta(minutes=10 * (n + 1)))

    control = resultado(evaluar(sesion, AHORA, "real", None), "CICLOS_FALLIDOS", "INTA Pergamino")

    assert control.en_alerta is en_alerta


def test_en_modo_prueba_no_se_vigila_la_ingesta(sesion, estacion):
    leer(sesion, estacion, timedelta(days=3))
    for n in range(3):
        ciclo(sesion, estacion, "ERROR", timedelta(minutes=10 * (n + 1)))

    tipos = {r.tipo for r in evaluar(sesion, AHORA, "prueba", None)}

    assert "DATOS_VIEJOS" not in tipos
    assert "CICLOS_FALLIDOS" not in tipos


# Disco


@pytest.mark.parametrize(
    ("libre", "en_alerta"),
    [(50, False), (10, False), (9, True), (0, True)],
)
def test_disco_casi_lleno(sesion, libre, en_alerta):
    control = resultado(evaluar(sesion, AHORA, "real", Disco(total=100, libre=libre)), "DISCO_CASI_LLENO")

    assert control.en_alerta is en_alerta
    assert f"{libre} %" in control.detalle


def test_sin_medicion_del_disco_no_hay_control_de_disco(sesion):
    assert "DISCO_CASI_LLENO" not in {r.tipo for r in evaluar(sesion, AHORA, "real", None)}


# Accesos sospechosos


def fallar(sesion, veces: int, hace: timedelta = timedelta(minutes=1)):
    for n in range(veces):
        sesion.add(IntentoAcceso(email=f"cuenta{n}@ejemplo.example", ocurrido_en=AHORA - hace))
    sesion.flush()


@pytest.mark.parametrize(("veces", "en_alerta"), [(19, False), (20, True)])
def test_ingresos_fallidos_en_15_minutos(sesion, veces, en_alerta):
    fallar(sesion, veces)

    control = resultado(evaluar(sesion, AHORA, "real", None), "FUERZA_BRUTA")

    assert control.en_alerta is en_alerta


def test_los_ingresos_fallidos_viejos_no_cuentan(sesion):
    fallar(sesion, 25, hace=timedelta(minutes=16))

    assert resultado(evaluar(sesion, AHORA, "real", None), "FUERZA_BRUTA").en_alerta is False


@pytest.mark.parametrize(("pedidos_de_mas", "en_alerta"), [(0, False), (1, True)])
def test_una_ip_bloqueada_por_su_limite(sesion, pedidos_de_mas, en_alerta):
    maximo, duracion = LIMITES["inicio_de_sesion"]
    sesion.add(
        LimiteIp(
            clave="inicio_de_sesion:203.0.113.7",
            ventana_inicio=_inicio_de_ventana(AHORA, duracion),
            cantidad=maximo + pedidos_de_mas,
        )
    )
    sesion.flush()

    control = resultado(evaluar(sesion, AHORA, "real", None), "FUERZA_BRUTA")

    assert control.en_alerta is en_alerta


def test_el_detalle_no_lleva_correos_ni_direcciones_ip(sesion):
    fallar(sesion, 25)
    maximo, duracion = LIMITES["registro"]
    sesion.add(
        LimiteIp(
            clave="registro:203.0.113.7",
            ventana_inicio=_inicio_de_ventana(AHORA, duracion),
            cantidad=maximo + 1,
        )
    )
    sesion.flush()

    detalle = resultado(evaluar(sesion, AHORA, "real", None), "FUERZA_BRUTA").detalle

    assert "@" not in detalle
    assert "203.0.113.7" not in detalle
