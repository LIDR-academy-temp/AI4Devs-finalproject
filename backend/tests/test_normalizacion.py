from datetime import UTC, datetime
from decimal import Decimal as D

import pytest

from app.dominio.normalizacion import (
    clasificar_lectura,
    humedad_incoherente,
    parsear_fecha,
    parsear_numero,
)


@pytest.mark.parametrize(
    ("crudo", "esperado"),
    [
        ("13,81", D("13.81")),
        ("0,00", D("0.00")),
        ("1.003,50", D("1003.50")),
        (3, D("3")),
        (13.81, D("13.81")),
        ("-999,9", D("-999.9")),
        (" 20 ", D("20")),
    ],
)
def test_parsea_numeros(crudo, esperado):
    assert parsear_numero(crudo) == esperado


@pytest.mark.parametrize("crudo", [None, "", "[]", "NaN", "Infinity", "abc", True, [], {}])
def test_rechaza_lo_que_no_es_numero(crudo):
    assert parsear_numero(crudo) is None


@pytest.mark.parametrize(
    "texto",
    ["2026-01-01 23:50", "01/01/2026 23:50:00", "2026-01-0111:50PM"],
)
def test_interpreta_fechas_como_hora_de_argentina(texto):
    assert parsear_fecha(texto) == datetime(2026, 1, 2, 2, 50, tzinfo=UTC)


def test_acepta_hora_de_un_digito():
    assert parsear_fecha("21/09/2022 0:00:00") == datetime(2022, 9, 21, 3, 0, tzinfo=UTC)


@pytest.mark.parametrize("texto", [None, "", "ayer", 20260101, "2026-13-01 00:00"])
def test_rechaza_fechas_invalidas(texto):
    assert parsear_fecha(texto) is None


def test_el_centinela_es_faltante():
    assert clasificar_lectura("TEMPERATURA", -999.9) == (None, "FALTANTE")
    assert clasificar_lectura("BATERIA", "-999,9") == (None, "FALTANTE")


def test_fuera_de_rango_fisico_es_faltante():
    assert clasificar_lectura("HUMEDAD_RELATIVA", "130") == (None, "FALTANTE")
    assert clasificar_lectura("TEMPERATURA", "61") == (None, "FALTANTE")
    assert clasificar_lectura("VIENTO_VELOCIDAD", "-1") == (None, "FALTANTE")
    assert clasificar_lectura("RADIACION", "1501") == (None, "FALTANTE")


def test_valores_validos_en_los_limites():
    assert clasificar_lectura("HUMEDAD_RELATIVA", "0") == (D("0"), "OK")
    assert clasificar_lectura("HUMEDAD_RELATIVA", "100") == (D("100"), "OK")


def test_vacio_es_faltante():
    assert clasificar_lectura("MOJADO_FOLIAR", "[]") == (None, "FALTANTE")


def test_magnitud_sin_rango_acepta_el_valor():
    assert clasificar_lectura("PRESION", "1003,5") == (D("1003.5"), "OK")


def test_humedad_incoherente():
    assert humedad_incoherente(D("0"), D("61"))
    assert humedad_incoherente(D("16"), D("66"))
    assert not humedad_incoherente(D("35"), D("60"))
    assert not humedad_incoherente(None, D("60"))
