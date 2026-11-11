"""Configuración versionada de Prometheus y Grafana (D6 de weather-track-monitoreo).

Solo lee archivos: no levanta contenedores.
"""

import json
import re
from pathlib import Path

import yaml

from app.ingesta import worker
from app.monitoreo.metricas import NOMBRES

CARPETA = Path(__file__).resolve().parents[2] / "monitoreo"
PROVISION = CARPETA / "grafana" / "provisioning"
METRICA = re.compile(r"\b(weathertrack_[a-z0-9_]+|up)\b")


def test_prometheus_toma_las_metricas_del_puerto_interno_del_worker():
    configuracion = yaml.safe_load((CARPETA / "prometheus.yml").read_text(encoding="utf-8"))
    [trabajo] = configuracion["scrape_configs"]

    assert trabajo["job_name"] == "weathertrack-worker"
    assert trabajo["static_configs"][0]["targets"] == [f"worker:{worker.PUERTO_METRICAS}"]


def test_la_fuente_de_datos_tiene_el_uid_que_usan_el_tablero_y_la_alerta():
    fuentes = yaml.safe_load((PROVISION / "datasources" / "prometheus.yaml").read_text(encoding="utf-8"))
    [fuente] = fuentes["datasources"]

    assert (fuente["uid"], fuente["url"]) == ("prometheus", "http://prometheus:9090")


def test_el_tablero_solo_usa_metricas_que_existen():
    tablero = json.loads((CARPETA / "grafana" / "tableros" / "weather-track.json").read_text(encoding="utf-8"))
    consultas = [objetivo["expr"] for panel in tablero["panels"] for objetivo in panel["targets"]]

    assert tablero["uid"] == "weather-track"
    assert all(panel["datasource"]["uid"] == "prometheus" for panel in tablero["panels"])
    usadas = {nombre for expr in consultas for nombre in METRICA.findall(expr)}
    assert usadas - {"up"} <= set(NOMBRES)
    assert set(NOMBRES) <= usadas


def test_la_alerta_avisa_si_el_worker_no_publica_durante_5_minutos():
    alerta = yaml.safe_load((PROVISION / "alerting" / "worker-caido.yaml").read_text(encoding="utf-8"))
    [grupo] = alerta["groups"]
    [regla] = grupo["rules"]
    consulta = next(d for d in regla["data"] if d["refId"] == "A")

    assert regla["for"] == "5m"
    assert regla["noDataState"] == "Alerting"
    assert consulta["datasourceUid"] == "prometheus"
    assert 'up{job="weathertrack-worker"}' in consulta["model"]["expr"]
    [punto] = alerta["contactPoints"]
    assert punto["receivers"][0]["settings"]["addresses"] == "${ALERTAS_CORREO}"
    assert alerta["policies"][0]["receiver"] == punto["name"]
