import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import IntegrityError

from app.datos.modelos import (
    AlertaSistema,
    Base,
    CambioConfiguracionSat2,
    ConfiguracionBase,
    ConfiguracionSat2,
    CorreoSaliente,
    EjecucionIngesta,
    EnlaceCuenta,
    Estacion,
    IntentoAcceso,
    LimiteIp,
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
    "enlace_cuenta",
    "correo_saliente",
    "limite_ip",
    "configuracion_sat2",
    "cambio_configuracion_sat2",
    "alerta_sistema",
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
    with pytest.raises(IntegrityError), sesion.begin_nested():
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


def test_la_migracion_0003_confirma_las_cuentas_existentes_y_se_revierte(motor):
    configuracion = configuracion_alembic()
    command.downgrade(configuracion, "0002")
    try:
        with motor.begin() as conexion:
            conexion.execute(
                text(
                    "INSERT INTO usuario (id, email, nombre, password_hash, creado_en) "
                    "VALUES (gen_random_uuid(), 'antigua@ejemplo.com', 'Antigua', 'h', "
                    "'2026-11-01 10:00+00')"
                )
            )

        command.upgrade(configuracion, "head")
        with motor.connect() as conexion:
            confirmado, creado, novedades = conexion.execute(
                text(
                    "SELECT confirmado_en, creado_en, acepta_novedades FROM usuario "
                    "WHERE email = 'antigua@ejemplo.com'"
                )
            ).one()
        assert confirmado == creado
        assert novedades is False

        command.downgrade(configuracion, "0002")
        with motor.connect() as conexion:
            assert conexion.execute(
                text("SELECT count(*) FROM usuario WHERE email = 'antigua@ejemplo.com'")
            ).scalar() == 1
    finally:
        command.upgrade(configuracion, "head")
        with motor.begin() as conexion:
            conexion.execute(text("DELETE FROM usuario WHERE email = 'antigua@ejemplo.com'"))



def test_la_migracion_0004_no_hace_administradora_a_ninguna_cuenta_y_se_revierte(motor):
    configuracion = configuracion_alembic()
    command.downgrade(configuracion, "0003")
    try:
        with motor.begin() as conexion:
            conexion.execute(
                text(
                    "INSERT INTO usuario (id, email, nombre, password_hash) "
                    "VALUES (gen_random_uuid(), 'previa@ejemplo.com', 'Previa', 'h')"
                )
            )

        command.upgrade(configuracion, "head")
        with motor.begin() as conexion:
            assert conexion.execute(
                text("SELECT es_administrador FROM usuario WHERE email = 'previa@ejemplo.com'")
            ).scalar() is False
            conexion.execute(
                text(
                    "INSERT INTO configuracion_sat2 (id, contenido_cifrado, cargada_en) "
                    "VALUES (1, decode('00', 'hex'), now())"
                )
            )

        command.downgrade(configuracion, "0003")
        tablas = set(inspect(motor).get_table_names())
        assert not {"configuracion_sat2", "cambio_configuracion_sat2"} & tablas
        columnas = {columna["name"] for columna in inspect(motor).get_columns("usuario")}
        assert "es_administrador" not in columnas
        with motor.connect() as conexion:
            assert conexion.execute(
                text("SELECT count(*) FROM usuario WHERE email = 'previa@ejemplo.com'")
            ).scalar() == 1
    finally:
        command.upgrade(configuracion, "head")
        with motor.begin() as conexion:
            conexion.execute(text("DELETE FROM configuracion_sat2"))
            conexion.execute(text("DELETE FROM usuario WHERE email = 'previa@ejemplo.com'"))


def test_una_cuenta_nueva_no_es_administradora(sesion, usuario):
    sesion.refresh(usuario)

    assert usuario.es_administrador is False


def test_la_configuracion_de_sat2_tiene_una_sola_fila(sesion):
    debe_rechazarse(sesion, ConfiguracionSat2(id=2, contenido_cifrado=b"x", cargada_en=AHORA))


def test_borrar_al_autor_conserva_la_configuracion_y_el_registro(sesion, usuario):
    sesion.add(
        ConfiguracionSat2(contenido_cifrado=b"x", cargada_en=AHORA, cargada_por=usuario.id)
    )
    sesion.add(
        CambioConfiguracionSat2(ocurrido_en=AHORA, usuario_id=usuario.id, email_usuario=usuario.email)
    )
    sesion.flush()

    sesion.delete(usuario)
    sesion.flush()
    sesion.expire_all()

    configuracion = sesion.get(ConfiguracionSat2, 1)
    cambio = sesion.scalar(select(CambioConfiguracionSat2))
    assert configuracion.cargada_por is None
    assert cambio.usuario_id is None
    assert cambio.email_usuario == "a@b.example"

def enlace(usuario, **cambios):
    datos = {
        "usuario_id": usuario.id,
        "proposito": "CONFIRMACION",
        "hash_codigo": "c" * 64,
        "creado_en": AHORA,
        "vence_en": AHORA + timedelta(hours=48),
    }
    return EnlaceCuenta(**{**datos, **cambios})


def test_borrar_una_cuenta_borra_sus_sesiones_y_enlaces(sesion, usuario):
    sesion.add_all(
        [
            Sesion(
                usuario_id=usuario.id,
                hash_identificador="s" * 64,
                creada_en=AHORA,
                vence_en=AHORA + timedelta(hours=8),
            ),
            enlace(usuario),
            enlace(usuario, proposito="BAJA", hash_codigo="b" * 64),
        ]
    )
    sesion.flush()

    sesion.execute(text("DELETE FROM usuario WHERE id = :id"), {"id": usuario.id})

    assert sesion.scalar(select(func.count()).select_from(Sesion)) == 0
    assert sesion.scalar(select(func.count()).select_from(EnlaceCuenta)) == 0


def test_rechaza_un_enlace_con_proposito_desconocido(sesion, usuario):
    debe_rechazarse(sesion, enlace(usuario, proposito="OTRO"))


def test_rechaza_un_enlace_que_vence_al_crearse(sesion, usuario):
    debe_rechazarse(sesion, enlace(usuario, vence_en=AHORA))


def test_rechaza_dos_enlaces_con_el_mismo_codigo(sesion, usuario):
    sesion.add(enlace(usuario))
    sesion.flush()
    debe_rechazarse(sesion, enlace(usuario, proposito="BAJA"))


def test_rechaza_intentos_negativos_en_la_bandeja(sesion):
    debe_rechazarse(
        sesion,
        CorreoSaliente(
            tipo="CONFIRMACION",
            destinatario="a@b.example",
            creado_en=AHORA,
            proximo_intento_en=AHORA,
            intentos=-1,
        ),
    )


def test_rechaza_un_contador_de_ip_en_cero(sesion):
    debe_rechazarse(sesion, LimiteIp(clave="registro:203.0.113.5", ventana_inicio=AHORA, cantidad=0))


def test_una_observacion_valida_se_guarda(sesion, sensor):
    sesion.add(observacion(sensor))
    sesion.flush()
    assert sesion.scalar(select(Observacion.valor)) == Decimal("20.3000")


def test_rechaza_dos_observaciones_del_mismo_sensor_e_instante(sesion, sensor):
    sesion.add(observacion(sensor))
    sesion.flush()
    sesion.expunge_all()
    with pytest.raises(IntegrityError), sesion.begin_nested():
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



def test_una_recuperacion_guarda_los_dias_que_pidio(sesion, estacion):
    sesion.add(
        EjecucionIngesta(
            estacion_id=estacion.id,
            tipo="RECUPERACION",
            ventana_desde=AHORA - timedelta(days=8),
            ventana_hasta=AHORA,
            resultado="EXITO",
        )
    )
    sesion.flush()


def test_la_migracion_0005_revierte_borrando_solo_las_recuperaciones(motor):
    configuracion = configuracion_alembic()
    try:
        with motor.begin() as conexion:
            estacion = conexion.execute(
                text(
                    "INSERT INTO estacion (id_equipo_sat2, nombre, latitud, longitud) "
                    "VALUES (905, 'Recuperada', -34, -60) RETURNING id"
                )
            ).scalar()
            conexion.execute(
                text(
                    "INSERT INTO ejecucion_ingesta (estacion_id, tipo, ventana_desde, ventana_hasta, "
                    "iniciada_en, resultado) VALUES "
                    "(:e, 'RECUPERACION', now() - interval '2 days', now(), now(), 'EXITO'), "
                    "(:e, 'CICLO', NULL, NULL, now(), 'EXITO')"
                ),
                {"e": estacion},
            )

        command.downgrade(configuracion, "0004")
        with motor.connect() as conexion:
            tipos = conexion.execute(
                text("SELECT tipo FROM ejecucion_ingesta WHERE estacion_id = :e"), {"e": estacion}
            ).scalars().all()
        assert tipos == ["CICLO"]
        with pytest.raises(IntegrityError), motor.begin() as conexion:
            conexion.execute(
                text(
                    "INSERT INTO ejecucion_ingesta (estacion_id, tipo, iniciada_en, resultado) "
                    "VALUES (:e, 'RECUPERACION', now(), 'EXITO')"
                ),
                {"e": estacion},
            )
    finally:
        command.upgrade(configuracion, "head")
        with motor.begin() as conexion:
            conexion.execute(
                text(
                    "DELETE FROM ejecucion_ingesta WHERE estacion_id IN "
                    "(SELECT id FROM estacion WHERE id_equipo_sat2 = 905)"
                )
            )
            conexion.execute(text("DELETE FROM estacion WHERE id_equipo_sat2 = 905"))


def alerta(**cambios):
    datos = {"tipo": "DATOS_VIEJOS", "objeto": "INTA Pergamino", "abierta_en": AHORA, "detalle": "x"}
    return AlertaSistema(**{**datos, **cambios})


def test_no_puede_haber_dos_alertas_abiertas_del_mismo_tipo_y_objeto(sesion):
    sesion.add(alerta())
    sesion.flush()

    debe_rechazarse(sesion, alerta())


def test_una_alerta_cerrada_no_impide_abrir_otra(sesion):
    sesion.add(alerta(cerrada_en=AHORA + timedelta(minutes=10)))
    sesion.add(alerta(abierta_en=AHORA + timedelta(minutes=20)))
    sesion.add(alerta(objeto="Otra estación"))
    sesion.add(alerta(tipo="DISCO_CASI_LLENO", objeto=""))
    sesion.flush()


def test_rechaza_una_alerta_de_tipo_desconocido(sesion):
    debe_rechazarse(sesion, alerta(tipo="OTRO"))


def test_rechaza_una_alerta_que_cierra_antes_de_abrir(sesion):
    debe_rechazarse(sesion, alerta(cerrada_en=AHORA - timedelta(minutes=1)))


def test_la_migracion_0006_se_revierte(motor):
    configuracion = configuracion_alembic()
    try:
        command.downgrade(configuracion, "0005")
        assert "alerta_sistema" not in set(inspect(motor).get_table_names())
    finally:
        command.upgrade(configuracion, "head")
    assert "alerta_sistema" in set(inspect(motor).get_table_names())

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
