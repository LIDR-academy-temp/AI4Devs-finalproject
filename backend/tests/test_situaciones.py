"""Cada situación de prueba debe producir el caso que dice probar (D8 de weather-track-estaciones)."""

from contextlib import nullcontext
from datetime import datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.datos.modelos import ConfiguracionBase, EjecucionIngesta, Observacion, Recomendacion
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.dominio.vigencia import esta_vigente
from app.ingesta.carga_inicial import ejecutar_carga_inicial
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.cliente_sat2 import ErrorSat2
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from herramientas import situaciones
from herramientas.situaciones import (
    SITUACIONES,
    ClienteDeSituacion,
    SituacionImposible,
    cargar_situacion,
)

AHORA = datetime(2026, 11, 3, 12, 34, tzinfo=ZONA_ARGENTINA)
ESPERADO = {
    "favorables": ("APTO", "SIN_INVERSION"),
    "indice_elevado": ("RIESGO_DERIVA", "INDICE_ELEVADO"),
    "inversion_indice_bajo": ("PRECAUCION", "INVERSION_DETECTADA"),
    "inversion_poco_viento": ("NO_APLICAR", "INVERSION_DETECTADA"),
    "lectura_faltante": ("DATOS_INSUFICIENTES", "DATO_FALTANTE"),
    "sospechosa": ("PRECAUCION", "DATO_SOSPECHOSO"),
    "con_historicos": ("APTO", "SIN_INVERSION"),
}


def contar(sesion, modelo, *condiciones) -> int:
    return sesion.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def cliente_simulado():
    return ClienteSat2Simulado(reloj=lambda: AHORA)


@pytest.fixture
def caso_1(sesion):
    """Una base del modo prueba: ficticia y con el equipo 1."""
    estacion = sincronizar_catalogo(sesion, cliente_simulado(), AHORA)[0]
    sesion.add(ConfiguracionBase(naturaleza="FICTICIA"))
    sesion.commit()
    return estacion


def recomendacion(sesion, estacion):
    return sesion.scalar(select(Recomendacion).where(Recomendacion.estacion_id == estacion.id))


def test_hay_nueve_situaciones():
    assert set(SITUACIONES) == set(ESPERADO) | {"desactualizada", "fuente_caida"}


@pytest.mark.parametrize("clave", sorted(ESPERADO))
def test_cada_situacion_produce_su_estado_y_su_motivo(sesion, caso_1, clave):
    cargar_situacion(sesion, clave, AHORA)

    resultado = recomendacion(sesion, caso_1)
    estado, motivo = ESPERADO[clave]
    assert resultado.estado == estado
    assert motivo in {m["codigo"] for m in resultado.motivos}


def test_los_datos_desactualizados_no_quedan_vigentes(sesion, caso_1):
    cargar_situacion(sesion, "desactualizada", AHORA)

    resultado = recomendacion(sesion, caso_1)
    # El ciclo la calcula apta, pero la regla R2 la anula al leer.
    assert resultado.estado == "APTO"
    assert resultado.medido_en == datetime(2026, 11, 3, 10, 30, tzinfo=ZONA_ARGENTINA)
    assert not esta_vigente(resultado.medido_en, AHORA)


def test_la_fuente_caida_deja_una_ejecucion_con_error_y_sin_recomendacion(sesion, caso_1):
    ejecucion = cargar_situacion(sesion, "fuente_caida", AHORA)

    assert ejecucion.resultado == "ERROR"
    assert recomendacion(sesion, caso_1) is None


def test_una_situacion_reemplaza_a_la_anterior(sesion, caso_1):
    cargar_situacion(sesion, "indice_elevado", AHORA)
    cargar_situacion(sesion, "favorables", AHORA)

    assert contar(sesion, Recomendacion) == 1
    assert recomendacion(sesion, caso_1).estado == "APTO"
    assert contar(sesion, EjecucionIngesta, EjecucionIngesta.tipo == "CICLO") == 1


def test_conserva_los_historicos_anteriores(sesion, caso_1):
    ejecutar_carga_inicial(sesion, cliente_simulado(), caso_1, AHORA, dias=2, pausa_segundos=0)
    instante = ClienteDeSituacion("con_historicos", reloj=lambda: AHORA).instante()
    anteriores = contar(sesion, Observacion, Observacion.medido_en < instante)

    cargar_situacion(sesion, "con_historicos", AHORA)

    assert anteriores > 0
    assert contar(sesion, Observacion, Observacion.medido_en < instante) == anteriores


def test_los_datos_atrasados_conservan_su_hora():
    cliente = ClienteDeSituacion("desactualizada", reloj=lambda: AHORA)
    assert cliente.recuperar_instantaneos(1)["fechaUltimaActualizacionDatos"] == "03/11/2026 10:30:00"


def test_la_fuente_caida_informa_un_error():
    with pytest.raises(ErrorSat2):
        ClienteDeSituacion("fuente_caida", reloj=lambda: AHORA).recuperar_instantaneos(1)


def test_los_cambios_de_lecturas_usan_nombres_de_la_fuente():
    nombres = {l["nombreSensor"] for l in cliente_simulado().recuperar_instantaneos(1)["datosSensores"]}
    for situacion in SITUACIONES.values():
        assert set(situacion["lecturas"]) <= nombres


@pytest.mark.parametrize("naturaleza", ["REAL", "COPIA_DE_PRUEBA", None])
def test_solo_escribe_en_una_base_ficticia(sesion, naturaleza):
    sincronizar_catalogo(sesion, cliente_simulado(), AHORA)
    if naturaleza:
        sesion.add(ConfiguracionBase(naturaleza=naturaleza))
    sesion.commit()

    with pytest.raises(SituacionImposible, match="datos ficticios"):
        cargar_situacion(sesion, "favorables", AHORA)
    assert contar(sesion, Observacion) == 0


def test_exige_el_caso_de_prueba_1(sesion):
    sesion.add(ConfiguracionBase(naturaleza="FICTICIA"))
    sesion.commit()
    with pytest.raises(SituacionImposible, match="modo prueba"):
        cargar_situacion(sesion, "favorables", AHORA)


def test_rechaza_una_situacion_desconocida(sesion, caso_1):
    with pytest.raises(SituacionImposible, match="desconocida"):
        cargar_situacion(sesion, "otra", AHORA)


def test_la_lista_muestra_todas_las_situaciones(capsys):
    assert situaciones.principal(["--lista"]) == 0
    salida = capsys.readouterr().out
    assert all(clave in salida for clave in SITUACIONES)


def test_la_linea_de_comandos_explica_el_rechazo(sesion, monkeypatch, capsys):
    sesion.add(ConfiguracionBase(naturaleza="REAL"))
    sesion.commit()
    monkeypatch.setattr(situaciones, "obtener_motor", lambda: None)
    monkeypatch.setattr(situaciones, "Session", lambda _motor: nullcontext(sesion))

    assert situaciones.principal(["favorables"]) == 2
    assert "datos ficticios" in capsys.readouterr().err


def test_la_linea_de_comandos_carga_la_situacion(sesion, caso_1, monkeypatch, capsys):
    monkeypatch.setattr(situaciones, "obtener_motor", lambda: None)
    monkeypatch.setattr(situaciones, "Session", lambda _motor: nullcontext(sesion))
    monkeypatch.setattr(situaciones, "datetime", type("Reloj", (), {"now": staticmethod(lambda _zona: AHORA)}))

    assert situaciones.principal(["indice_elevado"]) == 0
    assert "Índice elevado" in capsys.readouterr().out
    assert recomendacion(sesion, caso_1).estado == "RIESGO_DERIVA"
    assert timedelta(0) <= AHORA - recomendacion(sesion, caso_1).medido_en < timedelta(minutes=10)
