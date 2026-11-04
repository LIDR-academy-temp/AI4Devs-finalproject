"""Modo de prueba: dos casos en el selector y ninguna consulta a SAT2 (D5 de weather-track-estaciones).

"Caso de prueba - 1" muestra lo que ya está guardado en la base y "Caso de prueba - 2", con los mismos
sensores, nunca recibe lecturas. Una base vacía recibe una sola vez los 31 días simulados para el caso 1.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datos.modelos import Estacion, Observacion, Sensor, UsuarioEstacion
from app.ingesta.carga_inicial import ejecutar_carga_inicial
from app.ingesta.catalogo import sincronizar_catalogo
from app.ingesta.ciclo import ejecutar_ciclo
from app.ingesta.cliente_simulado import ZONA_ARGENTINA, ClienteSat2Simulado

EQUIPO_CASO_1 = 1
EQUIPO_CASO_2 = 2
NOMBRE_CASO_1 = "Caso de prueba - 1"
NOMBRE_CASO_2 = "Caso de prueba - 2"


def _estacion(sesion: Session, id_equipo: int) -> Estacion | None:
    return sesion.scalar(select(Estacion).where(Estacion.id_equipo_sat2 == id_equipo))


def _sembrar_datos_simulados(sesion: Session, ahora: datetime) -> Estacion:
    cliente = ClienteSat2Simulado(reloj=lambda: ahora.astimezone(ZONA_ARGENTINA))
    estacion = sincronizar_catalogo(sesion, cliente, ahora)[0]
    sesion.commit()
    ejecutar_carga_inicial(sesion, cliente, estacion, ahora, pausa_segundos=0)
    ejecutar_ciclo(sesion, cliente, estacion, ahora)
    return estacion


def _asegurar_estacion(sesion: Session, id_equipo: int, modelo: Estacion | None) -> Estacion:
    estacion = _estacion(sesion, id_equipo)
    if estacion is None:
        estacion = Estacion(
            id_equipo_sat2=id_equipo,
            nombre="",
            latitud=modelo.latitud if modelo else Decimal("0"),
            longitud=modelo.longitud if modelo else Decimal("0"),
        )
        sesion.add(estacion)
    estacion.activa = True
    estacion.inactiva_desde = None
    return estacion


def _copiar_sensores(sesion: Session, origen: Estacion, destino: Estacion) -> None:
    """El caso 2 tiene los mismos sensores que el caso 1, pero nunca recibe lecturas."""
    if sesion.scalar(select(Sensor.id).where(Sensor.estacion_id == destino.id).limit(1)):
        return
    for sensor in sesion.scalars(select(Sensor).where(Sensor.estacion_id == origen.id)).all():
        sesion.add(
            Sensor(
                estacion_id=destino.id,
                id_sensor_sat2=sensor.id_sensor_sat2,
                nombre=sensor.nombre,
                clave_normalizada=sensor.clave_normalizada,
                magnitud=sensor.magnitud,
                altura_m=sensor.altura_m,
                unidad=sensor.unidad,
            )
        )
    sesion.flush()


def preparar_modo_prueba(sesion: Session, ahora: datetime) -> tuple[Estacion, Estacion]:
    """Deja listos los dos casos. Se puede repetir sin duplicar nada. Hace commit."""
    sin_lecturas = sesion.scalar(select(Observacion.sensor_id).limit(1)) is None
    if sin_lecturas:
        _sembrar_datos_simulados(sesion, ahora)

    caso_1 = _asegurar_estacion(sesion, EQUIPO_CASO_1, None)
    caso_1.nombre = NOMBRE_CASO_1
    sesion.flush()
    caso_2 = _asegurar_estacion(sesion, EQUIPO_CASO_2, caso_1)
    caso_2.nombre = NOMBRE_CASO_2
    sesion.flush()
    _copiar_sensores(sesion, caso_1, caso_2)

    # Mientras el acceso dependa de asignaciones, quien ve el caso 1 también ve el caso 2.
    usuarios = sesion.scalars(
        select(UsuarioEstacion.usuario_id).where(UsuarioEstacion.estacion_id == caso_1.id)
    ).all()
    for usuario_id in usuarios:
        if sesion.get(UsuarioEstacion, (usuario_id, caso_2.id)) is None:
            sesion.add(UsuarioEstacion(usuario_id=usuario_id, estacion_id=caso_2.id))
    sesion.commit()
    return caso_1, caso_2
