"""Reglas puras para identificar sensores a partir de su nombre."""

import re
import unicodedata
from decimal import Decimal


class SensorNoClasificable(ValueError):
    """El nombre no corresponde a ninguna magnitud conocida."""


# El orden importa: "humedad de hoja" debe evaluarse antes que "hum".
_MAGNITUD_POR_PREFIJO = (
    ("temp", "TEMPERATURA"),
    ("humedad de hoja", "MOJADO_FOLIAR"),
    ("hum", "HUMEDAD_RELATIVA"),
    ("anemometro", "VIENTO_VELOCIDAD"),
    ("veleta", "VIENTO_DIRECCION"),
    ("rad", "RADIACION"),
    ("pres", "PRESION"),
    ("pluviometro", "PRECIPITACION"),
    ("bateria", "BATERIA"),
)


def normalizar_nombre(nombre: str) -> str:
    """Minúsculas, sin tildes y con espacios y puntos colapsados."""
    sin_tildes = "".join(
        caracter
        for caracter in unicodedata.normalize("NFD", nombre)
        if unicodedata.category(caracter) != "Mn"
    )
    return " ".join(sin_tildes.lower().replace(".", " ").split())


def clasificar_magnitud(nombre: str) -> str:
    clave = normalizar_nombre(nombre)
    for prefijo, magnitud in _MAGNITUD_POR_PREFIJO:
        if clave.startswith(prefijo):
            return magnitud
    raise SensorNoClasificable(nombre)


def leer_altura_m(nombre: str) -> Decimal | None:
    coincidencia = re.search(r" a ([0-9]+) mts$", normalizar_nombre(nombre))
    return Decimal(coincidencia.group(1)) if coincidencia else None
