"""Política de contraseñas (D8 de weather-track-registro-cuentas).

Entre 15 y 128 caracteres, sin reglas de composición, como pide NIST SP 800-63B-4 cuando la
contraseña es el único factor. Se rechazan las comunes y las que contienen el correo.
"""

import unicodedata
from functools import cache
from pathlib import Path

MINIMO = 15
MAXIMO = 128
LISTA = Path(__file__).parent / "contrasenas_comunes.txt"


class ContrasenaRechazada(Exception):
    """El mensaje se muestra tal cual a la persona. Nunca revela la lista."""


def normalizar(contrasena: str) -> str:
    """El largo se cuenta en Unicode normalizado: la misma letra escrita de dos formas vale igual."""
    return unicodedata.normalize("NFKC", contrasena)


@cache
def contrasenas_comunes() -> frozenset[str]:
    lineas = LISTA.read_text(encoding="utf-8").splitlines()
    return frozenset(l for l in lineas if l and not l.startswith("#"))


def validar_contrasena(contrasena: str, email: str) -> None:
    normal = normalizar(contrasena)
    if len(normal) < MINIMO:
        raise ContrasenaRechazada(
            f"La contraseña debe tener al menos {MINIMO} caracteres. Una frase de varias palabras sirve."
        )
    if len(normal) > MAXIMO:
        raise ContrasenaRechazada(f"La contraseña puede tener como máximo {MAXIMO} caracteres.")
    minusculas = normal.lower()
    if minusculas in contrasenas_comunes():
        raise ContrasenaRechazada("Esa contraseña es demasiado común. Elija otra.")
    correo = email.strip().lower()
    local = correo.split("@")[0]
    if correo and (correo in minusculas or (len(local) >= 3 and local in minusculas)):
        raise ContrasenaRechazada("La contraseña no puede contener su correo.")
