"""Códigos de un solo uso: tabla D3 de weather-track-registro-cuentas."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.cuentas.enlaces import (
    BAJA,
    CONFIRMACION,
    RECUPERO,
    VIGENCIA,
    EnlaceInvalido,
    emitir_enlace,
    usar_enlace,
)
from app.datos.modelos import EnlaceCuenta, Usuario
from app.seguridad import hash_de_identificador

AHORA = datetime(2026, 11, 4, 15, 0, tzinfo=UTC)


@pytest.fixture
def usuario(sesion):
    registro = Usuario(email="a@b.example", nombre="Nombre", password_hash="hash")
    sesion.add(registro)
    sesion.flush()
    return registro


def contar(sesion) -> int:
    return sesion.scalar(select(func.count()).select_from(EnlaceCuenta))


@pytest.mark.parametrize(
    ("proposito", "vigencia"),
    [
        (CONFIRMACION, timedelta(hours=48)),
        (RECUPERO, timedelta(minutes=30)),
        (BAJA, timedelta(days=60)),
    ],
)
def test_cada_enlace_vale_lo_que_indica_su_proposito(sesion, usuario, proposito, vigencia):
    assert VIGENCIA[proposito] == vigencia
    codigo = emitir_enlace(sesion, usuario, proposito, AHORA)

    un_segundo_antes = AHORA + vigencia - timedelta(seconds=1)
    assert usar_enlace(sesion, codigo, proposito, un_segundo_antes) == usuario


@pytest.mark.parametrize("proposito", [CONFIRMACION, RECUPERO, BAJA])
def test_un_enlace_vencido_no_sirve(sesion, usuario, proposito):
    codigo = emitir_enlace(sesion, usuario, proposito, AHORA)
    with pytest.raises(EnlaceInvalido):
        usar_enlace(sesion, codigo, proposito, AHORA + VIGENCIA[proposito])


@pytest.mark.parametrize("proposito", [CONFIRMACION, RECUPERO, BAJA])
def test_un_enlace_se_usa_una_sola_vez(sesion, usuario, proposito):
    codigo = emitir_enlace(sesion, usuario, proposito, AHORA)
    usar_enlace(sesion, codigo, proposito, AHORA)
    with pytest.raises(EnlaceInvalido):
        usar_enlace(sesion, codigo, proposito, AHORA)


@pytest.mark.parametrize("proposito", [CONFIRMACION, RECUPERO])
def test_emitir_otro_invalida_el_anterior(sesion, usuario, proposito):
    anterior = emitir_enlace(sesion, usuario, proposito, AHORA)
    nuevo = emitir_enlace(sesion, usuario, proposito, AHORA + timedelta(minutes=1))

    with pytest.raises(EnlaceInvalido):
        usar_enlace(sesion, anterior, proposito, AHORA + timedelta(minutes=2))
    assert usar_enlace(sesion, nuevo, proposito, AHORA + timedelta(minutes=2)) == usuario


def test_los_enlaces_de_baja_conviven(sesion, usuario):
    primero = emitir_enlace(sesion, usuario, BAJA, AHORA)
    segundo = emitir_enlace(sesion, usuario, BAJA, AHORA + timedelta(days=1))

    assert usar_enlace(sesion, primero, BAJA, AHORA + timedelta(days=2)) == usuario
    assert usar_enlace(sesion, segundo, BAJA, AHORA + timedelta(days=2)) == usuario


def test_emitir_un_recupero_no_toca_la_confirmacion(sesion, usuario):
    confirmacion = emitir_enlace(sesion, usuario, CONFIRMACION, AHORA)
    emitir_enlace(sesion, usuario, RECUPERO, AHORA)
    assert usar_enlace(sesion, confirmacion, CONFIRMACION, AHORA) == usuario


def test_un_enlace_no_sirve_para_otro_proposito(sesion, usuario):
    codigo = emitir_enlace(sesion, usuario, BAJA, AHORA)
    with pytest.raises(EnlaceInvalido):
        usar_enlace(sesion, codigo, RECUPERO, AHORA)
    # El intento fallido no lo consume.
    assert usar_enlace(sesion, codigo, BAJA, AHORA) == usuario


def test_un_codigo_inexistente_no_sirve(sesion, usuario):
    with pytest.raises(EnlaceInvalido):
        usar_enlace(sesion, "codigo-inventado", CONFIRMACION, AHORA)


def test_solo_se_guarda_el_hash_del_codigo(sesion, usuario):
    codigo = emitir_enlace(sesion, usuario, CONFIRMACION, AHORA)

    guardado = sesion.scalar(select(EnlaceCuenta))
    assert guardado.hash_codigo == hash_de_identificador(codigo)
    assert codigo not in guardado.hash_codigo
    assert len(codigo) >= 43
    assert contar(sesion) == 1


def test_los_codigos_no_se_repiten(sesion, usuario):
    codigos = {emitir_enlace(sesion, usuario, BAJA, AHORA) for _ in range(20)}
    assert len(codigos) == 20
