"""Los escenarios de las pruebas E2E deben producir el caso que dicen probar."""

from datetime import date, datetime

import pytest
from sqlalchemy import select

from app.datos.modelos import Recomendacion
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.ingesta import worker
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.ciclo import ejecutar_ciclo
from app.ingesta.cliente_sat2 import ErrorSat2
from app.ingesta.cliente_simulado import ClienteSat2Escenarios, ClienteSat2Simulado

AHORA = datetime(2026, 11, 2, 12, 34, tzinfo=ZONA_ARGENTINA)
CON_LECTURAS = {
    "Condiciones favorables": "APTO",
    "Índice elevado": "RIESGO_DERIVA",
    "Inversión con índice bajo": "PRECAUCION",
    "Inversión con poco viento": "NO_APLICAR",
    "Lectura faltante": "DATOS_INSUFICIENTES",
    "Datos desactualizados": "APTO",
    "Lectura sospechosa": "PRECAUCION",
    "Con históricos": "APTO",
    "Estación ajena": "APTO",
}


def crear_cliente():
    return ClienteSat2Escenarios(reloj=lambda: AHORA)


def test_cada_escenario_produce_el_estado_esperado(sesion):
    cliente = crear_cliente()
    estaciones = sincronizar_catalogo(sesion, cliente)

    estados = {}
    for estacion in estaciones:
        ejecutar_ciclo(sesion, cliente, estacion, AHORA)
        recomendacion = sesion.scalar(
            select(Recomendacion).where(Recomendacion.estacion_id == estacion.id)
        )
        if recomendacion:
            estados[estacion.nombre] = recomendacion.estado

    assert estados == CON_LECTURAS


def test_los_cambios_de_lecturas_usan_nombres_de_la_fuente():
    cliente = crear_cliente()
    nombres = {l["nombreSensor"] for l in cliente.recuperar_instantaneos(101)["datosSensores"]}
    for escenario in cliente._escenarios.values():
        assert set(escenario["lecturas"]) <= nombres


def test_la_fuente_caida_informa_un_error():
    with pytest.raises(ErrorSat2):
        crear_cliente().recuperar_instantaneos(108)


def test_los_datos_atrasados_conservan_su_hora():
    instantaneos = crear_cliente().recuperar_instantaneos(106)
    assert instantaneos["fechaUltimaActualizacionDatos"] == "02/11/2026 10:30:00"


def test_solo_una_estacion_tiene_historicos():
    cliente = crear_cliente()
    dia = date(2026, 11, 1)
    con_datos = [
        equipo["idEquipo"]
        for equipo in cliente.recuperar_equipos()
        if cliente.recuperar_historicos(equipo["idEquipo"], 6, dia, dia)
    ]
    assert con_datos == [109]


def test_el_worker_elige_el_cliente_segun_el_modo():
    assert type(worker.crear_cliente("escenarios")) is ClienteSat2Escenarios
    assert type(worker.crear_cliente("simulado")) is ClienteSat2Simulado
