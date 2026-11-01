"""Datos ficticios de demostración. Ejecutarlo más de una vez no duplica nada.

Solo funciona en modo simulado, para no mezclar datos ficticios con los reales.
"""

import os
import secrets
import sys
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.conexion import obtener_motor
from app.datos.modelos import Estacion, Sensor, Usuario, UsuarioEstacion
from app.dominio.catalogo import clasificar_magnitud, leer_altura_m, normalizar_nombre
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.seguridad import calcular_hash_contrasena

EMAIL_DEMO = "demo@weathertrack.example"
NOMBRE_DEMO = "Usuario de demostración"


def _asegurar_estacion(sesion: Session, equipo: dict) -> Estacion:
    estacion = sesion.scalar(
        select(Estacion).where(Estacion.id_equipo_sat2 == equipo["idEquipo"])
    )
    if estacion is None:
        estacion = Estacion(
            id_equipo_sat2=equipo["idEquipo"],
            nombre=equipo["descripcion"],
            nro_serie=equipo["NroSerie"],
            latitud=Decimal(str(equipo["lat"])),
            longitud=Decimal(str(equipo["lng"])),
        )
        sesion.add(estacion)
        sesion.flush()
    return estacion


def _asegurar_sensores(sesion: Session, estacion: Estacion, sensores: list[dict]) -> None:
    existentes = set(
        sesion.scalars(select(Sensor.id_sensor_sat2).where(Sensor.estacion_id == estacion.id))
    )
    for sensor in sensores:
        if sensor["idSensor"] in existentes:
            continue
        sesion.add(
            Sensor(
                estacion_id=estacion.id,
                id_sensor_sat2=sensor["idSensor"],
                nombre=sensor["nombre"],
                clave_normalizada=normalizar_nombre(sensor["nombre"]),
                magnitud=clasificar_magnitud(sensor["nombre"]),
                altura_m=leer_altura_m(sensor["nombre"]),
                unidad=sensor["unidad"],
            )
        )


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
    equipo = ClienteSat2Simulado().recuperar_equipos()[0]
    estacion = _asegurar_estacion(sesion, equipo)
    _asegurar_sensores(sesion, estacion, equipo["sensores"])
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
