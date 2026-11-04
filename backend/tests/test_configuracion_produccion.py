"""La configuración de producción exige sus variables y no incluye Mailpit (D5 de registro-cuentas).

Usa `docker compose config`, que solo interpreta los archivos: no levanta nada. Trabaja sobre una
copia de los archivos de Compose en una carpeta temporal, así nunca lee el `.env` real, que tiene
credenciales. Si Docker no está disponible, las pruebas se saltean.
"""

import json
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

pytestmark = pytest.mark.skipif(shutil.which("docker") is None, reason="Sin Docker")


def configuracion(tmp_path, variables, *argumentos):
    for nombre in ("docker-compose.yml", "docker-compose.prod.yml"):
        shutil.copy(RAIZ / nombre, tmp_path / nombre)
    archivo = tmp_path / "prueba.env"
    archivo.write_text("".join(f"{k}={v}\n" for k, v in variables.items()), encoding="utf-8")
    return subprocess.run(
        [
            "docker", "compose", "-p", "wt-config", "--env-file", str(archivo),
            "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml", "config", *argumentos,
        ],
        cwd=tmp_path, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )


@pytest.mark.parametrize(
    "variable", ["SMTP_HOST", "SMTP_PUERTO", "SMTP_USUARIO", "SMTP_CLAVE", "CORREO_REMITENTE"]
)
def test_sin_el_servidor_de_correo_la_produccion_no_arranca(tmp_path, variable):
    variables = {k: v for k, v in COMPLETAS.items() if k != variable}
    resultado = configuracion(tmp_path, variables)
    assert resultado.returncode != 0
    assert f"Falta {variable}" in resultado.stderr


def test_la_produccion_no_levanta_mailpit_y_obliga_starttls(tmp_path):
    resultado = configuracion(tmp_path, COMPLETAS, "--format", "json")
    assert resultado.returncode == 0, resultado.stderr
    servicios = json.loads(resultado.stdout)["services"]

    assert "correo" not in servicios
    assert servicios["worker"]["environment"]["SMTP_STARTTLS"] == "true"
    assert servicios["api"]["environment"]["URL_PUBLICA"] == "https://weathertrack.ejemplo.com"


def test_la_api_no_recibe_los_datos_del_servidor_de_correo(tmp_path):
    resultado = configuracion(tmp_path, COMPLETAS, "--format", "json")
    assert resultado.returncode == 0, resultado.stderr
    entorno_api = json.loads(resultado.stdout)["services"]["api"]["environment"]
    assert not {k for k in entorno_api if k.startswith("SMTP_")}
    assert "CORREO_REMITENTE" not in entorno_api
