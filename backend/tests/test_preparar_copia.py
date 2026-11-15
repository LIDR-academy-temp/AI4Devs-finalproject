"""Controles del comando que prepara la copia de prueba, sin ejecutar Docker."""

import pytest

from herramientas import preparar_copia_de_prueba as copia


@pytest.mark.parametrize(
    ("origen", "destino"),
    [
        ("weather-track", "weather-track"),
        ("wt-origen", "weather-track"),
        ("wt-a", "wt-a"),
        ("weather-track", "Prueba Real"),
        ("weather-track", "-p"),
    ],
)
def test_rechaza_destinos_que_podrian_pisar_otra_base(origen, destino):
    with pytest.raises(copia.ErrorCopia):
        copia.validar_proyectos(origen, destino)


def test_acepta_un_destino_aislado():
    copia.validar_proyectos("weather-track", "wt-prueba")


def no_debe_ejecutarse(*_args, **_opciones):
    raise AssertionError("No debía ejecutar ningún comando de Docker")


def test_no_hace_nada_si_la_base_de_origen_esta_detenida(monkeypatch, capsys):
    monkeypatch.setattr(copia, "base_de_origen_en_marcha", lambda *_: False)
    monkeypatch.setattr(copia, "ejecutar", no_debe_ejecutarse)
    monkeypatch.setattr(copia, "copiar", no_debe_ejecutarse)

    assert copia.principal([]) == 2
    assert "docker compose -p weather-track start db" in capsys.readouterr().err


def test_no_pisa_una_copia_anterior(monkeypatch, capsys):
    monkeypatch.setattr(copia, "base_de_origen_en_marcha", lambda *_: True)
    monkeypatch.setattr(copia, "destino_existe", lambda *_: True)
    monkeypatch.setattr(copia, "ejecutar", no_debe_ejecutarse)
    monkeypatch.setattr(copia, "copiar", no_debe_ejecutarse)

    assert copia.principal(["--destino", "wt-prueba"]) == 2
    assert "docker compose -p wt-prueba down -v" in capsys.readouterr().err


def test_la_copia_arranca_siempre_en_modo_prueba(monkeypatch):
    entornos = []
    monkeypatch.setattr(copia, "base_de_origen_en_marcha", lambda *_: True)
    monkeypatch.setattr(copia, "destino_existe", lambda *_: False)
    monkeypatch.setattr(copia, "copiar", lambda *_: None)
    monkeypatch.setattr(copia, "ejecutar", lambda _comando, entorno, **_: entornos.append(entorno))
    monkeypatch.setenv("SAT2_MODO", "real")

    assert copia.principal(["--puerto", "8091"]) == 0
    assert {e["SAT2_MODO"] for e in entornos} == {"prueba"}
    assert {e["PUERTO_WEB"] for e in entornos} == {"8091"}
