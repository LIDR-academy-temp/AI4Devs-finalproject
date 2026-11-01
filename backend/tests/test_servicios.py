import logging

import pytest
from fastapi.testclient import TestClient

from app.api import principal as api
from app.ingesta import worker
from app.ingesta.cliente_simulado import ClienteSat2Simulado

CLAVE = "clave-secreta-de-prueba"


def test_salud_con_base_de_datos(monkeypatch):
    monkeypatch.setattr(api, "verificar_conexion", lambda: True)
    respuesta = TestClient(api.app).get("/api/v1/salud")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}


def test_salud_sin_base_de_datos(monkeypatch):
    monkeypatch.setattr(api, "verificar_conexion", lambda: False)
    respuesta = TestClient(api.app).get("/api/v1/salud")
    assert respuesta.status_code == 503


def test_documentacion_de_la_api():
    assert TestClient(api.app).get("/api/openapi.json").status_code == 200


def test_el_worker_usa_el_simulado_por_defecto():
    assert isinstance(worker.crear_cliente(worker.MODO_SIMULADO), ClienteSat2Simulado)


def test_modo_real_sin_credenciales_termina_sin_exponer_valores(
    tmp_path, monkeypatch, caplog
):
    for nombre in ("nombreDeUsuario", "SAT2_URL_BASE"):
        monkeypatch.delenv(nombre, raising=False)
    ruta_env = tmp_path / ".env"
    ruta_env.write_text(f"clave={CLAVE}\n", encoding="utf-8")
    monkeypatch.setattr(worker, "RUTA_ENV", ruta_env)
    monkeypatch.setenv("SAT2_MODO", worker.MODO_REAL)

    with caplog.at_level(logging.ERROR):
        assert worker.principal() == 2

    assert "nombreDeUsuario" in caplog.text
    assert CLAVE not in caplog.text


def test_modo_desconocido_se_rechaza():
    with pytest.raises(worker.ConfiguracionIncompleta):
        worker.crear_cliente("otro")


def test_latido(tmp_path):
    ruta = tmp_path / "latido"
    assert not worker.latido_vigente(ruta)

    worker.registrar_latido(ruta)
    momento = ruta.stat().st_mtime
    assert worker.latido_vigente(ruta, ahora=momento + 120)
    assert not worker.latido_vigente(ruta, ahora=momento + 121)
