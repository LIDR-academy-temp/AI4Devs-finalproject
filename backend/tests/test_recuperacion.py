"""Escenarios de «Recuperación de huecos» de `sat2-ingestion` (weather-track-historicos-sin-huecos).

Usan la SAT2 simulada: nunca consultan SAT2 real.
"""

from datetime import date, datetime, time, timedelta

import pytest
from sqlalchemy import delete, func, select

from app.datos.modelos import EjecucionIngesta, Observacion, Sensor
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.ingesta import worker
from app.ingesta.cliente_sat2 import ErrorSat2
from app.ingesta.recuperacion import HUECO_MINIMO, recuperar_huecos
from tests.test_ingesta import AHORA, Cliente, FabricaDePruebas, cargar, sin_pausa

HOY = AHORA.astimezone(ZONA_ARGENTINA).date()
DIAS = 8


@pytest.fixture
def cliente():
    return Cliente()


@pytest.fixture
def estacion(sesion, cliente):
    from app.ingesta.catalogo import sincronizar_catalogo

    estacion = sincronizar_catalogo(sesion, cliente)[0]
    sesion.commit()
    return estacion


@pytest.fixture
def cargada(sesion, cliente, estacion):
    """Ocho días cargados y ya revisados, como en una instalación que funciona hace tiempo.

    La SAT2 simulada no tiene dos horas del 1/11: la primera recuperación lo pide y lo da por
    revisado. Así, cada prueba parte sin huecos pendientes.
    """
    cargar(sesion, cliente, estacion, dias=DIAS)
    sesion.execute(delete(EjecucionIngesta))
    recuperar_huecos(sesion, cliente, estacion, AHORA, dias=DIAS, dormir=sin_pausa)
    cliente.historicos_pedidos.clear()
    return estacion


def momento(dia: date, hora: int, minuto: int = 0) -> datetime:
    return datetime.combine(dia, time(hora, minuto), tzinfo=ZONA_ARGENTINA)


def borrar(sesion, estacion, desde: datetime, hasta: datetime) -> int:
    """Borra las lecturas de la estación en [desde, hasta) y devuelve cuántas eran."""
    sensores = select(Sensor.id).where(Sensor.estacion_id == estacion.id)
    resultado = sesion.execute(
        delete(Observacion).where(
            Observacion.sensor_id.in_(sensores),
            Observacion.medido_en >= desde,
            Observacion.medido_en < hasta,
        )
    )
    sesion.commit()
    return resultado.rowcount


def total(sesion) -> int:
    return sesion.scalar(select(func.count()).select_from(Observacion))


def recuperar(sesion, cliente, estacion, ahora=AHORA):
    return recuperar_huecos(sesion, cliente, estacion, ahora, dias=DIAS, dormir=sin_pausa)


def rangos_pedidos(cliente) -> set[tuple[date, date]]:
    return {(desde, hasta) for _, desde, hasta in cliente.historicos_pedidos}


def test_sin_huecos_no_consulta(sesion, cliente, cargada):
    assert recuperar(sesion, cliente, cargada) == []
    assert cliente.historicos_pedidos == []


def test_recupera_un_hueco_de_varios_dias_en_una_consulta_por_sensor(sesion, cliente, cargada):
    antes = total(sesion)
    desde, hasta = date(2026, 10, 28), date(2026, 10, 31)
    borradas = borrar(sesion, cargada, momento(desde, 0), momento(hasta + timedelta(days=1), 0))
    assert borradas > 0

    [ejecucion] = recuperar(sesion, cliente, cargada)

    assert rangos_pedidos(cliente) == {(desde, hasta)}
    assert len(cliente.historicos_pedidos) == 11
    assert total(sesion) == antes
    assert ejecucion.tipo == "RECUPERACION"
    assert ejecucion.resultado == "EXITO"
    assert ejecucion.lecturas_guardadas == borradas
    assert ejecucion.ventana_desde == momento(desde, 0)
    assert ejecucion.ventana_hasta == momento(hasta, 0)


def test_huecos_separados_quedan_en_ejecuciones_separadas(sesion, cliente, cargada):
    borrar(sesion, cargada, momento(date(2026, 10, 27), 6), momento(date(2026, 10, 27), 9))
    borrar(sesion, cargada, momento(date(2026, 10, 30), 6), momento(date(2026, 10, 30), 9))

    ejecuciones = recuperar(sesion, cliente, cargada)

    assert rangos_pedidos(cliente) == {
        (date(2026, 10, 27), date(2026, 10, 27)),
        (date(2026, 10, 30), date(2026, 10, 30)),
    }
    assert sorted(e.ventana_desde for e in ejecuciones) == [
        momento(date(2026, 10, 27), 0),
        momento(date(2026, 10, 30), 0),
    ]


@pytest.mark.parametrize(
    ("lecturas_perdidas", "hay_hueco"),
    [(2, False), (3, True)],
    ids=["30-minutos-no-cuenta", "40-minutos-cuenta"],
)
def test_solo_cuentan_los_tramos_de_mas_de_30_minutos(
    sesion, cliente, cargada, lecturas_perdidas, hay_hueco
):
    assert timedelta(minutes=30) == HUECO_MINIMO
    dia = date(2026, 10, 29)
    borrar(sesion, cargada, momento(dia, 10), momento(dia, 10, 10 * lecturas_perdidas))

    recuperar(sesion, cliente, cargada)

    assert rangos_pedidos(cliente) == ({(dia, dia)} if hay_hueco else set())


def test_hueco_al_final_de_la_ventana(sesion, cliente, cargada):
    borrar(sesion, cargada, momento(HOY, 10), momento(HOY, 23, 59))

    recuperar(sesion, cliente, cargada)

    assert rangos_pedidos(cliente) == {(HOY, HOY)}


def test_hueco_al_principio_de_la_ventana(sesion, cliente, cargada):
    primero = HOY - timedelta(days=DIAS - 1)
    borrar(sesion, cargada, momento(primero, 0), momento(primero + timedelta(days=1), 0))

    recuperar(sesion, cliente, cargada)

    assert rangos_pedidos(cliente) == {(primero, primero)}


def test_un_dia_parcial_se_completa_sin_duplicar(sesion, cliente, cargada):
    antes = total(sesion)
    borrar(sesion, cargada, momento(date(2026, 10, 30), 12), momento(date(2026, 10, 30), 18))

    recuperar(sesion, cliente, cargada)

    assert total(sesion) == antes


class SinDatosEn(Cliente):
    """SAT2 no tiene lecturas de esos días."""

    def __init__(self, dias: set[date]):
        super().__init__()
        self.dias = dias

    def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
        serie = super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)
        return [
            registro
            for registro in serie
            if datetime.fromisoformat(registro["fecha"]).date() not in self.dias
        ]


def test_un_dia_terminado_que_sat2_no_tiene_no_se_vuelve_a_pedir(sesion, cargada):
    dia = date(2026, 10, 30)
    borrar(sesion, cargada, momento(dia, 0), momento(dia + timedelta(days=1), 0))
    sin_datos = SinDatosEn({dia})

    primera = recuperar(sesion, sin_datos, cargada)
    sin_datos.historicos_pedidos.clear()
    segunda = recuperar(sesion, sin_datos, cargada, ahora=AHORA + timedelta(hours=1))

    assert [e.resultado for e in primera] == ["EXITO"]
    # La SAT2 simulada no avanza su reloj: una hora después, solo falta la última hora de hoy.
    assert [(e.ventana_desde, e.ventana_hasta) for e in segunda] == [(momento(HOY, 0), momento(HOY, 0))]
    assert rangos_pedidos(sin_datos) == {(HOY, HOY)}


def test_el_dia_en_curso_se_vuelve_a_pedir(sesion, cargada):
    borrar(sesion, cargada, momento(HOY, 6), momento(HOY, 9))
    sin_datos = SinDatosEn({HOY})

    recuperar(sesion, sin_datos, cargada)
    sin_datos.historicos_pedidos.clear()
    recuperar(sesion, sin_datos, cargada, ahora=AHORA + timedelta(hours=1))

    assert rangos_pedidos(sin_datos) == {(HOY, HOY)}


def test_un_dia_pedido_antes_de_terminar_se_vuelve_a_pedir_despues(sesion, cargada):
    """Si se pidió mientras transcurría, SAT2 todavía no tenía el día completo."""
    dia = date(2026, 10, 31)
    borrar(sesion, cargada, momento(dia, 6), momento(dia, 9))
    sin_datos = SinDatosEn({dia})
    sesion.add(
        EjecucionIngesta(
            estacion_id=cargada.id,
            tipo="RECUPERACION",
            ventana_desde=momento(dia, 0),
            ventana_hasta=momento(dia, 0),
            iniciada_en=momento(dia, 12),
            finalizada_en=momento(dia, 12),
            resultado="EXITO",
        )
    )
    sesion.commit()

    recuperar(sesion, sin_datos, cargada)

    assert rangos_pedidos(sin_datos) == {(dia, dia)}


def test_errores_repetidos_dejan_la_recuperacion_en_error_y_se_reintenta(sesion, cargada):
    class SiempreFalla(Cliente):
        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)
            raise ErrorSat2("caída")

    dia = date(2026, 10, 30)
    borrar(sesion, cargada, momento(dia, 0), momento(dia + timedelta(days=1), 0))
    cae = SiempreFalla()

    [ejecucion] = recuperar(sesion, cae, cargada)
    cae.historicos_pedidos.clear()
    recuperar(sesion, cae, cargada, ahora=AHORA + timedelta(hours=1))

    assert ejecucion.resultado == "ERROR"
    assert rangos_pedidos(cae) == {(dia, dia)}


def test_marca_la_humedad_incoherente_de_los_dias_recuperados(sesion, cargada):
    class HumedadDispar(Cliente):
        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            serie = super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)
            if id_sensor == 4:
                return [{**r, "valor": 10} for r in serie]
            if id_sensor == 5:
                return [{**r, "valor": 60} for r in serie]
            return serie

    dia = date(2026, 10, 30)
    borrar(sesion, cargada, momento(dia, 0), momento(dia + timedelta(days=1), 0))

    recuperar(sesion, HumedadDispar(), cargada)

    sospechosas = sesion.scalar(
        select(func.count())
        .select_from(Observacion)
        .where(
            Observacion.calidad == "SOSPECHOSO",
            Observacion.medido_en >= momento(dia, 0),
            Observacion.medido_en < momento(dia + timedelta(days=1), 0),
        )
    )
    assert sospechosas > 0


def test_la_tarea_del_worker_recupera_despues_de_la_carga(sesion, cliente, cargada):
    dia = date(2026, 10, 30)
    borrar(sesion, cargada, momento(dia, 0), momento(dia + timedelta(days=1), 0))
    # La carga inicial ya terminó hace tiempo: la tarea no la repite.
    sesion.add(
        EjecucionIngesta(
            estacion_id=cargada.id,
            tipo="CARGA_INICIAL",
            iniciada_en=AHORA - timedelta(days=40),
            finalizada_en=AHORA - timedelta(days=40),
            resultado="EXITO",
        )
    )
    sesion.commit()

    worker.tarea_carga(
        FabricaDePruebas(sesion), cliente, reloj=lambda: AHORA, pausa_segundos=0, dormir=sin_pausa
    )

    tipos = sesion.scalars(select(EjecucionIngesta.tipo)).all()
    assert "RECUPERACION" in tipos
    assert (dia, dia) in rangos_pedidos(cliente)
