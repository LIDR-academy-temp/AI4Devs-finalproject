"""Lectura de la configuración de SAT2 desde un archivo .env o el entorno."""

import os
from dataclasses import dataclass, field
from pathlib import Path

VARIABLES_REQUERIDAS = ("nombreDeUsuario", "clave", "SAT2_URL_BASE")


class ConfiguracionIncompleta(Exception):
    """Faltan variables. El mensaje solo nombra las variables, nunca sus valores."""


@dataclass(frozen=True)
class ConfiguracionSat2:
    url_base: str
    usuario: str = field(repr=False)
    clave: str = field(repr=False)


def leer_archivo_env(ruta: Path) -> dict[str, str]:
    """Interpreta líneas CLAVE=valor e ignora comentarios y líneas vacías."""
    variables: dict[str, str] = {}
    if not ruta.is_file():
        return variables
    for linea in ruta.read_text(encoding="utf-8-sig").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        nombre, valor = linea.split("=", 1)
        variables[nombre.strip()] = valor.strip().strip("'\"")
    return variables


def cargar_configuracion(ruta_env: Path) -> ConfiguracionSat2:
    """El entorno del proceso tiene prioridad sobre el archivo .env."""
    variables = {**leer_archivo_env(ruta_env), **os.environ}
    faltantes = [n for n in VARIABLES_REQUERIDAS if not variables.get(n)]
    if faltantes:
        raise ConfiguracionIncompleta("Faltan variables: " + ", ".join(faltantes))
    return ConfiguracionSat2(
        url_base=variables["SAT2_URL_BASE"].rstrip("/"),
        usuario=variables["nombreDeUsuario"],
        clave=variables["clave"],
    )
