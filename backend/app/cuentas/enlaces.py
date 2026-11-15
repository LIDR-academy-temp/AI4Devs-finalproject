"""Códigos de un solo uso de confirmación, recupero y baja (D3 de weather-track-registro-cuentas).

El código tiene 256 bits y viaja solo en el enlace del correo; la base guarda su SHA-256, como
con las sesiones.
"""

import secrets
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.datos.modelos import EnlaceCuenta, Usuario
from app.seguridad import hash_de_identificador

CONFIRMACION = "CONFIRMACION"
RECUPERO = "RECUPERO"
BAJA = "BAJA"

VIGENCIA = {
    CONFIRMACION: timedelta(hours=48),
    RECUPERO: timedelta(minutes=30),
    BAJA: timedelta(days=60),
}
# La baja va en cada correo enviado: un enlace nuevo no anula los de correos anteriores.
REEMPLAZA_AL_ANTERIOR = {CONFIRMACION: True, RECUPERO: True, BAJA: False}


class EnlaceInvalido(Exception):
    """Usado, vencido, de otro propósito o inexistente. No dice cuál, ni de qué cuenta era."""


def emitir_enlace(sesion: Session, usuario: Usuario, proposito: str, ahora: datetime) -> str:
    """Devuelve el código, que no se guarda. No hace commit."""
    if REEMPLAZA_AL_ANTERIOR[proposito]:
        sesion.execute(
            delete(EnlaceCuenta).where(
                EnlaceCuenta.usuario_id == usuario.id,
                EnlaceCuenta.proposito == proposito,
                EnlaceCuenta.usado_en.is_(None),
            )
        )
    codigo = secrets.token_urlsafe(32)
    sesion.add(
        EnlaceCuenta(
            usuario_id=usuario.id,
            proposito=proposito,
            hash_codigo=hash_de_identificador(codigo),
            creado_en=ahora,
            vence_en=ahora + VIGENCIA[proposito],
        )
    )
    sesion.flush()
    return codigo


def buscar_enlace(sesion: Session, codigo: str, proposito: str, ahora: datetime) -> EnlaceCuenta:
    """Devuelve el enlace vigente, bloqueado hasta el fin de la transacción, sin usarlo."""
    enlace = sesion.scalar(
        select(EnlaceCuenta)
        .where(EnlaceCuenta.hash_codigo == hash_de_identificador(codigo))
        .with_for_update()
    )
    if (
        enlace is None
        or enlace.proposito != proposito
        or enlace.usado_en is not None
        or enlace.vence_en <= ahora
    ):
        raise EnlaceInvalido()
    return enlace


def usar_enlace(sesion: Session, codigo: str, proposito: str, ahora: datetime) -> Usuario:
    """Valida el código y lo marca como usado en la misma transacción. No hace commit."""
    enlace = buscar_enlace(sesion, codigo, proposito, ahora)
    enlace.usado_en = ahora
    sesion.flush()
    return sesion.get(Usuario, enlace.usuario_id)
