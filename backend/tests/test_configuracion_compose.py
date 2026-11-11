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
    # Valores ficticios con el formato de las claves de weather-track-administracion-sat2.
    "SAT2_CLAVE_PUBLICA": "clave-publica-ficticia",
    "SAT2_CLAVE_PRIVADA": "clave-privada-ficticia",
    "GRAFANA_CLAVE_ADMIN": "clave-grafana-ficticia",
    "ALERTAS_CORREO": "alertas@ejemplo.com",
}
SECRETAS = re.compile(
    r"^(nombreDeUsuario|clave|SAT2_URL_BASE|SAT2_CLAVE_PRIVADA|SMTP_.*|CORREO_REMITENTE)$"
)

pytestmark = pytest.mark.skipif(shutil.which("docker") is None, reason="Sin Docker")


def configuracion(tmp_path, variables, *archivos, perfiles=()):
    for nombre in ("docker-compose.yml", "docker-compose.prod.yml"):
        shutil.copy(RAIZ / nombre, tmp_path / nombre)
    archivo = tmp_path / "prueba.env"
    archivo.write_text("".join(f"{k}={v}\n" for k, v in variables.items()), encoding="utf-8")
    opciones = [arg for nombre in archivos for arg in ("-f", nombre)]
    opciones += [arg for perfil in perfiles for arg in ("--profile", perfil)]
    return subprocess.run(
        ["docker", "compose", "-p", "wt-config", "--env-file", str(archivo), *opciones,
         "config", "--format", "json"],
        cwd=tmp_path, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
    )


def servicios(tmp_path, *archivos, perfiles=()):
    resultado = configuracion(tmp_path, COMPLETAS, *archivos, perfiles=perfiles)
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
    assert variables_secretas({"environment": {"SAT2_CLAVE_PRIVADA": "x"}}) == {"SAT2_CLAVE_PRIVADA"}
    assert variables_secretas({"environment": {}, "env_file": [{"path": ".env"}]}) == {"env_file"}



@pytest.mark.parametrize("archivos", [LOCAL, PRODUCCION], ids=["local", "produccion"])
def test_la_api_recibe_solo_la_clave_publica_de_sat2(tmp_path, archivos):
    """La API cifra la configuración de SAT2 pero no puede descifrarla (D3)."""
    entorno = servicios(tmp_path, *archivos)["api"]["environment"]
    assert entorno["SAT2_CLAVE_PUBLICA"] == "clave-publica-ficticia"
    assert "SAT2_CLAVE_PRIVADA" not in entorno

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



@pytest.mark.parametrize("archivos", [LOCAL, PRODUCCION], ids=["local", "produccion"])
def test_solo_el_worker_ve_el_disco_de_la_base_y_en_modo_solo_lectura(tmp_path, archivos):
    """Para medir el espacio libre (D2 de weather-track-monitoreo)."""
    todos = servicios(tmp_path, *archivos)
    [volumen] = [v for v in todos["worker"].get("volumes", []) if v["source"] == "datos_db"]
    assert volumen["target"] == "/datos_db"
    assert volumen["read_only"] is True
    assert not [v for v in todos["api"].get("volumes", []) if v.get("source") == "datos_db"]



# Perfil de monitoreo (weather-track-monitoreo, D6)

MONITOREO = ("monitoreo",)


@pytest.mark.parametrize("archivos", [LOCAL, PRODUCCION], ids=["local", "produccion"])
def test_sin_el_perfil_no_se_levantan_prometheus_ni_grafana(tmp_path, archivos):
    todos = servicios(tmp_path, *archivos)
    assert "prometheus" not in todos
    assert "grafana" not in todos


@pytest.mark.parametrize("archivos", [LOCAL, PRODUCCION], ids=["local", "produccion"])
def test_grafana_solo_escucha_en_esta_computadora(tmp_path, archivos):
    [puerto] = servicios(tmp_path, *archivos, perfiles=MONITOREO)["grafana"]["ports"]
    assert puerto["host_ip"] == "127.0.0.1"


def test_prometheus_y_las_metricas_del_worker_no_se_publican(tmp_path):
    todos = servicios(tmp_path, *LOCAL, perfiles=MONITOREO)
    assert not todos["prometheus"].get("ports")
    assert not todos["worker"].get("ports")


def test_grafana_exige_contrasena_y_no_admite_registro_ni_anonimos(tmp_path):
    grafana = servicios(tmp_path, *LOCAL, perfiles=MONITOREO)["grafana"]
    entorno = grafana["environment"]
    assert entorno["GF_SECURITY_ADMIN_PASSWORD"] == "clave-grafana-ficticia"
    assert entorno["GF_USERS_ALLOW_SIGN_UP"] == "false"
    assert entorno["GF_AUTH_ANONYMOUS_ENABLED"] == "false"
    assert entorno["GF_ANALYTICS_REPORTING_ENABLED"] == "false"
    # Sin contraseña no arranca: Grafana usaría admin/admin.
    assert "GF_SECURITY_ADMIN_PASSWORD" in " ".join(grafana["entrypoint"])


def test_grafana_no_recibe_credenciales_de_sat2(tmp_path):
    grafana = servicios(tmp_path, *LOCAL, perfiles=MONITOREO)["grafana"]
    assert not grafana.get("env_file")
    assert not {"nombreDeUsuario", "clave", "SAT2_URL_BASE", "SAT2_CLAVE_PRIVADA"} & set(grafana["environment"])


@pytest.mark.parametrize("servicio", ["prometheus", "grafana"])
def test_las_imagenes_del_monitoreo_tienen_version_fija(tmp_path, servicio):
    imagen = servicios(tmp_path, *LOCAL, perfiles=MONITOREO)[servicio]["image"]
    assert re.fullmatch(r"[a-z/]+:v?\d+\.\d+\.\d+", imagen), imagen
