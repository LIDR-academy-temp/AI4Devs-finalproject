"""Las respuestas reales de SAT2, saneadas, pasan por el catálogo, el ciclo y la carga reales.

Escenarios de `sat2-contract` (weather-track-contrato-sat2). Las respuestas las capturó el
responsable con `herramientas.capturar_sat2`; estas pruebas nunca consultan SAT2.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import func, select

from app.datos.modelos import ESTADOS_RECOMENDACION, MAGNITUDES, Observacion, Recomendacion, Sensor
from app.dominio.catalogo import unidad_admitida
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.ingesta.carga_inicial import ejecutar_carga_inicial
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.ciclo import ejecutar_ciclo
from herramientas.capturar_sat2 import (
    EQUIPOS,
    HISTORICOS,
    INSTANTANEOS,
    RUTA_FORMA,
    forma_de_captura,
)

RUTA = Path(__file__).parent / "datos_sat2" / "respuestas.json"
CAPTURA = json.loads(RUTA.read_text(encoding="utf-8"))
RESPUESTAS = CAPTURA["respuestas"]

URL = re.compile(r"https?://|www\.", re.IGNORECASE)
CORREO = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
TOKEN = re.compile(r"^[A-Za-z0-9._\-+/=]{24,}$")
CLAVE_SENSIBLE = re.compile(r"token|clave|password|usuario|cliente|mail|correo|serie", re.IGNORECASE)


class SatGrabada:
    """Devuelve las respuestas capturadas, como lo haría SAT2."""

    def __init__(self):
        self.historicos = {item["idSensor"]: item["respuesta"] for item in RESPUESTAS[HISTORICOS]}

    def recuperar_equipos(self) -> list[dict[str, Any]]:
        return RESPUESTAS[EQUIPOS]

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        assert id_equipo == CAPTURA["equipo"]
        return RESPUESTAS[INSTANTANEOS]

    def recuperar_historicos(self, id_equipo, id_sensor, desde, hasta) -> list[dict[str, Any]]:
        return self.historicos.get(id_sensor, [])


@pytest.fixture
def estacion(sesion):
    [estacion] = sincronizar_catalogo(sesion, SatGrabada())
    sesion.commit()
    return estacion


# Sin secretos


def rutas_sospechosas(valor: Any, donde: str = "$") -> list[str]:
    """Solo rutas: el mensaje de error nunca muestra un valor."""
    if isinstance(valor, dict):
        encontradas = []
        for clave, interno in valor.items():
            destino = f"{donde}.{clave}"
            hoja = not isinstance(interno, dict | list)
            if CLAVE_SENSIBLE.search(clave) and hoja and interno not in (None, "<redactado>", 0):
                encontradas.append(destino)
            encontradas += rutas_sospechosas(interno, destino)
        return encontradas
    if isinstance(valor, list):
        return [r for n, interno in enumerate(valor) for r in rutas_sospechosas(interno, f"{donde}[{n}]")]
    if isinstance(valor, str) and (URL.search(valor) or CORREO.search(valor) or TOKEN.match(valor)):
        return [donde]
    return []


def test_las_respuestas_no_tienen_secretos():
    assert rutas_sospechosas(CAPTURA) == [], "Sanear de nuevo con herramientas.capturar_sat2"


def test_la_revision_de_secretos_nombra_la_ruta_sin_el_valor():
    sospechosas = rutas_sospechosas({"a": [{"descripcion": "ver https://ejemplo.invalid"}], "token": "x"})

    assert sospechosas == ["$.a[0].descripcion", "$.token"]


def test_la_forma_versionada_coincide_con_las_respuestas():
    referencia = json.loads(RUTA_FORMA.read_text(encoding="utf-8"))

    assert forma_de_captura(CAPTURA) == referencia, (
        "Regenerar herramientas/forma_sat2.json desde tests/datos_sat2/respuestas.json"
    )


# Catálogo


def test_el_catalogo_real_clasifica_todos_los_sensores(sesion, estacion):
    sensores = sesion.scalars(select(Sensor).where(Sensor.estacion_id == estacion.id)).all()
    del_equipo = next(e for e in RESPUESTAS[EQUIPOS] if e["idEquipo"] == CAPTURA["equipo"])

    assert estacion.id_equipo_sat2 == CAPTURA["equipo"]
    assert estacion.nombre == del_equipo["descripcion"]
    assert len(sensores) == len(del_equipo["sensores"])
    for sensor in sensores:
        assert sensor.magnitud in MAGNITUDES, sensor.nombre
        # Las magnitudes del índice deben llegar en la unidad que suponen sus umbrales.
        assert unidad_admitida(sensor.magnitud, sensor.unidad), f"{sensor.nombre}: {sensor.unidad}"


# Ciclo


def test_el_ciclo_con_los_instantaneos_reales_calcula_una_recomendacion(sesion, estacion):
    momento = datetime.strptime(
        RESPUESTAS[INSTANTANEOS]["fechaUltimaActualizacionDatos"], "%d/%m/%Y %H:%M:%S"
    ).replace(tzinfo=ZONA_ARGENTINA)

    ejecucion = ejecutar_ciclo(sesion, SatGrabada(), estacion, momento)

    assert ejecucion.resultado == "EXITO", ejecucion.detalle
    lecturas = sesion.scalar(
        select(func.count()).select_from(Observacion).where(Observacion.medido_en == momento)
    )
    assert lecturas == len(RESPUESTAS[INSTANTANEOS]["datosSensores"])
    recomendacion = sesion.scalar(select(Recomendacion).where(Recomendacion.estacion_id == estacion.id))
    assert recomendacion.estado in ESTADOS_RECOMENDACION


# Históricos


def test_la_carga_interpreta_todas_las_lecturas_del_dia(sesion, estacion):
    dia = datetime.fromisoformat(CAPTURA["dia_historicos"])
    ahora = datetime(dia.year, dia.month, dia.day, 23, 59, tzinfo=ZONA_ARGENTINA)

    ejecucion = ejecutar_carga_inicial(sesion, SatGrabada(), estacion, ahora, dias=1, dormir=lambda _s: None)

    registros = sum(len(item["respuesta"]) for item in RESPUESTAS[HISTORICOS])
    assert ejecucion.resultado == "EXITO", ejecucion.detalle
    assert ejecucion.lecturas_guardadas == registros
    por_sensor = dict(
        sesion.execute(
            select(Sensor.id_sensor_sat2, func.count(Observacion.medido_en))
            .join(Observacion)
            .group_by(Sensor.id_sensor_sat2)
        ).all()
    )
    assert por_sensor == {item["idSensor"]: len(item["respuesta"]) for item in RESPUESTAS[HISTORICOS]}
