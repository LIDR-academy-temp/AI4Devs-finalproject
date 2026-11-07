"""Configuración de Docker Compose, local y de producción.

- La API no recibe credenciales de SAT2 ni datos del servidor de correo (`sat2-ingestion` y D4 de
  weather-track-registro-cuentas).
- La producción exige sus variables y no incluye Mailpit (D5).
- La API no se publica y confía en `X-Forwarded-For` de Caddy (D9).

Usa `docker compose config`, que solo interpreta los archivos: no levanta nada. Trabaja sobre una
copia de los archivos de Compose en una carpeta temporal, así nunca lee el `.env` real, que tiene
credenciales. Si Docker no está disponible, las pruebas se saltean.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
COMPLETAS = {
    "POSTGRES_PASSWORD": "clave-de-prueba",
    "SAT2_MODO": "simulado",
    "DIRECCION_WEB": "weathertrack.ejemplo.com",
    "SMTP_HOST": "smtp.ejemplo.com",
    "SMTP_PUERTO": "587",
    "SMTP_USUARIO": "cuenta",
    "SMTP_CLAVE": "clave-smtp-de-prueba",
    "CORREO_REMITENTE": "Weather Track <no-responder@ejemplo.com>",
}
SECRETAS = re.compile(r"^(nombreDeUsuario|clave|SAT2_URL_BASE|SMTP_.*|CORREO_REMITENTE)$")

pytestmark = pytest.mark.skipif(shutil.which("docker") is None, reason="Sin Docker")


def configuracion(tmp_path, variables, *archivos):
    for nombre in ("docker-compose.yml", "docker-compose.prod.yml"):
        shutil.copy(RAIZ / nombre, tmp_path / nombre)
    archivo = tmp_path / "prueba.env"
    archivo.write_text("".join(f"{k}={v}\n" for k, v in variables.items()), encoding="utf-8")
    opciones = [arg for nombre in archivos for arg in ("-f", nombre)]
    return subprocess.run(
        ["docker", "compose", "-p", "wt-config", "--env-file", str(archivo), *opciones,
         "config", "--format", "json"],
        cwd=tmp_path, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
    )


def servicios(tmp_path, *archivos):
    resultado = configuracion(tmp_path, COMPLETAS, *archivos)
    assert resultado.returncode == 0, resultado.stderr
    return json.loads(resultado.stdout)["services"]


def variables_secretas(servicio: dict) -> set[str]:
    """Las variables del servicio que solo debe recibir el worker."""
    secretas = {nombre for nombre in servicio.get("environment") or {} if SECRETAS.match(nombre)}
    if servicio.get("env_file"):
        secretas.add("env_file")
    return secretas


LOCAL = ("docker-compose.yml",)
PRODUCCION = ("docker-compose.yml", "docker-compose.prod.yml")


@pytest.mark.parametrize("archivos", [LOCAL, PRODUCCION], ids=["local", "produccion"])
def test_la_api_no_recibe_credenciales_de_sat2_ni_del_correo(tmp_path, archivos):
    assert variables_secretas(servicios(tmp_path, *archivos)["api"]) == set()


def test_la_comprobacion_detecta_una_variable_secreta():
    assert variables_secretas({"environment": {"SMTP_CLAVE": "x", "SAT2_MODO": "real"}}) == {"SMTP_CLAVE"}
    assert variables_secretas({"environment": {"clave": "x"}}) == {"clave"}
    assert variables_secretas({"environment": {}, "env_file": [{"path": ".env"}]}) == {"env_file"}


@pytest.mark.parametrize("archivos", [LOCAL, PRODUCCION], ids=["local", "produccion"])
def test_la_api_no_se_publica_y_confia_en_el_proxy(tmp_path, archivos):
    api = servicios(tmp_path, *archivos)["api"]
    assert not api.get("ports")
    assert "--proxy-headers" in api["command"]
    assert "--forwarded-allow-ips=*" in api["command"]


@pytest.mark.parametrize(
    "variable", ["SMTP_HOST", "SMTP_PUERTO", "SMTP_USUARIO", "SMTP_CLAVE", "CORREO_REMITENTE"]
)
def test_sin_el_servidor_de_correo_la_produccion_no_arranca(tmp_path, variable):
    variables = {k: v for k, v in COMPLETAS.items() if k != variable}
    resultado = configuracion(tmp_path, variables, *PRODUCCION)
    assert resultado.returncode != 0
    assert f"Falta {variable}" in resultado.stderr


def test_la_produccion_no_levanta_mailpit_y_obliga_starttls(tmp_path):
    produccion = servicios(tmp_path, *PRODUCCION)
    assert "correo" not in produccion
    assert produccion["worker"]["environment"]["SMTP_STARTTLS"] == "true"
    assert produccion["api"]["environment"]["URL_PUBLICA"] == "https://weathertrack.ejemplo.com"


def test_en_local_mailpit_solo_escucha_en_esta_computadora(tmp_path):
    [puerto] = servicios(tmp_path, *LOCAL)["correo"]["ports"]
    assert puerto["host_ip"] == "127.0.0.1"
