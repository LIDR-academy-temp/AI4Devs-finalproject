"""Modo de prueba de `sat2-ingestion` (D5 de weather-track-estaciones)."""

from contextlib import nullcontext
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select

from app import semillas
from app.datos.modelos import (
    ConfiguracionBase,
    EjecucionIngesta,
    Estacion,
    Observacion,
    Recomendacion,
    Sensor,
    Usuario,
    UsuarioEstacion,
)
from app.ingesta import worker
from app.ingesta.modo_prueba import NOMBRE_CASO_1, NOMBRE_CASO_2, preparar_modo_prueba

AHORA = datetime(2026, 11, 3, 15, 34, tzinfo=UTC)


def contar(sesion, modelo, *condiciones) -> int:
    return sesion.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def lecturas_de(sesion, estacion) -> int:
    return contar(sesion, Observacion, Observacion.sensor_id.in_(
        select(Sensor.id).where(Sensor.estacion_id == estacion.id)
    ))


class FabricaDePruebas:
    def __init__(self, sesion):
        self.sesion = sesion

    def __call__(self):
        return nullcontext(self.sesion)


def base_con_lecturas(sesion):
    """Como una copia de la base real: el equipo 1 con su nombre y una lectura."""
    estacion = Estacion(
        id_equipo_sat2=1, nombre="INTA Pergamino", latitud=Decimal("-33.9"), longitud=Decimal("-60.6")
    )
    sesion.add(estacion)
    sesion.flush()
    sensor = Sensor(
        estacion_id=estacion.id,
        id_sensor_sat2=6,
        nombre="Temp Amb. a 2 Mts",
        clave_normalizada="temp amb a 2 mts",
        magnitud="TEMPERATURA",
        unidad="°C",
    )
    sesion.add(sensor)
    sesion.flush()
    sesion.add(
        Observacion(
            sensor_id=sensor.id, medido_en=AHORA, valor=Decimal("20"), calidad="OK", origen="INSTANTANEO"
        )
    )
    sesion.commit()
    return estacion


def test_una_base_vacia_recibe_los_datos_simulados_solo_en_el_caso_1(sesion):
    caso_1, caso_2 = preparar_modo_prueba(sesion, AHORA)

    assert (caso_1.id_equipo_sat2, caso_1.nombre) == (1, NOMBRE_CASO_1)
    assert (caso_2.id_equipo_sat2, caso_2.nombre) == (2, NOMBRE_CASO_2)
    assert lecturas_de(sesion, caso_1) > 0
    assert contar(sesion, Recomendacion, Recomendacion.estacion_id == caso_1.id) == 1
    assert lecturas_de(sesion, caso_2) == 0
    assert contar(sesion, EjecucionIngesta, EjecucionIngesta.estacion_id == caso_2.id) == 0


def test_una_base_con_lecturas_no_recibe_lecturas_nuevas(sesion):
    estacion = base_con_lecturas(sesion)

    caso_1, caso_2 = preparar_modo_prueba(sesion, AHORA)

    assert caso_1.id == estacion.id
    assert caso_1.nombre == NOMBRE_CASO_1
    assert contar(sesion, Observacion) == 1
    assert contar(sesion, EjecucionIngesta) == 0
    assert lecturas_de(sesion, caso_2) == 0


def test_el_caso_2_tiene_los_sensores_del_caso_1_sin_lecturas(sesion):
    base_con_lecturas(sesion)
    caso_1, caso_2 = preparar_modo_prueba(sesion, AHORA)

    def sensores(estacion):
        return set(sesion.scalars(select(Sensor.nombre).where(Sensor.estacion_id == estacion.id)))

    assert sensores(caso_2) == sensores(caso_1) == {"Temp Amb. a 2 Mts"}
    assert lecturas_de(sesion, caso_2) == 0


def test_se_puede_repetir_sin_duplicar(sesion):
    base_con_lecturas(sesion)
    preparar_modo_prueba(sesion, AHORA)
    preparar_modo_prueba(sesion, AHORA)

    assert contar(sesion, Estacion) == 2
    assert contar(sesion, Sensor) == 2
    assert contar(sesion, Observacion) == 1


def test_quien_ve_el_caso_1_tambien_ve_el_caso_2(sesion):
    estacion = base_con_lecturas(sesion)
    usuario = Usuario(email="a@b.example", nombre="N", password_hash="h")
    sesion.add(usuario)
    sesion.flush()
    sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=estacion.id))
    sesion.commit()

    _, caso_2 = preparar_modo_prueba(sesion, AHORA)

    assert sesion.get(UsuarioEstacion, (usuario.id, caso_2.id)) is not None


class PlanificadorFalso:
    def __init__(self, **_opciones):
        self.tareas = []
        PlanificadorFalso.ultimo = self

    def add_job(self, funcion, *_args, **_opciones):
        self.tareas.append(funcion)

    def start(self):
        pass


def test_el_worker_en_modo_prueba_no_crea_el_cliente_de_sat2(sesion, monkeypatch, tmp_path):
    def sin_sat2(_modo):
        raise AssertionError("El modo de prueba no debe crear el cliente de SAT2")

    monkeypatch.setattr(worker, "crear_cliente", sin_sat2)
    monkeypatch.setattr(worker, "BlockingScheduler", PlanificadorFalso)
    monkeypatch.setattr(worker, "RUTA_LATIDO", tmp_path / "latido")
    monkeypatch.setattr(worker, "registrar_latido", lambda: None)
    base_con_lecturas(sesion)

    assert worker.principal_de_prueba(FabricaDePruebas(sesion)) == 0

    assert PlanificadorFalso.ultimo.tareas == [worker.registrar_latido]
    assert contar(sesion, Observacion) == 1
    assert sesion.scalar(select(ConfiguracionBase.naturaleza)) == "FICTICIA"


def test_el_worker_elige_el_modo_prueba(monkeypatch):
    monkeypatch.setenv("SAT2_MODO", "prueba")
    monkeypatch.setattr(worker, "obtener_motor", lambda: None)
    monkeypatch.setattr(worker, "principal_de_prueba", lambda _fabrica: 7)
    assert worker.principal() == 7


def test_el_modo_prueba_no_arranca_sobre_la_base_real(sesion, monkeypatch):
    monkeypatch.setattr(worker, "crear_cliente", lambda _modo: None)
    sesion.add(ConfiguracionBase(naturaleza="REAL"))
    sesion.commit()

    assert worker.principal_de_prueba(FabricaDePruebas(sesion)) == 2
    assert contar(sesion, Estacion) == 0


def test_las_semillas_del_modo_prueba_dan_acceso_a_los_dos_casos(sesion, monkeypatch, capsys):
    monkeypatch.setenv("SAT2_MODO", "prueba")
    monkeypatch.setattr(semillas, "obtener_motor", lambda: None)
    monkeypatch.setattr(semillas, "Session", lambda _motor: nullcontext(sesion))
    base_con_lecturas(sesion)

    assert semillas.principal() == 0

    usuario = sesion.scalar(select(Usuario).where(Usuario.email == semillas.EMAIL_DEMO))
    nombres = {estacion.nombre for estacion in usuario.estaciones}
    assert nombres == {NOMBRE_CASO_1, NOMBRE_CASO_2}
    assert "Clave generada" in capsys.readouterr().out
