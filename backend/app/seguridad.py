"""Hash de contraseñas con Argon2id."""

from argon2 import PasswordHasher

_hasher = PasswordHasher()


def calcular_hash_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)
