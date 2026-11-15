"""Confirma la regla del ADR-0001: el dominio no depende de ninguna otra capa."""

import ast
from pathlib import Path

CARPETA_DOMINIO = Path(__file__).parent.parent / "app" / "dominio"
CAPAS_PROHIBIDAS = ("app.api", "app.ingesta", "app.datos")


def importaciones_prohibidas(codigo: str) -> list[str]:
    encontradas = []
    for nodo in ast.walk(ast.parse(codigo)):
        if isinstance(nodo, ast.Import):
            modulos = [alias.name for alias in nodo.names]
        elif isinstance(nodo, ast.ImportFrom):
            # Una importación relativa de nivel 2 o más sale del paquete dominio.
            if nodo.level >= 2:
                encontradas.append("." * nodo.level + (nodo.module or ""))
                continue
            modulos = [nodo.module or ""] if nodo.level == 0 else []
            if nodo.module == "app":
                modulos = [f"app.{alias.name}" for alias in nodo.names]
        else:
            continue
        for modulo in modulos:
            if modulo.startswith(CAPAS_PROHIBIDAS):
                encontradas.append(modulo)
    return encontradas


def test_el_dominio_no_importa_otras_capas():
    infracciones = {
        str(archivo): importaciones_prohibidas(archivo.read_text(encoding="utf-8"))
        for archivo in CARPETA_DOMINIO.rglob("*.py")
    }
    assert not {k: v for k, v in infracciones.items() if v}


def test_la_regla_detecta_importaciones_prohibidas():
    assert importaciones_prohibidas("import app.api.principal") == ["app.api.principal"]
    assert importaciones_prohibidas("from app.ingesta.worker import principal") == [
        "app.ingesta.worker"
    ]
    assert importaciones_prohibidas("from app import datos") == ["app.datos"]
    assert importaciones_prohibidas("from ..datos import conexion") == ["..datos"]


def test_la_regla_permite_importaciones_validas():
    assert importaciones_prohibidas("import math") == []
    assert importaciones_prohibidas("from app.dominio.tis import calcular") == []
    assert importaciones_prohibidas("from . import reglas") == []
