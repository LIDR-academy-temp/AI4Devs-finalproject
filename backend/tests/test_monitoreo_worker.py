"""El worker evalúa los controles de salud en cada ciclo (D2 y D3 de weather-track-monitoreo)."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.datos.modelos import AlertaSistema, Estacion, IntentoAcceso
from app.ingesta import worker
from app.monitoreo.controles import Disco
from tests.test_ingesta import FabricaDePruebas

AHORA = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)


def test_la_tarea_abre_las_alertas_de_los_controles_que_fallan(sesion):
    sesion.add(Estacion(id_equipo_sat2=1, nombre="INTA Pergamino", latitud=Decimal("-34"), longitud=Decimal("-60")))
    for n in range(20):
        sesion.add(IntentoAcceso(email=f"x{n}@ejemplo.example", ocurrido_en=AHORA - timedelta(minutes=1)))
    sesion.commit()

    worker.tarea_monitoreo(
        FabricaDePruebas(sesion), "real", reloj=lambda: AHORA, medir_disco=lambda: Disco(100, 5)
    )

    abiertas = sorted(sesion.scalars(select(AlertaSistema.tipo)).all())
    assert abiertas == ["DISCO_CASI_LLENO", "FUERZA_BRUTA"]


def test_medir_el_disco_sin_el_volumen_montado_no_falla(tmp_path, monkeypatch):
    monkeypatch.setattr(worker, "RUTA_DISCO", tmp_path / "no-existe")

    assert worker.medir_disco() is None


def test_medir_el_disco_montado(tmp_path, monkeypatch):
    monkeypatch.setattr(worker, "RUTA_DISCO", tmp_path)

    disco = worker.medir_disco()

    assert disco.total > 0
    assert 0 <= disco.libre <= disco.total


def test_la_tarea_actualiza_las_metricas(sesion):
    from app.monitoreo.metricas import exponer

    sesion.add(Estacion(id_equipo_sat2=1, nombre="INTA Pergamino", latitud=Decimal("-34"), longitud=Decimal("-60")))
    sesion.commit()

    worker.tarea_monitoreo(
        FabricaDePruebas(sesion), "real", reloj=lambda: AHORA, medir_disco=lambda: Disco(100, 40)
    )

    assert "weathertrack_disco_libre_ratio 0.4" in exponer().decode("utf-8")
