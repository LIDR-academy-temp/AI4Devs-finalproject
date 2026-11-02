"""Datos ficticios de demostración. Ejecutarlo más de una vez no duplica nada.

Solo funciona en modo simulado, para no mezclar datos ficticios con los reales.
"""

import os
import secrets
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.conexion import obtener_motor
from app.datos.modelos import Estacion, Usuario, UsuarioEstacion
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.seguridad import calcular_hash_contrasena

EMAIL_DEMO = "demo@weathertrack.example"
NOMBRE_DEMO = "Usuario de demostración"


def _asegurar_usuario(sesion: Session, estacion: Estacion) -> str | None:
    """Devuelve la clave generada, solo si el usuario se creó en esta ejecución."""
    usuario = sesion.scalar(select(Usuario).where(Usuario.email == EMAIL_DEMO))
    clave_generada = None
    if usuario is None:
        clave_generada = secrets.token_urlsafe(12)
        usuario = Usuario(
            email=EMAIL_DEMO,
            nombre=NOMBRE_DEMO,
            password_hash=calcular_hash_contrasena(clave_generada),
        )
        sesion.add(usuario)
        sesion.flush()
    if sesion.get(UsuarioEstacion, (usuario.id, estacion.id)) is None:
        sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=estacion.id))
    return clave_generada


def cargar_semillas(sesion: Session) -> str | None:
    estacion = sincronizar_catalogo(sesion, ClienteSat2Simulado())[0]
    return _asegurar_usuario(sesion, estacion)


def principal() -> int:
    if os.environ.get("SAT2_MODO", "simulado") != "simulado":
        print("Las semillas solo se pueden cargar en modo simulado.", file=sys.stderr)
        return 2
    with Session(obtener_motor()) as sesion:
        clave = cargar_semillas(sesion)
        sesion.commit()
    print(f"Semillas cargadas. Usuario de demostración: {EMAIL_DEMO}")
    if clave:
        # Es aleatoria y se muestra una sola vez: los datos son ficticios y locales.
        print(f"Clave generada: {clave}")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
