"""Los registros de la API no contienen códigos de un solo uso."""

import logging

from app.api import principal  # noqa: F401 - instala el filtro al cargar la API
from app.api.registros import OcultarCodigos, ocultar_codigos

CODIGO = "3q2-SecretoDeUnSoloUso_abc123"


def test_el_registro_de_accesos_de_uvicorn_no_muestra_el_codigo(caplog):
    with caplog.at_level(logging.INFO, logger="uvicorn.access"):
        # El mismo formato que usa uvicorn para cada pedido.
        logging.getLogger("uvicorn.access").info(
            '%s - "%s %s HTTP/%s" %d',
            "172.18.0.5:41234",
            "POST",
            f"/api/v1/cuenta/baja-un-clic?codigo={CODIGO}",
            "1.1",
            200,
        )
    assert CODIGO not in caplog.text
    assert "/api/v1/cuenta/baja-un-clic?codigo=[oculto]" in caplog.text


def test_el_filtro_queda_instalado_una_sola_vez():
    filtros = [f for f in logging.getLogger("uvicorn.access").filters if isinstance(f, OcultarCodigos)]
    assert len(filtros) == 1


def test_oculta_el_codigo_en_cualquier_posicion_de_la_consulta():
    assert ocultar_codigos(f"/x?a=1&codigo={CODIGO}&b=2") == "/x?a=1&codigo=[oculto]&b=2"
    assert ocultar_codigos("/api/v1/estaciones/1/recomendacion") == "/api/v1/estaciones/1/recomendacion"
