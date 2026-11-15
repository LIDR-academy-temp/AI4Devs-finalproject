"""Ninguna pila aislada del repositorio carga el `.env` real (weather-track-aislamiento-env).

El worker lee el archivo de `ARCHIVO_ENV`, o `.env` si no se fija. `--env-file` no alcanza: solo
cambia la interpolación de Compose, no lo que recibe el servicio.
"""

import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
# Lo que levanta una pila con nombre propio: `docker compose -p` o la misma lista de argumentos.
PILA_AISLADA = re.compile(r"""compose['"]?,?\s*['"]?-p\b""")
CARPETAS = ("backend/herramientas", "frontend/e2e")
GUIAS = ("docs/demo/verificacion-local.md",)


def archivos_con_pilas_aisladas() -> list[str]:
    encontrados = []
    for carpeta in CARPETAS:
        for archivo in sorted((RAIZ / carpeta).rglob("*")):
            if archivo.suffix in {".py", ".ts"} and PILA_AISLADA.search(archivo.read_text(encoding="utf-8")):
                encontrados.append(archivo.relative_to(RAIZ).as_posix())
    return encontrados + list(GUIAS)


def test_encuentra_las_pilas_conocidas():
    encontrados = archivos_con_pilas_aisladas()

    for conocido in (
        "frontend/e2e/pila.ts",
        "backend/herramientas/pruebas_negativas.py",
        "backend/herramientas/preparar_copia_de_prueba.py",
    ):
        assert conocido in encontrados


@pytest.mark.parametrize("ruta", archivos_con_pilas_aisladas())
def test_cada_pila_aislada_fija_su_archivo_de_variables(ruta):
    assert "ARCHIVO_ENV" in (RAIZ / ruta).read_text(encoding="utf-8"), (
        f"{ruta} levanta una pila aislada sin ARCHIVO_ENV: su worker cargaría el .env real"
    )


def test_el_worker_toma_la_ruta_de_la_variable():
    compose = (RAIZ / "docker-compose.yml").read_text(encoding="utf-8")

    assert "path: ${ARCHIVO_ENV:-.env}" in compose
