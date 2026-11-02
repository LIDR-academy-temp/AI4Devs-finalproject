"""Endpoints de lectura contra PostgreSQL, y su contrato con la sección 4 del README."""

import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal as D
from pathlib import Path

import jsonschema
import pytest
import yaml
from fastapi.testclient import TestClient

from app.api.dependencias import obtener_ahora, obtener_sesion_bd, obtener_usuario_actual
from app.api.principal import app
from app.datos.modelos import (
    EjecucionIngesta,
    Estacion,
    Observacion,
    Recomendacion,
    Sensor,
    Usuario,
    UsuarioEstacion,
)
from app.dominio.vigencia import antiguedad_segundos, esta_vigente, estado_de_los_datos

AHORA = datetime(2026, 11, 2, 15, 0, tzinfo=UTC)
README = Path(__file__).parent.parent.parent / "readme.md"
AVISO = "Recomendación orientativa."


@pytest.fixture
def usuario(sesion):
    registro = Usuario(email="a@b.example", nombre="N", password_hash="h")
    sesion.add(registro)
    sesion.commit()
    return registro


@pytest.fixture
def cliente(sesion, usuario):
    app.dependency_overrides[obtener_sesion_bd] = lambda: sesion
    app.dependency_overrides[obtener_ahora] = lambda: AHORA
    app.dependency_overrides[obtener_usuario_actual] = lambda: usuario
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def estacion(sesion, usuario):
    registro = Estacion(
        id_equipo_sat2=1, nombre="Estación", latitud=D("-34"), longitud=D("-60")
    )
    sesion.add(registro)
    sesion.flush()
    sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=registro.id))
    sesion.commit()
    return registro


def crear_sensor(sesion, estacion, id_sat2=6, nombre="Temp Amb. a 2 Mts", **campos):
    datos = {
        "magnitud": "TEMPERATURA",
        "altura_m": D("2"),
        "unidad": "°C",
        "clave_normalizada": nombre.lower(),
    }
    registro = Sensor(
        estacion_id=estacion.id, id_sensor_sat2=id_sat2, nombre=nombre, **{**datos, **campos}
    )
    sesion.add(registro)
    sesion.commit()
    return registro


@pytest.fixture
def sensor(sesion, estacion):
    return crear_sensor(sesion, estacion)


def observar(sesion, sensor, medido_en, valor="20.5", calidad="OK", alarma=None):
    sesion.add(
        Observacion(
            sensor_id=sensor.id,
            medido_en=medido_en,
            valor=None if valor is None else D(valor),
            calidad=calidad,
            alarma=alarma,
            origen="INSTANTANEO",
        )
    )
    sesion.commit()


def recomendar(sesion, estacion, medido_en, **campos):
    datos = {
        "version_metodo": "TIS-1.1",
        "estado": "PRECAUCION",
        "indice": D("20"),
        "delta_t_c": D("0.9"),
        "inversion_detectada": True,
        "motivos": [{"codigo": "INVERSION_DETECTADA", "detalle": "Detalle."}],
    }
    sesion.add(
        Recomendacion(estacion_id=estacion.id, medido_en=medido_en, **{**datos, **campos})
    )
    sesion.commit()


def ruta(estacion, final):
    return f"/api/v1/estaciones/{estacion.id}/{final}"


def ejecucion(sesion, estacion, resultado, finalizada=AHORA, **campos):
    registro = EjecucionIngesta(
        estacion_id=estacion.id,
        tipo=campos.pop("tipo", "CICLO"),
        iniciada_en=AHORA,
        finalizada_en=finalizada,
        resultado=resultado,
        **campos,
    )
    sesion.add(registro)
    sesion.commit()


# Regla de vigencia


@pytest.mark.parametrize(
    ("minutos", "segundos", "vigente"),
    [(0, 0, True), (30, 0, True), (30, 1, False), (31, 0, False)],
)
def test_limites_de_vigencia(minutos, segundos, vigente):
    medido_en = AHORA - timedelta(minutes=minutos, seconds=segundos)
    assert esta_vigente(medido_en, AHORA) is vigente


def test_estado_de_los_datos():
    assert estado_de_los_datos(None, AHORA) == "SIN_DATOS"
    assert estado_de_los_datos(AHORA - timedelta(minutes=10), AHORA) == "VIGENTE"
    assert estado_de_los_datos(AHORA - timedelta(minutes=31), AHORA) == "DESACTUALIZADO"


def test_una_medicion_con_reloj_adelantado_no_da_antiguedad_negativa():
    assert antiguedad_segundos(AHORA + timedelta(minutes=1), AHORA) == 0


# Recomendación


def test_recomendacion_vigente(cliente, sesion, estacion):
    recomendar(sesion, estacion, AHORA - timedelta(minutes=4))

    datos = cliente.get(ruta(estacion, "recomendacion")).json()

    assert datos["estado"] == "PRECAUCION"
    assert datos["indice"] == 20
    assert datos["delta_t_c"] == 0.9
    assert datos["inversion_detectada"] is True
    assert datos["antiguedad_segundos"] == 240
    assert datos["medido_en"] == "2026-11-02T11:56:00-03:00"
    assert datos["version_metodo"] == "TIS-1.1"
    assert datos["aviso"].startswith(AVISO)
    assert datos["motivos"][0]["codigo"] == "INVERSION_DETECTADA"


def test_medicion_de_treinta_minutos_sigue_vigente(cliente, sesion, estacion):
    recomendar(sesion, estacion, AHORA - timedelta(minutes=30))
    assert cliente.get(ruta(estacion, "recomendacion")).json()["estado"] == "PRECAUCION"


def test_medicion_vieja_no_se_presenta_como_vigente(cliente, sesion, estacion):
    recomendar(
        sesion,
        estacion,
        AHORA - timedelta(minutes=31),
        estado="APTO",
        indice=D("7"),
        inversion_detectada=False,
        motivos=[{"codigo": "SIN_INVERSION", "detalle": "Detalle."}],
    )

    datos = cliente.get(ruta(estacion, "recomendacion")).json()

    assert datos["estado"] == "DATOS_INSUFICIENTES"
    assert datos["indice"] is None
    assert datos["delta_t_c"] is None
    assert datos["inversion_detectada"] is None
    assert [m["codigo"] for m in datos["motivos"]] == ["DATOS_DESACTUALIZADOS"]
    assert "31 minutos" in datos["motivos"][0]["detalle"]
    assert datos["antiguedad_segundos"] == 31 * 60
    assert datos["aviso"].startswith(AVISO)


def test_la_recomendacion_vieja_sigue_guardada_tal_como_se_calculo(cliente, sesion, estacion):
    recomendar(sesion, estacion, AHORA - timedelta(hours=2))
    cliente.get(ruta(estacion, "recomendacion"))
    assert sesion.query(Recomendacion).one().estado == "PRECAUCION"


def test_estacion_sin_mediciones(cliente, estacion):
    datos = cliente.get(ruta(estacion, "recomendacion")).json()
    assert datos["estado"] == "DATOS_INSUFICIENTES"
    assert datos["indice"] is None
    assert datos["medido_en"] is None
    assert datos["motivos"][0]["codigo"] == "SIN_MEDICIONES"
    assert datos["aviso"].startswith(AVISO)


def test_devuelve_la_recomendacion_mas_reciente(cliente, sesion, estacion):
    recomendar(sesion, estacion, AHORA - timedelta(minutes=20), indice=D("30"))
    recomendar(sesion, estacion, AHORA - timedelta(minutes=10), indice=D("35"))
    assert cliente.get(ruta(estacion, "recomendacion")).json()["indice"] == 35


# Condiciones actuales


def test_condiciones_con_datos_vigentes(cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=20), "10")
    observar(sesion, sensor, AHORA - timedelta(minutes=10), "21.5", alarma=True)
    ejecucion(sesion, estacion, "EXITO")

    datos = cliente.get(ruta(estacion, "condiciones-actuales")).json()

    assert datos["estado_datos"] == "VIGENTE"
    assert datos["antiguedad_segundos"] == 600
    assert datos["estacion_nombre"] == "Estación"
    assert datos["ultima_ingesta_exitosa_en"] == "2026-11-02T12:00:00-03:00"
    assert datos["ultima_ingesta_con_error"] is False
    assert datos["sensores"] == [
        {
            "sensor_id": sensor.id,
            "nombre": "Temp Amb. a 2 Mts",
            "magnitud": "TEMPERATURA",
            "altura_m": 2.0,
            "valor": 21.5,
            "unidad": "°C",
            "calidad": "OK",
            "alarma": True,
        }
    ]


def test_condiciones_con_datos_viejos(cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=31))
    datos = cliente.get(ruta(estacion, "condiciones-actuales")).json()
    assert datos["estado_datos"] == "DESACTUALIZADO"


def test_condiciones_sin_mediciones(cliente, estacion, sensor):
    datos = cliente.get(ruta(estacion, "condiciones-actuales")).json()
    assert datos["estado_datos"] == "SIN_DATOS"
    assert datos["medido_en"] is None
    assert datos["antiguedad_segundos"] is None
    assert datos["sensores"][0]["valor"] is None
    assert datos["sensores"][0]["calidad"] == "FALTANTE"


def test_sensor_faltante_aparece_sin_valor(cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=5), None, "FALTANTE")
    lectura = cliente.get(ruta(estacion, "condiciones-actuales")).json()["sensores"][0]
    assert lectura["valor"] is None
    assert lectura["calidad"] == "FALTANTE"


def test_lectura_sospechosa_conserva_el_valor(cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=5), "0", "SOSPECHOSO")
    lectura = cliente.get(ruta(estacion, "condiciones-actuales")).json()["sensores"][0]
    assert lectura["valor"] == 0
    assert lectura["calidad"] == "SOSPECHOSO"


def test_informa_la_falta_de_conexion_con_la_fuente(cliente, sesion, estacion, sensor):
    ejecucion(sesion, estacion, "EXITO", finalizada=AHORA - timedelta(minutes=20))
    ejecucion(sesion, estacion, "ERROR", finalizada=AHORA - timedelta(minutes=10))

    datos = cliente.get(ruta(estacion, "condiciones-actuales")).json()

    assert datos["ultima_ingesta_con_error"] is True
    assert datos["ultima_ingesta_exitosa_en"] == "2026-11-02T11:40:00-03:00"


def test_la_conexion_se_evalua_solo_con_ciclos_terminados(cliente, sesion, estacion, sensor):
    ejecucion(sesion, estacion, "EXITO")
    ejecucion(
        sesion,
        estacion,
        "ERROR",
        tipo="CARGA_INICIAL",
        ventana_desde=AHORA,
        ventana_hasta=AHORA,
    )
    ejecucion(sesion, estacion, "EN_CURSO", finalizada=None)
    datos = cliente.get(ruta(estacion, "condiciones-actuales")).json()
    assert datos["ultima_ingesta_con_error"] is False


def test_lista_todos_los_sensores_en_orden(cliente, sesion, estacion, sensor):
    otro = crear_sensor(
        sesion,
        estacion,
        id_sat2=9,
        nombre="Anemómetro",
        clave_normalizada="anemometro",
        magnitud="VIENTO_VELOCIDAD",
        altura_m=None,
        unidad="km/h",
    )
    observar(sesion, otro, AHORA - timedelta(minutes=5), "9")
    sensores = cliente.get(ruta(estacion, "condiciones-actuales")).json()["sensores"]
    assert [s["nombre"] for s in sensores] == ["Temp Amb. a 2 Mts", "Anemómetro"]
    assert sensores[1]["altura_m"] is None
    assert sensores[1]["unidad"] == "km/h"


# Históricos


def consultar_historico(cliente, estacion, sensor_id, desde, hasta):
    return cliente.get(
        ruta(estacion, f"sensores/{sensor_id}/historico"),
        params={"desde": desde.isoformat(), "hasta": hasta.isoformat()},
    )


def test_historico_en_orden_ascendente_con_resumen(cliente, sesion, estacion, sensor):
    for minutos, valor in ((30, "10"), (10, "30"), (20, "20")):
        observar(sesion, sensor, AHORA - timedelta(minutes=minutos), valor)

    respuesta = consultar_historico(
        cliente, estacion, sensor.id, AHORA - timedelta(hours=1), AHORA
    )

    datos = respuesta.json()
    assert respuesta.status_code == 200
    assert [p["valor"] for p in datos["puntos"]] == [10, 20, 30]
    assert datos["puntos"][0]["medido_en"] == "2026-11-02T11:30:00-03:00"
    assert datos["unidad"] == "°C"
    assert datos["resumen"] == {"maximo": 30, "minimo": 10, "promedio": 20, "cantidad": 3}


def test_el_rango_incluye_sus_extremos_y_nada_mas(cliente, sesion, estacion, sensor):
    desde = AHORA - timedelta(hours=1)
    for momento in (desde - timedelta(minutes=1), desde, AHORA, AHORA + timedelta(minutes=1)):
        observar(sesion, sensor, momento)
    datos = consultar_historico(cliente, estacion, sensor.id, desde, AHORA).json()
    assert len(datos["puntos"]) == 2


def test_el_resumen_excluye_faltantes_y_conserva_sospechosos(cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=30), None, "FALTANTE")
    observar(sesion, sensor, AHORA - timedelta(minutes=20), "10")
    observar(sesion, sensor, AHORA - timedelta(minutes=10), "50", "SOSPECHOSO")

    datos = consultar_historico(
        cliente, estacion, sensor.id, AHORA - timedelta(hours=1), AHORA
    ).json()

    assert datos["resumen"] == {"maximo": 50, "minimo": 10, "promedio": 30, "cantidad": 2}
    assert [p["calidad"] for p in datos["puntos"]] == ["FALTANTE", "OK", "SOSPECHOSO"]
    assert datos["puntos"][0]["valor"] is None
    assert datos["puntos"][2]["valor"] == 50


def test_periodo_sin_lecturas_validas(cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=10), None, "FALTANTE")
    datos = consultar_historico(
        cliente, estacion, sensor.id, AHORA - timedelta(hours=1), AHORA
    ).json()
    assert datos["resumen"] == {"maximo": None, "minimo": None, "promedio": None, "cantidad": 0}


def test_acepta_exactamente_31_dias(cliente, estacion, sensor):
    respuesta = consultar_historico(
        cliente, estacion, sensor.id, AHORA - timedelta(days=31), AHORA
    )
    assert respuesta.status_code == 200


@pytest.mark.parametrize(
    ("desde", "hasta"),
    [
        (AHORA - timedelta(days=31, seconds=1), AHORA),
        (AHORA, AHORA - timedelta(hours=1)),
        (AHORA, AHORA),
    ],
)
def test_rango_invalido(cliente, estacion, sensor, desde, hasta):
    respuesta = consultar_historico(cliente, estacion, sensor.id, desde, hasta)
    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "RANGO_INVALIDO"


def test_fecha_sin_zona_horaria_se_rechaza(cliente, estacion, sensor):
    respuesta = cliente.get(
        ruta(estacion, f"sensores/{sensor.id}/historico"),
        params={"desde": "2026-11-01T00:00:00", "hasta": "2026-11-02T00:00:00"},
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "SOLICITUD_INVALIDA"


def test_sensor_de_otra_estacion_responde_404(cliente, sesion, estacion):
    otra = Estacion(id_equipo_sat2=2, nombre="Otra", latitud=D("0"), longitud=D("0"))
    sesion.add(otra)
    sesion.commit()
    ajeno = crear_sensor(sesion, otra)
    respuesta = consultar_historico(
        cliente, estacion, ajeno.id, AHORA - timedelta(hours=1), AHORA
    )
    assert respuesta.status_code == 404


# Permisos


FINALES = ("recomendacion", "condiciones-actuales", "sensores/1/historico")
PARAMETROS = {"desde": AHORA.isoformat(), "hasta": (AHORA + timedelta(hours=1)).isoformat()}


@pytest.mark.parametrize("final", FINALES)
def test_estacion_ajena_responde_403(cliente, sesion, final):
    ajena = Estacion(id_equipo_sat2=9, nombre="Ajena", latitud=D("0"), longitud=D("0"))
    sesion.add(ajena)
    sesion.commit()
    respuesta = cliente.get(ruta(ajena, final), params=PARAMETROS)
    assert respuesta.status_code == 403
    assert "Ajena" not in respuesta.text


@pytest.mark.parametrize("final", FINALES)
def test_estacion_inexistente_responde_404(cliente, final):
    respuesta = cliente.get(f"/api/v1/estaciones/999999/{final}", params=PARAMETROS)
    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "NO_ENCONTRADO"


@pytest.mark.parametrize("final", FINALES)
def test_sin_sesion_responde_401(cliente, estacion, final):
    del app.dependency_overrides[obtener_usuario_actual]
    respuesta = cliente.get(ruta(estacion, final), params=PARAMETROS)
    assert respuesta.status_code == 401
    assert respuesta.json()["codigo"] == "NO_AUTENTICADO"


# Contrato con el README


@pytest.fixture(scope="module")
def contrato():
    texto = README.read_text(encoding="utf-8")
    bloque = re.search(r"```yaml\n(openapi:.*?)```", texto, re.S).group(1)
    return yaml.safe_load(bloque)


def admitir_nulos(nodo):
    """OpenAPI 3.0 usa `nullable`; jsonschema necesita el tipo null explícito."""
    if isinstance(nodo, list):
        return [admitir_nulos(elemento) for elemento in nodo]
    if not isinstance(nodo, dict):
        return nodo
    salida = {clave: admitir_nulos(valor) for clave, valor in nodo.items()}
    if salida.pop("nullable", False):
        salida["type"] = [salida["type"], "null"]
    return salida


def validar(contrato, esquema, datos):
    componentes = admitir_nulos(contrato["components"])
    jsonschema.validate(
        datos, {"$ref": f"#/components/schemas/{esquema}", "components": componentes}
    )


def test_las_rutas_coinciden_con_el_contrato(contrato):
    generadas = app.openapi()["paths"]
    for ruta_contrato, operaciones in contrato["paths"].items():
        generada = generadas[f"/api/v1{ruta_contrato}"]
        assert generada["get"]["operationId"] == operaciones["get"]["operationId"]


@pytest.mark.parametrize(
    "esquema",
    ["Recomendacion", "CondicionesActuales", "Historico", "LecturaSensor", "Punto", "Resumen", "Motivo"],
)
def test_los_campos_coinciden_con_el_contrato(contrato, esquema):
    del_contrato = contrato["components"]["schemas"][esquema]
    generado = app.openapi()["components"]["schemas"][esquema]
    assert set(generado["properties"]) == set(del_contrato["properties"])
    assert set(del_contrato["required"]) <= set(generado["required"])


def test_los_codigos_de_motivo_del_motor_estan_en_el_contrato(contrato):
    from app.dominio import motor_tis

    declarados = set(contrato["components"]["schemas"]["Motivo"]["properties"]["codigo"]["enum"])
    usados = {valor for nombre, valor in vars(motor_tis).items() if nombre.startswith("MOTIVO_")}
    assert usados == declarados


def test_las_respuestas_validan_contra_el_contrato(contrato, cliente, sesion, estacion, sensor):
    observar(sesion, sensor, AHORA - timedelta(minutes=5), alarma=False)
    observar(sesion, sensor, AHORA - timedelta(minutes=15), None, "FALTANTE")
    recomendar(sesion, estacion, AHORA - timedelta(minutes=5))
    ejecucion(sesion, estacion, "EXITO")

    validar(contrato, "Recomendacion", cliente.get(ruta(estacion, "recomendacion")).json())
    validar(
        contrato,
        "CondicionesActuales",
        cliente.get(ruta(estacion, "condiciones-actuales")).json(),
    )
    validar(
        contrato,
        "Historico",
        consultar_historico(cliente, estacion, sensor.id, AHORA - timedelta(hours=1), AHORA).json(),
    )


def test_las_respuestas_sin_datos_validan_contra_el_contrato(contrato, cliente, estacion, sensor):
    validar(contrato, "Recomendacion", cliente.get(ruta(estacion, "recomendacion")).json())
    validar(
        contrato,
        "CondicionesActuales",
        cliente.get(ruta(estacion, "condiciones-actuales")).json(),
    )


def test_los_errores_validan_contra_el_contrato(contrato, cliente):
    respuesta = cliente.get("/api/v1/estaciones/999999/recomendacion")
    validar(contrato, "Error", respuesta.json())
