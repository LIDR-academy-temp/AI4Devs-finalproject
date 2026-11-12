import re
import socket
from datetime import date, datetime

import pytest

from app.ingesta.cliente_sat2 import ErrorSat2
from app.ingesta.cliente_simulado import (
    CARPETA_DATOS,
    VALOR_CENTINELA,
    ClienteSat2Simulado,
)

AHORA = datetime(2026, 11, 2, 12, 34, 56)


@pytest.fixture(autouse=True)
def sin_red(monkeypatch):
    def prohibido(*args, **kwargs):
        raise AssertionError("El cliente simulado no debe acceder a la red")

    monkeypatch.setattr(socket, "socket", prohibido)
    monkeypatch.setattr(socket, "create_connection", prohibido)


def crear_cliente(**opciones):
    return ClienteSat2Simulado(reloj=lambda: AHORA, **opciones)


def test_catalogo_con_once_sensores_y_un_nombre_con_tilde():
    equipo = crear_cliente().recuperar_equipos()[0]
    nombres = [s["nombre"] for s in equipo["sensores"]]
    assert len(nombres) == 11
    assert "Anemómetro" in nombres


def test_instantaneos_con_coma_decimal_dato_vacio_y_alarma():
    instantaneos = crear_cliente().recuperar_instantaneos(1)
    lecturas = {l["nombreSensor"]: l for l in instantaneos["datosSensores"]}

    assert instantaneos["fechaUltimaActualizacionDatos"] == "02/11/2026 12:30:00"
    assert lecturas["Bateria"]["valor"] == "13,81"
    assert lecturas["Humedad de Hoja"]["valor"] == "[]"
    assert lecturas["Pluviometro"]["alarma"] is True


def test_historicos_en_orden_descendente_y_cada_diez_minutos():
    serie = crear_cliente().recuperar_historicos(1, 6, date(2026, 11, 1), date(2026, 11, 1))
    fechas = [r["fecha"] for r in serie]
    assert fechas == sorted(fechas, reverse=True)
    assert fechas[0] == "2026-11-01 23:50"
    assert fechas[-1] == "2026-11-01 00:00"


def test_historicos_con_huecos_y_valor_centinela():
    # Rango con un día múltiplo de 7 en su número ordinal.
    serie = crear_cliente().recuperar_historicos(1, 6, date(2026, 10, 20), date(2026, 10, 27))
    assert len(serie) < 8 * 144
    assert any(r["valor"] == VALOR_CENTINELA for r in serie)


def test_no_inventa_mediciones_futuras():
    serie = crear_cliente().recuperar_historicos(1, 6, date(2026, 11, 2), date(2026, 11, 2))
    assert max(r["fecha"] for r in serie) <= "2026-11-02 12:30"


def test_simula_limites_de_la_fuente():
    limitado = crear_cliente(max_dias_por_consulta=31)
    assert limitado.recuperar_historicos(1, 6, date(2026, 10, 1), date(2026, 10, 31))
    with pytest.raises(ErrorSat2):
        limitado.recuperar_historicos(1, 6, date(2026, 9, 1), date(2026, 10, 31))

    antiguo = crear_cliente(primera_fecha_con_datos=date(2026, 10, 15))
    serie = antiguo.recuperar_historicos(1, 6, date(2026, 10, 1), date(2026, 10, 31))
    assert min(r["fecha"] for r in serie).startswith("2026-10-15")


def test_equipo_desconocido():
    with pytest.raises(ErrorSat2):
        crear_cliente().recuperar_instantaneos(999)


def test_los_datos_simulados_no_contienen_tokens():
    archivos = list(CARPETA_DATOS.glob("*.json"))
    assert archivos
    for archivo in archivos:
        contenido = archivo.read_text(encoding="utf-8")
        assert not re.search(r"eyJ[A-Za-z0-9_-]{10,}", contenido)
        assert '"clave"' not in contenido
        assert '"token"' not in contenido
