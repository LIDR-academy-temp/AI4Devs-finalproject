"""Contraseñas con Argon2id e identificadores opacos de sesión."""

import hashlib
import secrets
from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()


def calcular_hash_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(hash_guardado: str, contrasena: str) -> bool:
    try:
        return _hasher.verify(hash_guardado, contrasena)
    except (VerificationError, InvalidHashError):
        return False


@lru_cache
def _hash_ficticio() -> str:
    return _hasher.hash(secrets.token_urlsafe(16))


def simular_verificacion(contrasena: str) -> None:
    """Gasta el mismo tiempo que una verificación real.

    Sin esto, la demora revelaría si un correo tiene cuenta.
    """
    verificar_contrasena(_hash_ficticio(), contrasena)


def generar_contrasena() -> str:
    return secrets.token_urlsafe(12)


def generar_identificador_de_sesion() -> str:
    return secrets.token_urlsafe(32)


def hash_de_identificador(identificador: str) -> str:
    """SHA-256 alcanza: el identificador ya es aleatorio y largo."""
    return hashlib.sha256(identificador.encode()).hexdigest()
