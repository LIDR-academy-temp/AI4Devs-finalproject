"""Alertas sin repetición de `system-monitoring` (D3 de weather-track-monitoreo)."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.cuentas.correo import CORREO_ALERTA, CORREO_ALERTA_NORMALIZADA
from app.datos.modelos import AlertaSistema, CorreoSaliente, Usuario
from app.monitoreo.alertas import actualizar_alertas
from app.monitoreo.controles import Resultado

AHORA = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)
VIEJOS = Resultado("DATOS_VIEJOS", "INTA Pergamino", True, "Última lectura hace 47 minutos.")
VIEJOS_BIEN = Resultado("DATOS_VIEJOS", "INTA Pergamino", False, "Última lectura hace 3 minutos.")
DISCO = Resultado("DISCO_CASI_LLENO", "", True, "Queda el 7 % libre en el disco de la base.")
BRUTA_BIEN = Resultado("FUERZA_BRUTA", "", False, "0 ingresos fallidos en 15 minutos.")


def crear(sesion, email, administrador=True, activo=True, confirmada=True):
    usuario = Usuario(
        email=email,
        nombre="Persona",
        password_hash="hash",
        es_administrador=administrador,
        activo=activo,
        confirmado_en=AHORA if confirmada else None,
    )
    sesion.add(usuario)
    sesion.flush()
    return usuario


@pytest.fixture
def administradores(sesion):
    crear(sesion, "admin@ejemplo.example")
    crear(sesion, "otra-admin@ejemplo.example")
    crear(sesion, "comun@ejemplo.example", administrador=False)
    crear(sesion, "inactiva@ejemplo.example", activo=False)
    crear(sesion, "sin-confirmar@ejemplo.example", confirmada=False)


def correos(sesion, tipo=None):
    consulta = select(CorreoSaliente)
    if tipo:
        consulta = consulta.where(CorreoSaliente.tipo == tipo)
    return sesion.scalars(consulta).all()


def alertas(sesion):
    return sesion.scalars(select(AlertaSistema).order_by(AlertaSistema.id)).all()


def test_una_falla_nueva_abre_una_alerta_y_avisa_a_los_administradores_activos(sesion, administradores):
    actualizar_alertas(sesion, [VIEJOS, BRUTA_BIEN], AHORA)

    [alerta] = alertas(sesion)
    assert (alerta.tipo, alerta.objeto, alerta.abierta_en, alerta.cerrada_en) == (
        "DATOS_VIEJOS",
        "INTA Pergamino",
        AHORA,
        None,
    )
    enviados = correos(sesion, CORREO_ALERTA)
    assert {c.destinatario for c in enviados} == {"admin@ejemplo.example", "otra-admin@ejemplo.example"}
    assert "INTA Pergamino" in enviados[0].asunto
    assert "hace 47 minutos" in enviados[0].cuerpo_texto
    assert "/administracion" in enviados[0].cuerpo_texto
    assert "/baja#codigo=" in enviados[0].cuerpo_texto


def test_una_falla_que_continua_no_vuelve_a_avisar(sesion, administradores):
    actualizar_alertas(sesion, [VIEJOS], AHORA)
    sigue = Resultado("DATOS_VIEJOS", "INTA Pergamino", True, "Última lectura hace 57 minutos.")

    for minutos in (10, 20, 30):
        actualizar_alertas(sesion, [sigue], AHORA + timedelta(minutes=minutos))

    [alerta] = alertas(sesion)
    assert alerta.detalle == "Última lectura hace 57 minutos."
    assert len(correos(sesion)) == 2


def test_la_normalizacion_cierra_la_alerta_y_avisa(sesion, administradores):
    actualizar_alertas(sesion, [VIEJOS], AHORA)

    actualizar_alertas(sesion, [VIEJOS_BIEN], AHORA + timedelta(minutes=30))

    [alerta] = alertas(sesion)
    assert alerta.cerrada_en == AHORA + timedelta(minutes=30)
    normalizados = correos(sesion, CORREO_ALERTA_NORMALIZADA)
    assert len(normalizados) == 2
    assert "se normalizó" in normalizados[0].cuerpo_texto


def test_una_falla_despues_de_normalizarse_abre_otra_alerta(sesion, administradores):
    actualizar_alertas(sesion, [VIEJOS], AHORA)
    actualizar_alertas(sesion, [VIEJOS_BIEN], AHORA + timedelta(minutes=10))

    actualizar_alertas(sesion, [VIEJOS], AHORA + timedelta(minutes=20))

    assert [a.cerrada_en is None for a in alertas(sesion)] == [False, True]


def test_cada_estacion_tiene_su_propia_alerta(sesion, administradores):
    otra = Resultado("DATOS_VIEJOS", "Otra estación", True, "Última lectura hace 40 minutos.")

    actualizar_alertas(sesion, [VIEJOS, otra, DISCO], AHORA)

    assert sorted((a.tipo, a.objeto) for a in alertas(sesion)) == [
        ("DATOS_VIEJOS", "INTA Pergamino"),
        ("DATOS_VIEJOS", "Otra estación"),
        ("DISCO_CASI_LLENO", ""),
    ]


def test_un_control_que_ya_no_se_evalua_cierra_su_alerta_sin_avisar(sesion, administradores):
    actualizar_alertas(sesion, [VIEJOS, DISCO], AHORA)
    antes = len(correos(sesion))

    actualizar_alertas(sesion, [DISCO], AHORA + timedelta(minutes=10))

    abiertas = [(a.tipo, a.objeto) for a in alertas(sesion) if a.cerrada_en is None]
    assert abiertas == [("DISCO_CASI_LLENO", "")]
    assert len(correos(sesion)) == antes


def test_sin_administradores_la_alerta_queda_registrada(sesion):
    actualizar_alertas(sesion, [VIEJOS], AHORA)

    assert len(alertas(sesion)) == 1
    assert correos(sesion) == []


def test_los_correos_no_llevan_correos_de_cuentas_ni_direcciones_ip(sesion, administradores):
    crear(sesion, "victima@ejemplo.example", administrador=False)
    bruta = Resultado("FUERZA_BRUTA", "", True, "25 ingresos fallidos en 15 minutos.")

    actualizar_alertas(sesion, [bruta], AHORA)

    for correo in correos(sesion):
        assert "victima@" not in correo.cuerpo_texto
        assert "203.0.113" not in correo.cuerpo_texto
        assert "25 ingresos fallidos" in correo.cuerpo_texto
