"""Cifrado de una sola vía de la configuración de SAT2 (D3 de weather-track-administracion-sat2).

La API cifra con la clave pública y no puede descifrar: solo el worker tiene la clave privada.
Usa `SealedBox` de libsodium (X25519 con XSalsa20-Poly1305), a través de PyNaCl.

Ningún mensaje de error incluye claves ni valores.
"""

import binascii
import json
import os
from base64 import b64decode, b64encode

from nacl.exceptions import CryptoError
from nacl.public import PrivateKey, PublicKey, SealedBox

VARIABLE_PUBLICA = "SAT2_CLAVE_PUBLICA"
VARIABLE_PRIVADA = "SAT2_CLAVE_PRIVADA"
CAMPOS = ("clave", "url_base", "usuario")


class ClaveAusente(Exception):
    """Falta la variable de entorno con la clave. El mensaje solo la nombra."""


class ClaveInvalida(Exception):
    """La clave no tiene el formato esperado."""


class ConfiguracionIlegible(Exception):
    """El contenido no se abre con esta clave privada o fue alterado."""


def generar_par_de_claves() -> tuple[str, str]:
    """Devuelve la clave pública y la privada, en base64."""
    privada = PrivateKey.generate()
    return b64encode(bytes(privada.public_key)).decode(), b64encode(bytes(privada)).decode()


def _bytes_de_clave(texto: str) -> bytes:
    try:
        crudo = b64decode(texto.strip(), validate=True)
    except (binascii.Error, ValueError):
        raise ClaveInvalida("La clave no está en base64.") from None
    if len(crudo) != PublicKey.SIZE:
        raise ClaveInvalida(f"La clave debe tener {PublicKey.SIZE} bytes.")
    return crudo


def cifrar(configuracion: dict[str, str], clave_publica: str) -> bytes:
    publica = PublicKey(_bytes_de_clave(clave_publica))
    texto = json.dumps(configuracion, ensure_ascii=False, sort_keys=True)
    return SealedBox(publica).encrypt(texto.encode("utf-8"))


def descifrar(contenido: bytes, clave_privada: str) -> dict[str, str]:
    privada = PrivateKey(_bytes_de_clave(clave_privada))
    try:
        configuracion = json.loads(SealedBox(privada).decrypt(contenido).decode("utf-8"))
    except (CryptoError, UnicodeDecodeError, json.JSONDecodeError):
        raise ConfiguracionIlegible(
            "La configuración guardada no se puede descifrar con esta clave privada."
        ) from None
    if (
        not isinstance(configuracion, dict)
        or tuple(sorted(configuracion)) != CAMPOS
        or not all(isinstance(valor, str) for valor in configuracion.values())
    ):
        raise ConfiguracionIlegible("La configuración guardada no tiene los campos esperados.")
    return configuracion


def _del_entorno(variable: str) -> str:
    valor = os.environ.get(variable, "").strip()
    if not valor:
        raise ClaveAusente(f"Falta la variable {variable}.")
    return valor


def clave_publica_del_entorno() -> str:
    return _del_entorno(VARIABLE_PUBLICA)


def clave_privada_del_entorno() -> str:
    return _del_entorno(VARIABLE_PRIVADA)
