"""Controles de salud (D2 de weather-track-monitoreo).

Cada control dice si está en alerta y por qué, con un detalle sin credenciales, correos de cuentas
ni direcciones IP.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.limite_ip import LIMITES, _inicio_de_ventana
from app.datos.modelos import (
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    LimiteIp,
    Observacion,
    Sensor,
)
from app.monitoreo import umbrales

GENERAL = ""
NOMBRES_DE_ACCION = {
    "inicio_de_sesion": "al iniciar sesión",
    "registro": "al registrarse",
    "recupero": "al pedir el recupero",
    "enlaces": "al usar enlaces de correo",
}


@dataclass(frozen=True)
class Disco:
    total: int
    libre: int


@dataclass(frozen=True)
class Resultado:
    tipo: str
    objeto: str
    en_alerta: bool
    detalle: str


def _minutos(segundos: float) -> int:
    return int(segundos // 60)


def _datos_viejos(sesion: Session, estacion: Estacion, ahora: datetime) -> Resultado:
    ultima = sesion.scalar(
        select(func.max(Observacion.medido_en)).join(Sensor).where(Sensor.estacion_id == estacion.id)
    )
    if ultima is None:
        return Resultado("DATOS_VIEJOS", estacion.nombre, False, "Sin lecturas todavía.")
    antiguedad = ahora - ultima
    minutos = _minutos(antiguedad.total_seconds())
    if antiguedad > umbrales.DATOS_VIEJOS_DESPUES_DE:
        return Resultado("DATOS_VIEJOS", estacion.nombre, True, f"Última lectura hace {minutos} minutos.")
    return Resultado("DATOS_VIEJOS", estacion.nombre, False, f"Última lectura hace {minutos} minutos.")


def _ciclos_fallidos(sesion: Session, estacion: Estacion) -> Resultado:
    ultimos = sesion.scalars(
        select(EjecucionIngesta.resultado)
        .where(
            EjecucionIngesta.estacion_id == estacion.id,
            EjecucionIngesta.tipo == "CICLO",
            EjecucionIngesta.finalizada_en.is_not(None),
        )
        .order_by(EjecucionIngesta.iniciada_en.desc())
        .limit(umbrales.CICLOS_FALLIDOS_SEGUIDOS)
    ).all()
    seguidos = len(ultimos) == umbrales.CICLOS_FALLIDOS_SEGUIDOS and all(r == "ERROR" for r in ultimos)
    if seguidos:
        detalle = f"Los últimos {umbrales.CICLOS_FALLIDOS_SEGUIDOS} ciclos terminaron con error."
    else:
        detalle = "Los ciclos recientes terminaron bien." if ultimos else "Sin ciclos todavía."
    return Resultado("CICLOS_FALLIDOS", estacion.nombre, seguidos, detalle)


def _disco(disco: Disco) -> Resultado:
    proporcion = disco.libre / disco.total if disco.total else 0
    porcentaje = round(proporcion * 100)
    return Resultado(
        "DISCO_CASI_LLENO",
        GENERAL,
        proporcion < umbrales.DISCO_LIBRE_MINIMO,
        f"Queda el {porcentaje} % libre en el disco de la base.",
    )


def _fuerza_bruta(sesion: Session, ahora: datetime) -> Resultado:
    fallidos = sesion.scalar(
        select(func.count())
        .select_from(IntentoAcceso)
        .where(IntentoAcceso.ocurrido_en > ahora - umbrales.VENTANA_INGRESOS)
    )
    bloqueadas = []
    for accion, (maximo, duracion) in LIMITES.items():
        hay = sesion.scalar(
            select(func.count())
            .select_from(LimiteIp)
            .where(
                LimiteIp.clave.startswith(f"{accion}:"),
                LimiteIp.ventana_inicio == _inicio_de_ventana(ahora, duracion),
                LimiteIp.cantidad > maximo,
            )
        )
        if hay:
            bloqueadas.append(NOMBRES_DE_ACCION.get(accion, accion))
    minutos = _minutos(umbrales.VENTANA_INGRESOS.total_seconds())
    partes = [f"{fallidos} ingresos fallidos en {minutos} minutos."]
    if bloqueadas:
        partes.append("Hay direcciones bloqueadas por el límite " + ", ".join(bloqueadas) + ".")
    en_alerta = fallidos >= umbrales.INGRESOS_FALLIDOS_MAXIMOS or bool(bloqueadas)
    return Resultado("FUERZA_BRUTA", GENERAL, en_alerta, " ".join(partes))


def evaluar(sesion: Session, ahora: datetime, modo: str, disco: Disco | None) -> list[Resultado]:
    """Todos los controles. En modo prueba no se vigila la ingesta, que no trae lecturas."""
    resultados = []
    if modo != "prueba":
        estaciones = sesion.scalars(select(Estacion).where(Estacion.activa).order_by(Estacion.id)).all()
        for estacion in estaciones:
            resultados.append(_datos_viejos(sesion, estacion, ahora))
            resultados.append(_ciclos_fallidos(sesion, estacion))
    if disco is not None:
        resultados.append(_disco(disco))
    resultados.append(_fuerza_bruta(sesion, ahora))
    return resultados
