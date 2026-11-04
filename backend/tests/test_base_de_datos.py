import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError

from app.datos.modelos import (
    Base,
    ConfiguracionBase,
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    Observacion,
    Recomendacion,
    Sensor,
    Sesion,
    Usuario,
    UsuarioEstacion,
)
from tests.conftest import configuracion_alembic

AHORA = datetime(2026, 11, 2, 15, 0, tzinfo=UTC)
TABLAS = {
    "usuario",
    "estacion",
    "usuario_estacion",
    "sensor",
    "observacion",
    "recomendacion",
    "ejecucion_ingesta",
    "sesion",
    "intento_acceso",
    "configuracion_base",
}
MOTIVO = [{"codigo": "SIN_INVERSION", "detalle": "No hay inversión."}]


@pytest.fixture
def estacion(sesion):
    registro = Estacion(
        id_equipo_sat2=1,
        nombre="Estación",
        latitud=Decimal("-34"),
        longitud=Decimal("-60"),
    )
    sesion.add(registro)
    sesion.flush()
    return registro


@pytest.fixture
def sensor(sesion, estacion):
    registro = Sensor(
        estacion_id=estacion.id,
        id_sensor_sat2=6,
        nombre="Temp Amb. a 2 Mts",
        clave_normalizada="temp amb a 2 mts",
        magnitud="TEMPERATURA",
        altura_m=Decimal("2"),
        unidad="°C",
    )
    sesion.add(registro)
    sesion.flush()
    return registro


@pytest.fixture
def usuario(sesion):
    registro = Usuario(email="a@b.example", nombre="Nombre", password_hash="hash")
    sesion.add(registro)
    sesion.flush()
    return registro


def observacion(sensor, **cambios):
    datos = {
        "sensor_id": sensor.id,
        "medido_en": AHORA,
        "valor": Decimal("20.3"),
        "calidad": "OK",
        "origen": "INSTANTANEO",
    }
    return Observacion(**{**datos, **cambios})


def recomendacion(estacion, **cambios):
    datos = {
        "estacion_id": estacion.id,
        "medido_en": AHORA,
        "version_metodo": "TIS-1.0",
        "estado": "APTO",
        "indice": Decimal("7"),
        "delta_t_c": Decimal("-0.1"),
        "inversion_detectada": False,
        "motivos": MOTIVO,
    }
    return Recomendacion(**{**datos, **cambios})


def debe_rechazarse(sesion, registro):
    with pytest.raises(IntegrityError):
        with sesion.begin_nested():
            sesion.add(registro)
            sesion.flush()


def test_la_migracion_crea_todas_las_tablas(motor):
    assert TABLAS <= set(inspect(motor).get_table_names())


def test_el_modelo_y_la_migracion_coinciden(motor):
    with motor.connect() as conexion:
        diferencias = compare_metadata(MigrationContext.configure(conexion), Base.metadata)
    assert diferencias == []


def test_se_puede_revertir_y_volver_a_aplicar(motor):
    configuracion = configuracion_alembic()
    command.downgrade(configuracion, "base")
    assert not TABLAS & set(inspect(motor).get_table_names())

    command.upgrade(configuracion, "head")
    assert TABLAS <= set(inspect(motor).get_table_names())


def test_la_migracion_0002_conserva_los_datos_al_aplicarse_y_revertirse(motor):
    configuracion = configuracion_alembic()
    command.downgrade(configuracion, "0001")
    try:
        with motor.begin() as conexion:
            conexion.execute(
                text(
                    "INSERT INTO estacion (id_equipo_sat2, nombre, latitud, longitud, activa) "
                    "VALUES (901, 'Activa', -34, -60, true), (902, 'Inactiva', -34, -60, false)"
                )
            )

        command.upgrade(configuracion, "head")
        with motor.connect() as conexion:
            fechas = dict(
                conexion.execute(
                    text("SELECT nombre, inactiva_desde FROM estacion WHERE id_equipo_sat2 > 900")
                ).all()
            )
        assert fechas["Activa"] is None
        assert fechas["Inactiva"] is not None

        command.downgrade(configuracion, "0001")
        with motor.connect() as conexion:
            assert conexion.execute(
                text("SELECT count(*) FROM estacion WHERE id_equipo_sat2 > 900")
            ).scalar() == 2
    finally:
        command.upgrade(configuracion, "head")
        with motor.begin() as conexion:
            conexion.execute(text("DELETE FROM estacion WHERE id_equipo_sat2 > 900"))


def test_una_observacion_valida_se_guarda(sesion, sensor):
    sesion.add(observacion(sensor))
    sesion.flush()
    assert sesion.scalar(select(Observacion.valor)) == Decimal("20.3000")


def test_rechaza_dos_observaciones_del_mismo_sensor_e_instante(sesion, sensor):
    sesion.add(observacion(sensor))
    sesion.flush()
    sesion.expunge_all()
    with pytest.raises(IntegrityError):
        with sesion.begin_nested():
            sesion.execute(
                text(
                    "INSERT INTO observacion (sensor_id, medido_en, valor, calidad, origen) "
                    "VALUES (:sensor, :momento, 1, 'OK', 'HISTORICO')"
                ),
                {"sensor": sensor.id, "momento": AHORA},
            )


def test_rechaza_valor_nulo_con_calidad_ok(sesion, sensor):
    debe_rechazarse(sesion, observacion(sensor, valor=None))


def test_rechaza_faltante_con_valor(sesion, sensor):
    debe_rechazarse(sesion, observacion(sensor, calidad="FALTANTE"))


def test_acepta_faltante_sin_valor(sesion, sensor):
    sesion.add(observacion(sensor, valor=None, calidad="FALTANTE"))
    sesion.flush()


def test_rechaza_calidad_desconocida(sesion, sensor):
    debe_rechazarse(sesion, observacion(sensor, calidad="DUDOSO"))


def test_rechaza_apto_con_inversion(sesion, estacion):
    debe_rechazarse(sesion, recomendacion(estacion, inversion_detectada=True))


def test_rechaza_apto_sin_dato_de_inversion(sesion, estacion):
    debe_rechazarse(sesion, recomendacion(estacion, inversion_detectada=None))


def test_acepta_precaucion_con_inversion(sesion, estacion):
    sesion.add(recomendacion(estacion, estado="PRECAUCION", inversion_detectada=True))
    sesion.flush()


def test_rechaza_indice_nulo_si_no_es_insuficiente(sesion, estacion):
    debe_rechazarse(sesion, recomendacion(estacion, indice=None))


def test_rechaza_insuficiente_con_indice(sesion, estacion):
    debe_rechazarse(
        sesion, recomendacion(estacion, estado="DATOS_INSUFICIENTES", inversion_detectada=None)
    )


def test_rechaza_indice_fuera_de_rango(sesion, estacion):
    debe_rechazarse(sesion, recomendacion(estacion, indice=Decimal("101")))


def test_rechaza_recomendacion_sin_motivos(sesion, estacion):
    debe_rechazarse(sesion, recomendacion(estacion, motivos=[]))


def test_rechaza_recomendacion_duplicada_para_una_medicion(sesion, estacion):
    sesion.add(recomendacion(estacion))
    sesion.flush()
    debe_rechazarse(sesion, recomendacion(estacion))


def test_una_nueva_version_del_metodo_no_reescribe_el_pasado(sesion, estacion):
    sesion.add_all(
        [recomendacion(estacion), recomendacion(estacion, version_metodo="TIS-2.0")]
    )
    sesion.flush()


def test_rechaza_email_con_mayusculas(sesion):
    debe_rechazarse(sesion, Usuario(email="A@b.example", nombre="N", password_hash="h"))


def test_rechaza_email_repetido(sesion, usuario):
    debe_rechazarse(sesion, Usuario(email=usuario.email, nombre="N", password_hash="h"))


def test_rechaza_latitud_fuera_de_rango(sesion):
    debe_rechazarse(
        sesion,
        Estacion(id_equipo_sat2=2, nombre="E", latitud=Decimal("91"), longitud=Decimal("0")),
    )


def test_rechaza_estacion_inactiva_sin_fecha(sesion):
    debe_rechazarse(
        sesion,
        Estacion(
            id_equipo_sat2=2, nombre="E", latitud=Decimal("0"), longitud=Decimal("0"), activa=False
        ),
    )


def test_rechaza_estacion_activa_con_fecha_de_inactividad(sesion):
    debe_rechazarse(
        sesion,
        Estacion(
            id_equipo_sat2=2,
            nombre="E",
            latitud=Decimal("0"),
            longitud=Decimal("0"),
            inactiva_desde=AHORA,
        ),
    )


def test_acepta_estacion_inactiva_con_fecha(sesion):
    registro = Estacion(
        id_equipo_sat2=2,
        nombre="E",
        latitud=Decimal("0"),
        longitud=Decimal("0"),
        activa=False,
        inactiva_desde=AHORA,
    )
    sesion.add(registro)
    sesion.flush()
    assert registro.id


def test_la_configuracion_de_la_base_admite_una_sola_fila(sesion):
    sesion.add(ConfiguracionBase(naturaleza="REAL"))
    sesion.flush()
    debe_rechazarse(sesion, ConfiguracionBase(id=2, naturaleza="REAL"))


def test_rechaza_naturaleza_desconocida(sesion):
    debe_rechazarse(sesion, ConfiguracionBase(naturaleza="MIXTA"))


def test_rechaza_magnitud_desconocida(sesion, estacion):
    debe_rechazarse(
        sesion,
        Sensor(
            estacion_id=estacion.id,
            id_sensor_sat2=99,
            nombre="Otro",
            clave_normalizada="otro",
            magnitud="OTRA",
            unidad="x",
        ),
    )


def test_rechaza_sensor_con_identificador_repetido(sesion, estacion, sensor):
    debe_rechazarse(
        sesion,
        Sensor(
            estacion_id=estacion.id,
            id_sensor_sat2=sensor.id_sensor_sat2,
            nombre="Otro",
            clave_normalizada="otro",
            magnitud="BATERIA",
            unidad="V",
        ),
    )


def test_borrar_un_usuario_quita_sus_asignaciones_y_sesiones(sesion, usuario, estacion):
    sesion.add_all(
        [
            UsuarioEstacion(usuario_id=usuario.id, estacion_id=estacion.id),
            Sesion(
                usuario_id=usuario.id,
                hash_identificador="a" * 64,
                vence_en=datetime.now(UTC) + timedelta(hours=8),
            ),
        ]
    )
    sesion.flush()

    sesion.execute(text("DELETE FROM usuario WHERE id = :id"), {"id": usuario.id})

    assert sesion.execute(text("SELECT count(*) FROM usuario_estacion")).scalar_one() == 0
    assert sesion.execute(text("SELECT count(*) FROM sesion")).scalar_one() == 0


def test_rechaza_sesion_que_vence_antes_de_crearse(sesion, usuario):
    debe_rechazarse(
        sesion,
        Sesion(
            usuario_id=usuario.id,
            hash_identificador="b" * 64,
            creada_en=AHORA,
            vence_en=AHORA - timedelta(hours=1),
        ),
    )


def test_rechaza_hash_de_sesion_repetido(sesion, usuario):
    vence = datetime.now(UTC) + timedelta(hours=8)
    sesion.add(Sesion(usuario_id=usuario.id, hash_identificador="c" * 64, vence_en=vence))
    sesion.flush()
    debe_rechazarse(
        sesion, Sesion(usuario_id=usuario.id, hash_identificador="c" * 64, vence_en=vence)
    )


def test_registra_intentos_de_acceso(sesion):
    sesion.add(IntentoAcceso(email="a@b.example"))
    sesion.flush()
    assert sesion.scalar(select(IntentoAcceso.ocurrido_en)) is not None


def test_ventana_solo_en_cargas(sesion, estacion):
    debe_rechazarse(
        sesion,
        EjecucionIngesta(
            estacion_id=estacion.id,
            tipo="CICLO",
            ventana_desde=AHORA,
            ventana_hasta=AHORA,
            resultado="EXITO",
        ),
    )
    sesion.add(
        EjecucionIngesta(
            estacion_id=estacion.id,
            tipo="CARGA_INICIAL",
            ventana_desde=AHORA - timedelta(days=31),
            ventana_hasta=AHORA,
            resultado="EN_CURSO",
        )
    )
    sesion.flush()


def test_rechaza_resultado_desconocido(sesion, estacion):
    debe_rechazarse(
        sesion, EjecucionIngesta(estacion_id=estacion.id, tipo="CICLO", resultado="OTRO")
    )


def test_los_nombres_de_restricciones_no_se_truncan(motor):
    with motor.connect() as conexion:
        nombres = conexion.execute(
            text("SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace")
        ).scalars().all()
    assert len(nombres) > 30
    assert all(len(nombre) < 63 for nombre in nombres)


def test_uuid_generado_por_el_modelo(sesion, usuario):
    assert isinstance(usuario.id, uuid.UUID)
