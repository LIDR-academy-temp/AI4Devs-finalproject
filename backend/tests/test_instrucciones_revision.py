"""Las instrucciones de revisión de Copilot apuntan a archivos reales (ai-code-review)."""

import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent.parent
CARPETA = RAIZ / ".github" / "instructions"
ZONAS = {
    "dominio": "backend/app/dominio/**",
    "migraciones": "backend/migraciones/**",
    "flujos": ".github/workflows/**",
    "api": "backend/app/api/**",
    "frontend": "frontend/src/**",
}


def apply_to(ruta: Path) -> str:
    coincidencia = re.match(r'---\napplyTo: "([^"]+)"\n---\n', ruta.read_text(encoding="utf-8"))
    assert coincidencia, f"{ruta.name} debe empezar con el campo applyTo"
    return coincidencia.group(1)


def test_hay_instrucciones_para_cada_zona():
    assert sorted(r.name for r in CARPETA.glob("*.instructions.md")) == sorted(
        f"{zona}.instructions.md" for zona in ZONAS
    )


@pytest.mark.parametrize(("zona", "patron"), ZONAS.items())
def test_cada_zona_apunta_a_archivos_reales(zona, patron):
    assert apply_to(CARPETA / f"{zona}.instructions.md") == patron
    archivos = [r for r in RAIZ.glob(patron.removesuffix("**") + "**/*") if r.is_file()]
    assert archivos, f"{patron} no coincide con ningún archivo"

