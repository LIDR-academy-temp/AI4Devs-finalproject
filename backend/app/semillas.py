"""Datos ficticios de demostración. Ejecutarlo más de una vez no duplica nada.

Solo funciona en los modos con datos ficticios, para no mezclarlos con los reales. En modo
escenarios, el usuario ve una estación por cada caso, para mostrar todos los estados.
"""

import os
import secrets
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.conexion import obtener_motor
from app.datos.modelos import Estacion, Usuario, UsuarioEstacion
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.cliente_simulado import ClienteSat2Escenarios, ClienteSat2Simulado
from app.seguridad import calcular_hash_contrasena

EMAIL_DEMO = "demo@weathertrack.example"
NOMBRE_DEMO = "Usuario de demostración"
# Queda sin asignar, para mostrar el acceso denegado.
ESTACION_AJENA = "Estación ajena"


def _asegurar_usuario(sesion: Session, estaciones: list[Estacion]) -> str | None:
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
    for estacion in estaciones:
        if sesion.get(UsuarioEstacion, (usuario.id, estacion.id)) is None:
            sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=estacion.id))
    return clave_generada


def cargar_semillas(sesion: Session) -> str | None:
    estacion = sincronizar_catalogo(sesion, ClienteSat2Simulado())[0]
    return _asegurar_usuario(sesion, [estacion])


def cargar_semillas_de_escenarios(sesion: Session) -> str | None:
    estaciones = sincronizar_catalogo(sesion, ClienteSat2Escenarios())
    return _asegurar_usuario(sesion, [e for e in estaciones if e.nombre != ESTACION_AJENA])


def principal() -> int:
    modo = os.environ.get("SAT2_MODO", "simulado")
    if modo not in ("simulado", "escenarios"):
        print("Las semillas solo se pueden cargar en modo simulado o escenarios.", file=sys.stderr)
        return 2
    cargar = cargar_semillas if modo == "simulado" else cargar_semillas_de_escenarios
    with Session(obtener_motor()) as sesion:
        clave = cargar(sesion)
        sesion.commit()
    print(f"Semillas cargadas. Usuario de demostración: {EMAIL_DEMO}")
    if clave:
        # Es aleatoria y se muestra una sola vez: los datos son ficticios y locales.
        print(f"Clave generada: {clave}")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
