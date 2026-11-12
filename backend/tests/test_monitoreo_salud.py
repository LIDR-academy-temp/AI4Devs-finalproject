"""Semáforo de salud de la estación (D7 de weather-track-monitoreo), con sus límites."""

from datetime import UTC, datetime, timedelta

import pytest

from app.monitoreo.salud import salud_de_la_estacion

AHORA = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


def hace(minutos: float) -> datetime:
    return AHORA - timedelta(minutes=minutos)


@pytest.mark.parametrize(
    ("ciclo", "resultado", "dato", "esperado"),
    [
        # En vivo: ciclo bien en los últimos 20 minutos y dato de 30 minutos o menos.
        (5, "EXITO", 8, "EN_VIVO"),
        (20, "EXITO", 30, "EN_VIVO"),
        (5, "PARCIAL", 8, "EN_VIVO"),
        # Con demoras: hay ciclos, pero fallan o SAT2 no trae datos nuevos.
        (5, "ERROR", 8, "CON_DEMORAS"),
        (5, "EXITO", 31, "CON_DEMORAS"),
        (5, "EXITO", 45, "CON_DEMORAS"),
        (5, "EXITO", None, "CON_DEMORAS"),
        # Caído: no hubo ciclos en más de 20 minutos, aunque el último haya salido bien.
        (21, "EXITO", 8, "CAIDO"),
        (60 * 24 * 7, "EXITO", 60 * 24 * 7, "CAIDO"),
        (21, "ERROR", 8, "CAIDO"),
        (None, None, None, "CAIDO"),
    ],
)
def test_estados_del_semaforo_y_sus_limites(ciclo, resultado, dato, esperado):
    assert (
        salud_de_la_estacion(
            None if ciclo is None else hace(ciclo),
            resultado,
            None if dato is None else hace(dato),
            AHORA,
            "real",
        )
        == esperado
    )


@pytest.mark.parametrize("ciclo", [None, 5, 60])
def test_en_modo_prueba_no_hay_ciclos_que_esperar(ciclo):
    momento = None if ciclo is None else hace(ciclo)

    assert salud_de_la_estacion(momento, "EXITO", hace(3), AHORA, "prueba") == "MODO_PRUEBA"


def test_usa_los_umbrales_del_monitoreo_y_de_r2():
    from app.dominio.vigencia import ANTIGUEDAD_MAXIMA
    from app.monitoreo import umbrales

    assert umbrales.WORKER_SIN_ACTIVIDAD_DESPUES_DE == timedelta(minutes=20)
    assert ANTIGUEDAD_MAXIMA == timedelta(minutes=30)
