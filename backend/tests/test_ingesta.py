"""Escenarios de `sat2-ingestion` contra PostgreSQL, con el cliente simulado."""

import copy
import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal as D
from functools import partial

import pytest
from sqlalchemy import func, select

from app.datos.modelos import (
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    Observacion,
    Recomendacion,
    Sensor,
    Sesion,
    Usuario,
)
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.ingesta import worker
from app.ingesta.carga_inicial import ejecutar_carga_inicial
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.ciclo import ejecutar_ciclo
from app.ingesta.cliente_sat2 import ErrorCredenciales, ErrorSat2
from app.ingesta.cliente_simulado import ClienteSat2Simulado

AHORA = datetime(2026, 11, 2, 15, 34, tzinfo=UTC)
AHORA_LOCAL = AHORA.astimezone(ZONA_ARGENTINA)
MEDICION = datetime(2026, 11, 2, 15, 30, tzinfo=UTC)


def reloj_local():
    return AHORA_LOCAL


class Cliente(ClienteSat2Simulado):
    """Simulado con lecturas modificables y un registro de consultas."""

    def __init__(self, **opciones):
        super().__init__(reloj=reloj_local, **opciones)
        self.cambios: dict[str, str] = {}
        self.quitar: set[str] = set()
        self.agregar: list[dict] = []
        self.error_instantaneos: Exception | None = None
        self.historicos_pedidos: list[tuple[int, date, date]] = []

    def recuperar_instantaneos(self, id_equipo):
        if self.error_instantaneos:
            raise self.error_instantaneos
        datos = copy.deepcopy(super().recuperar_instantaneos(id_equipo))
        lecturas = []
        for lectura in datos["datosSensores"]:
            if lectura["nombreSensor"] in self.quitar:
                continue
            if lectura["nombreSensor"] in self.cambios:
                lectura["valor"] = self.cambios[lectura["nombreSensor"]]
            lecturas.append(lectura)
        datos["datosSensores"] = lecturas + self.agregar
        return datos

    def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
        self.historicos_pedidos.append((id_sensor, desde, hasta))
        return super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)


def contar(sesion, modelo, *condiciones) -> int:
    return sesion.scalar(select(func.count()).select_from(modelo).where(*condiciones))


@pytest.fixture
def cliente():
    return Cliente()


@pytest.fixture
def estacion(sesion, cliente):
    estacion = sincronizar_catalogo(sesion, cliente)[0]
    sesion.commit()
    return estacion


def observacion_de(sesion, nombre, medido_en=MEDICION):
    return sesion.scalar(
        select(Observacion)
        .join(Sensor)
        .where(Sensor.nombre == nombre, Observacion.medido_en == medido_en)
    )


# Catálogo


def test_sincroniza_estaciones_y_sensores(sesion, cliente):
    estacion = sincronizar_catalogo(sesion, cliente)[0]
    assert estacion.nombre == "Estación de ejemplo"
    assert contar(sesion, Sensor) == 11

    t10 = sesion.scalar(select(Sensor).where(Sensor.nombre == "Temp Amb. a 10 Mts"))
    assert t10.magnitud == "TEMPERATURA"
    assert t10.altura_m == D("10")


def test_sincronizar_dos_veces_no_duplica_y_actualiza(sesion, cliente):
    sincronizar_catalogo(sesion, cliente)
    sesion.scalar(select(Estacion)).nombre = "Nombre viejo"
    sesion.flush()

    sincronizar_catalogo(sesion, cliente)

    assert contar(sesion, Estacion) == 1
    assert contar(sesion, Sensor) == 11
    assert sesion.scalar(select(Estacion)).nombre == "Estación de ejemplo"


def test_un_sensor_no_clasificable_no_detiene_el_catalogo(sesion, caplog):
    class ConSensorRaro(Cliente):
        def recuperar_equipos(self):
            equipos = super().recuperar_equipos()
            equipos[0]["sensores"].append(
                {"idSensor": 99, "nombre": "Sensor nuevo", "unidad": "x", "Icono": 0}
            )
            return equipos

    with caplog.at_level(logging.WARNING):
        sincronizar_catalogo(sesion, ConSensorRaro())

    assert contar(sesion, Sensor) == 11
    assert "Sensor nuevo" in caplog.text


# Ciclo


def test_el_ciclo_guarda_lecturas_y_recomendacion(sesion, cliente, estacion):
    ejecucion = ejecutar_ciclo(sesion, cliente, estacion, AHORA)

    assert ejecucion.tipo == "CICLO"
    assert ejecucion.resultado == "EXITO"
    assert ejecucion.lecturas_guardadas == 11
    assert ejecucion.finalizada_en == AHORA
    bateria = observacion_de(sesion, "Bateria")
    assert bateria.valor == D("13.8100")
    assert bateria.origen == "INSTANTANEO"

    recomendacion = sesion.scalar(select(Recomendacion))
    assert recomendacion.medido_en == MEDICION
    assert recomendacion.estado == "APTO"
    assert recomendacion.delta_t_c == D("-0.10")
    assert recomendacion.version_metodo == "TIS-1.1"
    assert recomendacion.motivos[0]["codigo"] == "SIN_INVERSION"


def test_vincula_por_nombre_con_otra_acentuacion(sesion, cliente, estacion):
    cliente.quitar = {"Anemómetro"}
    cliente.agregar = [
        {"nombreSensor": "ANEMOMETRO", "valor": "12", "unidad": "km/H", "alarma": False}
    ]
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)
    assert observacion_de(sesion, "Anemómetro").valor == D("12.0000")


def test_una_medicion_repetida_no_duplica(sesion, cliente, estacion):
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)
    segunda = ejecutar_ciclo(sesion, cliente, estacion, AHORA + timedelta(minutes=1))

    assert segunda.resultado == "EXITO"
    assert segunda.lecturas_guardadas == 0
    assert contar(sesion, Observacion) == 11
    assert contar(sesion, Recomendacion) == 1


def test_sensor_desconocido_queda_en_el_detalle(sesion, cliente, estacion):
    cliente.agregar = [{"nombreSensor": "Sensor raro", "valor": "1", "alarma": False}]
    ejecucion = ejecutar_ciclo(sesion, cliente, estacion, AHORA)

    assert ejecucion.resultado == "PARCIAL"
    assert "Sensor raro" in ejecucion.detalle
    assert contar(sesion, Observacion) == 11


def test_conserva_la_alarma(sesion, cliente, estacion):
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)
    assert observacion_de(sesion, "Pluviometro").alarma is True
    assert observacion_de(sesion, "Bateria").alarma is False


def test_sensor_ausente_queda_faltante_e_impide_el_indice(sesion, cliente, estacion):
    cliente.quitar = {"Temp Amb. a 10 Mts"}
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)

    faltante = observacion_de(sesion, "Temp Amb. a 10 Mts")
    assert faltante.valor is None
    assert faltante.calidad == "FALTANTE"
    recomendacion = sesion.scalar(select(Recomendacion))
    assert recomendacion.estado == "DATOS_INSUFICIENTES"
    assert recomendacion.indice is None
    assert "Temp Amb. a 10 Mts" in recomendacion.motivos[0]["detalle"]


def test_dato_vacio_es_faltante(sesion, cliente, estacion):
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)
    assert observacion_de(sesion, "Humedad de Hoja").calidad == "FALTANTE"


def test_humedad_incoherente_queda_sospechosa_y_limita_el_estado(sesion, cliente, estacion):
    cliente.cambios = {"Hum Amb. a 2 Mts": "0", "Hum Amb. a 10 Mts": "61"}
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)

    for nombre in ("Hum Amb. a 2 Mts", "Hum Amb. a 10 Mts"):
        lectura = observacion_de(sesion, nombre)
        assert lectura.calidad == "SOSPECHOSO"
        assert lectura.valor is not None
    recomendacion = sesion.scalar(select(Recomendacion))
    assert recomendacion.estado == "PRECAUCION"
    assert recomendacion.motivos[0]["codigo"] == "DATO_SOSPECHOSO"


def test_inversion_se_refleja_en_la_recomendacion(sesion, cliente, estacion):
    cliente.cambios = {"Temp Amb. a 10 Mts": "21,20"}
    ejecutar_ciclo(sesion, cliente, estacion, AHORA)

    recomendacion = sesion.scalar(select(Recomendacion))
    assert recomendacion.inversion_detectada is True
    assert recomendacion.delta_t_c == D("0.90")
    assert recomendacion.estado != "APTO"


def test_error_de_la_fuente_queda_registrado_y_el_siguiente_funciona(
    sesion, cliente, estacion
):
    cliente.error_instantaneos = ErrorSat2("RecuperarInstantaneosDeEquipo: estado 500")
    fallida = ejecutar_ciclo(sesion, cliente, estacion, AHORA)
    assert fallida.resultado == "ERROR"
    assert "estado 500" in fallida.detalle
    assert fallida.finalizada_en == AHORA
    assert contar(sesion, Observacion) == 0

    cliente.error_instantaneos = None
    assert ejecutar_ciclo(sesion, cliente, estacion, AHORA).resultado == "EXITO"


def test_respuesta_sin_fecha_queda_como_error(sesion, estacion):
    class SinFecha(Cliente):
        def recuperar_instantaneos(self, id_equipo):
            return {"datosSensores": []}

    assert ejecutar_ciclo(sesion, SinFecha(), estacion, AHORA).resultado == "ERROR"


# Carga inicial


def sin_pausa(_segundos):
    return None


def cargar(sesion, cliente, estacion, dias=8):
    """Con 8 días los tests son rápidos y el simulado siempre incluye huecos y centinela."""
    return ejecutar_carga_inicial(
        sesion, cliente, estacion, AHORA, dias=dias, dormir=sin_pausa
    )


def test_carga_los_ultimos_31_dias_de_cada_sensor(sesion, cliente, estacion):
    ejecucion = cargar(sesion, cliente, estacion, dias=31)

    assert ejecucion.tipo == "CARGA_INICIAL"
    assert ejecucion.resultado == "EXITO"
    assert ejecucion.lecturas_guardadas > 0
    assert len(cliente.historicos_pedidos) == 11
    assert {(d, h) for _, d, h in cliente.historicos_pedidos} == {
        (date(2026, 10, 3), date(2026, 11, 2))
    }
    assert contar(sesion, Observacion, Observacion.origen == "HISTORICO") > 11 * 30 * 140
    mas_antigua = sesion.scalar(select(func.min(Observacion.medido_en)))
    assert mas_antigua.astimezone(ZONA_ARGENTINA).date() == date(2026, 10, 3)


def test_no_guarda_el_centinela_como_valor(sesion, cliente, estacion):
    cargar(sesion, cliente, estacion)
    assert contar(sesion, Observacion, Observacion.valor == D("-999.9")) == 0
    assert contar(sesion, Observacion, Observacion.calidad == "FALTANTE") > 0


def test_repetir_la_carga_no_duplica_ni_consulta_de_nuevo(sesion, cliente, estacion):
    cargar(sesion, cliente, estacion)
    total = contar(sesion, Observacion)
    cliente.historicos_pedidos.clear()

    segunda = cargar(sesion, cliente, estacion)

    assert segunda.resultado == "EXITO"
    assert segunda.lecturas_guardadas == 0
    assert cliente.historicos_pedidos == []
    assert contar(sesion, Observacion) == total


def test_carga_interrumpida_completa_lo_que_falta(sesion, estacion):
    class SeCorta(Cliente):
        def __init__(self):
            super().__init__()
            self.fallar = True

        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            if self.fallar and id_sensor >= 4:
                raise ErrorSat2("caída")
            return super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)

    cliente = SeCorta()
    primera = cargar(sesion, cliente, estacion)
    assert primera.resultado == "ERROR"
    con_datos = sesion.scalar(select(func.count(func.distinct(Observacion.sensor_id))))
    assert con_datos == 3

    cliente.fallar = False
    cliente.historicos_pedidos.clear()
    segunda = cargar(sesion, cliente, estacion)

    assert segunda.resultado == "EXITO"
    assert {s for s, _, _ in cliente.historicos_pedidos} == set(range(4, 12))
    assert sesion.scalar(select(func.count(func.distinct(Observacion.sensor_id)))) == 11


def test_ventana_rechazada_se_reduce_a_quince_dias_o_menos(sesion, estacion):
    cliente = Cliente(max_dias_por_consulta=20)
    ejecucion = cargar(sesion, cliente, estacion, dias=31)

    assert ejecucion.resultado == "EXITO"
    posteriores = cliente.historicos_pedidos[1:]
    assert posteriores
    assert all((h - d).days + 1 <= 15 for _, d, h in posteriores)
    # La reducción se mantiene: los sensores siguientes no vuelven a pedir 31 días.
    assert sum((h - d).days + 1 == 31 for _, d, h in cliente.historicos_pedidos) == 1


def test_respuesta_recortada_pide_lo_que_falta(sesion, estacion):
    class Recorta(Cliente):
        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            inicio = max(desde, hasta - timedelta(days=9))
            return super().recuperar_historicos(id_equipo, id_sensor, inicio, hasta)

    cliente = Recorta()
    ejecucion = cargar(sesion, cliente, estacion, dias=31)

    assert ejecucion.resultado == "EXITO"
    mas_antigua = sesion.scalar(select(func.min(Observacion.medido_en)))
    assert mas_antigua.astimezone(ZONA_ARGENTINA).date() == date(2026, 10, 3)


def test_se_detiene_ante_errores_repetidos(sesion, estacion):
    class SiempreFalla(Cliente):
        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            self.historicos_pedidos.append((id_sensor, desde, hasta))
            raise ErrorSat2("caída")

    cliente = SiempreFalla()
    ejecucion = cargar(sesion, cliente, estacion)

    assert ejecucion.resultado == "ERROR"
    assert len(cliente.historicos_pedidos) == 5


def test_credenciales_rechazadas_detienen_la_carga_de_inmediato(sesion, estacion):
    class SinAcceso(Cliente):
        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            self.historicos_pedidos.append((id_sensor, desde, hasta))
            raise ErrorCredenciales("rechazadas")

    cliente = SinAcceso()
    ejecucion = cargar(sesion, cliente, estacion)
    assert ejecucion.resultado == "ERROR"
    assert len(cliente.historicos_pedidos) == 1


def test_pausa_entre_consultas(sesion, cliente, estacion):
    pausas = []
    ejecutar_carga_inicial(
        sesion, cliente, estacion, AHORA, dias=2, pausa_segundos=2.0, dormir=pausas.append
    )
    assert pausas == [2.0] * 10


def test_marca_humedad_incoherente_en_historicos(sesion, estacion):
    class HumedadDispar(Cliente):
        def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta):
            serie = super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)
            if id_sensor == 4:
                return [{**r, "valor": 10} for r in serie]
            if id_sensor == 5:
                return [{**r, "valor": 60} for r in serie]
            return serie

    cargar(sesion, HumedadDispar(), estacion)

    sospechosas = contar(sesion, Observacion, Observacion.calidad == "SOSPECHOSO")
    humedad = contar(
        sesion,
        Observacion,
        Observacion.sensor_id.in_(
            select(Sensor.id).where(Sensor.magnitud == "HUMEDAD_RELATIVA")
        ),
        Observacion.valor.is_not(None),
    )
    assert sospechosas == humedad > 0


def test_el_ciclo_puede_ejecutarse_durante_la_carga(sesion, cliente, estacion):
    ciclos = []

    def durante_la_pausa(_segundos):
        if not ciclos:
            ciclos.append(ejecutar_ciclo(sesion, cliente, estacion, AHORA))

    ejecucion = ejecutar_carga_inicial(
        sesion, cliente, estacion, AHORA, dias=2, dormir=durante_la_pausa
    )

    assert ciclos[0].resultado == "EXITO"
    assert ejecucion.resultado == "EXITO"


# Worker


class FabricaDePruebas:
    """Entrega la sesión de la prueba sin cerrarla al salir del bloque."""

    def __init__(self, sesion):
        self.sesion = sesion

    def __call__(self):
        return self

    def __enter__(self):
        return self.sesion

    def __exit__(self, *errores):
        return False


def test_el_ciclo_del_worker_sincroniza_si_no_hay_estaciones(sesion, cliente):
    worker.tarea_ciclo(FabricaDePruebas(sesion), cliente, reloj=lambda: AHORA)

    assert contar(sesion, Estacion) == 1
    assert contar(sesion, EjecucionIngesta, EjecucionIngesta.tipo == "CICLO") == 1
    assert contar(sesion, Recomendacion) == 1


def test_el_worker_no_ingesta_estaciones_inactivas(sesion, cliente, estacion):
    estacion.activa = False
    sesion.commit()
    fabrica = FabricaDePruebas(sesion)

    worker.tarea_carga(fabrica, cliente, reloj=lambda: AHORA, pausa_segundos=0, dormir=sin_pausa)

    assert cliente.historicos_pedidos == []


def test_la_carga_exitosa_no_se_repite(sesion, cliente, estacion, monkeypatch):
    monkeypatch.setattr(
        worker, "ejecutar_carga_inicial", partial(ejecutar_carga_inicial, dias=2)
    )
    fabrica = FabricaDePruebas(sesion)
    worker.tarea_carga(fabrica, cliente, reloj=lambda: AHORA, pausa_segundos=0, dormir=sin_pausa)
    assert contar(sesion, EjecucionIngesta, EjecucionIngesta.tipo == "CARGA_INICIAL") == 1

    worker.tarea_carga(fabrica, cliente, reloj=lambda: AHORA, pausa_segundos=0, dormir=sin_pausa)
    assert contar(sesion, EjecucionIngesta, EjecucionIngesta.tipo == "CARGA_INICIAL") == 1


def test_elimina_sesiones_e_intentos_vencidos(sesion, cliente, estacion):
    usuario = Usuario(email="a@b.example", nombre="N", password_hash="h")
    sesion.add(usuario)
    sesion.flush()
    sesion.add_all(
        [
            Sesion(
                usuario_id=usuario.id,
                hash_identificador="a" * 64,
                creada_en=AHORA - timedelta(hours=10),
                vence_en=AHORA - timedelta(hours=2),
            ),
            Sesion(
                usuario_id=usuario.id,
                hash_identificador="b" * 64,
                creada_en=AHORA,
                vence_en=AHORA + timedelta(hours=8),
            ),
            IntentoAcceso(email="a@b.example", ocurrido_en=AHORA - timedelta(hours=25)),
            IntentoAcceso(email="a@b.example", ocurrido_en=AHORA),
        ]
    )
    sesion.commit()

    worker.tarea_ciclo(FabricaDePruebas(sesion), cliente, reloj=lambda: AHORA)

    assert contar(sesion, Sesion) == 1
    assert contar(sesion, IntentoAcceso) == 1


def test_una_tarea_fallida_no_expone_el_mensaje_ni_detiene(caplog):
    def falla():
        raise RuntimeError("detalle con clave-secreta")

    with caplog.at_level(logging.ERROR):
        worker.protegida("prueba", falla)

    assert "RuntimeError" in caplog.text
    assert "clave-secreta" not in caplog.text


def test_el_cliente_serializado_delega(cliente):
    envuelto = worker.ClienteSerializado(cliente)
    assert envuelto.recuperar_equipos()
    assert envuelto.recuperar_instantaneos(1)
    assert envuelto.recuperar_historicos(1, 6, date(2026, 11, 1), date(2026, 11, 1))
