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


# Unidades de Weather Track para las magnitudes que usa el índice. Sus umbrales las
# suponen, así que un valor en otra unidad no se puede usar.
UNIDADES_DEL_INDICE = {
    "TEMPERATURA": "°C",
    "HUMEDAD_RELATIVA": "%",
    "VIENTO_VELOCIDAD": "km/h",
    "RADIACION": "W/m²",
}

_UNIDAD_CANONICA = {
    "ºc": "°C",
    "°c": "°C",
    "km/h": "km/h",
    "kmh": "km/h",
    "w/m2": "W/m²",
    "w/m²": "W/m²",
}


def normalizar_unidad(unidad: str) -> str:
    """Unifica las variantes de la fuente, como `km/H` o `ºC`. No convierte valores."""
    limpia = unidad.strip()
    return _UNIDAD_CANONICA.get(limpia.lower(), limpia)


def unidad_admitida(magnitud: str, unidad: str) -> bool:
    esperada = UNIDADES_DEL_INDICE.get(magnitud)
    return esperada is None or normalizar_unidad(unidad) == esperada


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
