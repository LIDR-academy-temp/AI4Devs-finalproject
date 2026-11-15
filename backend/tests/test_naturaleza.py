"""Separación de datos reales y ficticios: tabla de D4 de weather-track-estaciones."""

import logging
from contextlib import nullcontext

import pytest
from fastapi.testclient import TestClient

from app import semillas
from app.api import principal
from app.datos.modelos import ConfiguracionBase
from app.datos.naturaleza import (
    COPIA_DE_PRUEBA,
    FICTICIA,
    REAL,
    NaturalezaIncompatible,
    asegurar_naturaleza,
    leer_naturaleza,
    verificar_naturaleza,
)
from app.ingesta import worker


def fijar(sesion, naturaleza):
    sesion.add(ConfiguracionBase(naturaleza=naturaleza))
    sesion.flush()


class FabricaDePruebas:
    """Entrega la sesión de la prueba sin cerrarla al salir del bloque."""

    def __init__(self, sesion):
        self.sesion = sesion

    def __call__(self):
        return nullcontext(self.sesion)


@pytest.mark.parametrize(
    ("modo", "inicial"),
    [("real", REAL), ("simulado", FICTICIA), ("prueba", FICTICIA)],
)
def test_una_base_vacia_queda_marcada_segun_el_modo(sesion, modo, inicial):
    assert leer_naturaleza(sesion) is None
    assert asegurar_naturaleza(sesion, modo) == inicial
    assert leer_naturaleza(sesion) == inicial


@pytest.mark.parametrize(
    ("modo", "existente"),
    [
        ("real", REAL),
        ("simulado", FICTICIA),
        ("prueba", FICTICIA),
        ("prueba", COPIA_DE_PRUEBA),
    ],
)
def test_admite_la_naturaleza_que_corresponde_al_modo(sesion, modo, existente):
    fijar(sesion, existente)
    assert asegurar_naturaleza(sesion, modo) == existente


@pytest.mark.parametrize(
    ("modo", "existente"),
    [
        ("real", FICTICIA),
        ("real", COPIA_DE_PRUEBA),
        ("simulado", REAL),
        ("simulado", COPIA_DE_PRUEBA),
        ("prueba", REAL),
    ],
)
def test_rechaza_la_naturaleza_de_otro_modo_sin_cambiar_la_base(sesion, modo, existente):
    fijar(sesion, existente)
    with pytest.raises(NaturalezaIncompatible):
        asegurar_naturaleza(sesion, modo)
    assert leer_naturaleza(sesion) == existente


def test_el_mensaje_explica_que_hacer(sesion):
    fijar(sesion, FICTICIA)
    with pytest.raises(NaturalezaIncompatible) as error:
        verificar_naturaleza(sesion, "real")
    mensaje = str(error.value)
    assert "datos ficticios" in mensaje
    assert "modo real" in mensaje
    assert "docker compose -p" in mensaje
    assert "no se modificó" in mensaje


def test_rechaza_un_modo_desconocido(sesion):
    with pytest.raises(NaturalezaIncompatible, match="Modo desconocido"):
        verificar_naturaleza(sesion, "otro")


def test_el_worker_no_arranca_sobre_una_base_de_otra_naturaleza(sesion, caplog):
    fijar(sesion, REAL)
    with caplog.at_level(logging.ERROR):
        assert worker.preparar_base(FabricaDePruebas(sesion), "simulado") is False
    assert "datos reales de SAT2" in caplog.text


def test_el_worker_marca_una_base_vacia(sesion):
    assert worker.preparar_base(FabricaDePruebas(sesion), "real") is True
    assert leer_naturaleza(sesion) == REAL


def test_la_api_no_arranca_sobre_una_base_de_otra_naturaleza(sesion, monkeypatch):
    monkeypatch.setenv("SAT2_MODO", "real")
    fijar(sesion, FICTICIA)
    with pytest.raises(NaturalezaIncompatible):
        principal.comprobar_base(lambda: nullcontext(sesion))


def test_la_api_solo_lee_la_naturaleza(sesion, monkeypatch):
    monkeypatch.setenv("SAT2_MODO", "real")
    principal.comprobar_base(lambda: nullcontext(sesion))
    assert leer_naturaleza(sesion) is None


def test_la_api_arranca_si_no_puede_leer_la_base(monkeypatch, caplog):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with caplog.at_level(logging.WARNING):
        principal.comprobar_base()
    assert "No se pudo verificar la base" in caplog.text


def test_el_arranque_de_la_api_ejecuta_la_comprobacion(monkeypatch):
    def incompatible():
        raise NaturalezaIncompatible("base de otra naturaleza")

    monkeypatch.setattr(principal, "comprobar_base", incompatible)
    with pytest.raises(NaturalezaIncompatible), TestClient(principal.app):
        pass


def test_las_semillas_no_se_cargan_sobre_una_base_real(sesion, monkeypatch, capsys):
    monkeypatch.setenv("SAT2_MODO", "simulado")
    monkeypatch.setattr(semillas, "obtener_motor", lambda: None)
    monkeypatch.setattr(semillas, "Session", lambda _motor: nullcontext(sesion))
    fijar(sesion, REAL)

    assert semillas.principal() == 2
    assert "datos reales de SAT2" in capsys.readouterr().err
