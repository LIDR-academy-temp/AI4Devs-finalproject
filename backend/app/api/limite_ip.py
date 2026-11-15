"""Límite de pedidos por dirección IP en los flujos públicos (D9 de weather-track-registro-cuentas).

Ventanas fijas en la tabla `limite_ip`, con un incremento atómico. La IP sale de `request.client`:
uvicorn la toma de `X-Forwarded-For`, que Caddy reemplaza en cada pedido con la dirección real.
La API no se publica fuera de la red de Compose, así que nadie más puede fijar esa cabecera.
"""

from datetime import datetime, timedelta

from fastapi import Depends, Request, status
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.api.dependencias import Ahora, SesionBd
from app.api.errores import ErrorApi
from app.datos.modelos import LimiteIp

# Acción: (pedidos admitidos, duración de la ventana). Holgados para uso humano.
LIMITES = {
    "inicio_de_sesion": (30, timedelta(minutes=15)),
    "registro": (5, timedelta(hours=1)),
    "recupero": (10, timedelta(hours=1)),
    "enlaces": (30, timedelta(minutes=15)),
}


def ip_del_pedido(request: Request) -> str:
    return request.client.host if request.client else "desconocida"


def _inicio_de_ventana(ahora: datetime, duracion: timedelta) -> datetime:
    segundos = int(duracion.total_seconds())
    return datetime.fromtimestamp(int(ahora.timestamp()) // segundos * segundos, tz=ahora.tzinfo)


def registrar_pedido(sesion: Session, accion: str, ip: str, ahora: datetime) -> int:
    """Cuenta el pedido y devuelve los segundos de espera, o 0 si está dentro del límite. Hace commit."""
    maximo, duracion = LIMITES[accion]
    inicio = _inicio_de_ventana(ahora, duracion)
    instruccion = insert(LimiteIp).values(clave=f"{accion}:{ip}", ventana_inicio=inicio, cantidad=1)
    cantidad = sesion.scalar(
        instruccion.on_conflict_do_update(
            index_elements=["clave", "ventana_inicio"],
            set_={"cantidad": LimiteIp.cantidad + 1},
        ).returning(LimiteIp.cantidad)
    )
    sesion.commit()
    if cantidad <= maximo:
        return 0
    return max(1, int((inicio + duracion - ahora).total_seconds()))


def limitar(accion: str):
    """Dependencia de FastAPI: responde 429 con `Retry-After` al superar el límite de la acción."""

    def comprobar(request: Request, sesion: SesionBd, ahora: Ahora) -> None:
        espera = registrar_pedido(sesion, accion, ip_del_pedido(request), ahora)
        if espera:
            raise ErrorApi(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "DEMASIADOS_PEDIDOS",
                "Demasiados pedidos desde esta conexión. Vuelva a probar más tarde.",
                {"Retry-After": str(espera)},
            )

    return Depends(comprobar)

