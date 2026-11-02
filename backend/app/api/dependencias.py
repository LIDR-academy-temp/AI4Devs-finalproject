"""Dependencias comunes: base de datos, reloj, sesión y autorización."""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Cookie, Depends, Path, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errores import ErrorApi
from app.datos.conexion import obtener_motor
from app.datos.modelos import Estacion, Sesion, Usuario, UsuarioEstacion
from app.seguridad import hash_de_identificador

NOMBRE_COOKIE = "wt_sesion"


def cookie_segura() -> bool:
    """Solo se desactiva para el desarrollo local por HTTP."""
    return os.environ.get("COOKIE_SEGURA", "true").lower() != "false"


def obtener_sesion_bd() -> Iterator[Session]:
    with Session(obtener_motor()) as sesion:
        yield sesion


def obtener_ahora() -> datetime:
    return datetime.now(UTC)


SesionBd = Annotated[Session, Depends(obtener_sesion_bd)]
Ahora = Annotated[datetime, Depends(obtener_ahora)]


def _no_autenticado() -> ErrorApi:
    return ErrorApi(
        status.HTTP_401_UNAUTHORIZED, "NO_AUTENTICADO", "Sesión ausente o vencida."
    )


def obtener_usuario_actual(
    sesion: SesionBd,
    ahora: Ahora,
    wt_sesion: Annotated[str | None, Cookie()] = None,
) -> Usuario:
    if not wt_sesion:
        raise _no_autenticado()
    usuario = sesion.scalar(
        select(Usuario)
        .join(Sesion, Sesion.usuario_id == Usuario.id)
        .where(
            Sesion.hash_identificador == hash_de_identificador(wt_sesion),
            Sesion.vence_en > ahora,
            Usuario.activo,
        )
    )
    if usuario is None:
        raise _no_autenticado()
    return usuario


UsuarioActual = Annotated[Usuario, Depends(obtener_usuario_actual)]


def obtener_estacion_autorizada(
    estacionId: Annotated[int, Path()],  # noqa: N803
    sesion: SesionBd,
    usuario: UsuarioActual,
) -> Estacion:
    """Se comprueba en el servidor, en cada consulta."""
    estacion = sesion.get(Estacion, estacionId)
    if estacion is None:
        raise ErrorApi(status.HTTP_404_NOT_FOUND, "NO_ENCONTRADO", "La estación no existe.")
    if sesion.get(UsuarioEstacion, (usuario.id, estacion.id)) is None:
        raise ErrorApi(
            status.HTTP_403_FORBIDDEN, "SIN_ACCESO", "No tiene acceso a esta estación."
        )
    return estacion


EstacionAutorizada = Annotated[Estacion, Depends(obtener_estacion_autorizada)]
