"""Registros sin códigos de un solo uso (D6 de weather-track-registro-cuentas).

La baja en un clic de `List-Unsubscribe` es el único pedido que lleva un código en la dirección:
el registro de accesos de uvicorn la escribiría completa.
"""

import logging
import re

CODIGO = re.compile(r"([?&]codigo=)[^&\s\"]+")
OCULTO = r"\1[oculto]"


def ocultar_codigos(texto: str) -> str:
    return CODIGO.sub(OCULTO, texto)


class OcultarCodigos(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = ocultar_codigos(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(ocultar_codigos(a) if isinstance(a, str) else a for a in record.args)
        return True


def instalar_filtro_de_codigos() -> None:
    registro = logging.getLogger("uvicorn.access")
    if not any(isinstance(f, OcultarCodigos) for f in registro.filters):
        registro.addFilter(OcultarCodigos())
