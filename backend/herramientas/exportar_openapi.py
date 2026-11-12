"""Exporta el contrato de la API para generar los tipos del frontend.

Uso, desde la carpeta backend:
    python -m herramientas.exportar_openapi
"""

import json
from pathlib import Path

from app.api.principal import app

RUTA_CONTRATO = Path(__file__).resolve().parent.parent.parent / "frontend" / "openapi.json"


def contrato_serializado() -> str:
    return json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


if __name__ == "__main__":
    RUTA_CONTRATO.write_text(contrato_serializado(), encoding="utf-8", newline="\n")
    print(f"Contrato exportado en {RUTA_CONTRATO}")
