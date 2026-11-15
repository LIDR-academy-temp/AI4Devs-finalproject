"""Límite por dirección IP de `account-access` (D9 de weather-track-registro-cuentas)."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.api.dependencias import obtener_ahora, obtener_sesion_bd
from app.api.limite_ip import LIMITES, registrar_pedido
from app.api.principal import app
from app.datos.modelos import LimiteIp
from app.ingesta import worker

INICIO = datetime(2026, 11, 4, 12, 0, 30, tzinfo=UTC)
LOGIN = "/api/v1/auth/login"
IP = "203.0.113.5"
OTRA_IP = "198.51.100.7"


class Reloj:
    def __init__(self):
        self.ahora = INICIO

    def __call__(self):
        return self.ahora


@pytest.fixture
def reloj():
    return Reloj()


@pytest.fixture
def clientes(sesion, reloj, monkeypatch):
    monkeypatch.setenv("COOKIE_SEGURA", "false")
    app.dependency_overrides[obtener_sesion_bd] = lambda: sesion
    app.dependency_overrides[obtener_ahora] = reloj
    yield {ip: TestClient(app, client=(ip, 50000)) for ip in (IP, OTRA_IP)}
    app.dependency_overrides.clear()


def intentar(cliente, numero):
    # Un correo distinto por intento: así no actúa el bloqueo por correo, sino el de la IP.
    return cliente.post(LOGIN, json={"email": f"x{numero}@ejemplo.com", "contrasena": "mala"})


def test_superado_el_limite_responde_429_con_retry_after(clientes):
    maximo, _ = LIMITES["inicio_de_sesion"]
    for numero in range(maximo):
        assert intentar(clientes[IP], numero).status_code == 401

    respuesta = intentar(clientes[IP], maximo)

    assert respuesta.status_code == 429
    assert respuesta.json()["codigo"] == "DEMASIADOS_PEDIDOS"
    # La ventana de 15 minutos empezó a las 12:00:00: faltan 14 minutos y medio.
    assert respuesta.headers["Retry-After"] == str(14 * 60 + 30)


def test_otra_ip_no_queda_afectada(clientes):
    maximo, _ = LIMITES["inicio_de_sesion"]
    for numero in range(maximo + 1):
        intentar(clientes[IP], numero)

    assert intentar(clientes[OTRA_IP], 0).status_code == 401


def test_la_ventana_siguiente_vuelve_a_admitir(clientes, reloj):
    maximo, duracion = LIMITES["inicio_de_sesion"]
    for numero in range(maximo + 1):
        intentar(clientes[IP], numero)

    reloj.ahora += duracion
    assert intentar(clientes[IP], 99).status_code == 401


@pytest.mark.parametrize(("accion", "maximo"), [("registro", 5), ("recupero", 10), ("enlaces", 30)])
def test_cada_accion_tiene_su_limite(sesion, accion, maximo):
    for _ in range(maximo):
        assert registrar_pedido(sesion, accion, IP, INICIO) == 0
    assert registrar_pedido(sesion, accion, IP, INICIO) > 0
    # Las acciones no comparten contador.
    assert registrar_pedido(sesion, "inicio_de_sesion", IP, INICIO) == 0


def test_el_worker_borra_las_ventanas_vencidas(sesion):
    registrar_pedido(sesion, "registro", IP, INICIO)
    registrar_pedido(sesion, "registro", OTRA_IP, INICIO + timedelta(hours=3))

    worker._limpiar_vencidos(sesion, INICIO + timedelta(hours=3))

    assert sesion.scalar(select(func.count()).select_from(LimiteIp)) == 1
