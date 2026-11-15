"""El contrato que usa el frontend para generar sus tipos debe estar al día."""

from herramientas.exportar_openapi import RUTA_CONTRATO, contrato_serializado


def test_el_contrato_del_frontend_coincide_con_la_api():
    guardado = RUTA_CONTRATO.read_text(encoding="utf-8")
    assert guardado == contrato_serializado(), (
        "Ejecutar: python -m herramientas.exportar_openapi y, en frontend, npm run generar:tipos"
    )
