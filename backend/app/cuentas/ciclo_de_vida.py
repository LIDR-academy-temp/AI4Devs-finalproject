"""Registro, confirmación, recupero, autogestión y baja de cuentas (weather-track-registro-cuentas).

Las funciones de los flujos públicos no informan si un correo existe: devuelven siempre lo mismo
y, cuando corresponde, dejan un correo en la bandeja. Ninguna hace commit: lo hace la API.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session

from app.administracion import normalizar_email
from app.cuentas.contrasenas import validar_contrasena
from app.cuentas.correo import (
    CORREO_CLAVE_CAMBIADA,
    CORREO_CONFIRMACION,
    CORREO_RECUPERO,
    CORREO_YA_REGISTRADO,
    encolar_correo,
)
from app.cuentas.enlaces import BAJA, CONFIRMACION, RECUPERO, VIGENCIA, buscar_enlace, usar_enlace
from app.datos.modelos import CorreoSaliente, EnlaceCuenta, IntentoAcceso, Sesion, Usuario
from app.seguridad import calcular_hash_contrasena, verificar_contrasena

TERMINOS_VERSION = "2026-11"


class ContrasenaIncorrecta(Exception):
    """La contraseña ingresada para confirmar un cambio no es la de la cuenta."""


@dataclass(frozen=True)
class DatosRegistro:
    nombre: str
    apellido: str
    email: str
    contrasena: str
    localidad: str
    provincia: str
    organizacion: str | None = None
    telefono: str | None = None
    acepta_novedades: bool = False


def _buscar(sesion: Session, email: str) -> Usuario | None:
    return sesion.scalar(select(Usuario).where(Usuario.email == normalizar_email(email)))


def _aplicar_datos(usuario: Usuario, datos: DatosRegistro, hash_contrasena: str, ahora: datetime) -> None:
    usuario.nombre = datos.nombre
    usuario.apellido = datos.apellido
    usuario.localidad = datos.localidad
    usuario.provincia = datos.provincia
    usuario.organizacion = datos.organizacion
    usuario.telefono = datos.telefono
    usuario.acepta_novedades = datos.acepta_novedades
    usuario.password_hash = hash_contrasena
    usuario.terminos_version = TERMINOS_VERSION
    usuario.terminos_aceptados_en = ahora


def registrar(sesion: Session, datos: DatosRegistro, ahora: datetime) -> None:
    """La contraseña ya pasó la política. Hace lo mismo, visto desde afuera, exista o no el correo."""
    # Siempre se calcula el hash: así el tiempo de respuesta no delata si la cuenta existe.
    hash_contrasena = calcular_hash_contrasena(datos.contrasena)
    usuario = _buscar(sesion, datos.email)
    if usuario is not None and usuario.confirmado_en is not None:
        if usuario.activo:
            encolar_correo(sesion, usuario, CORREO_YA_REGISTRADO, ahora)
        return
    if usuario is None:
        usuario = Usuario(email=normalizar_email(datos.email), creado_en=ahora)
        sesion.add(usuario)
    _aplicar_datos(usuario, datos, hash_contrasena, ahora)
    sesion.flush()
    encolar_correo(sesion, usuario, CORREO_CONFIRMACION, ahora)


def confirmar(sesion: Session, codigo: str, ahora: datetime) -> Usuario:
    usuario = usar_enlace(sesion, codigo, CONFIRMACION, ahora)
    usuario.confirmado_en = ahora
    sesion.flush()
    return usuario


def reenviar_confirmacion(sesion: Session, email: str, ahora: datetime) -> None:
    usuario = _buscar(sesion, email)
    if usuario is not None and usuario.confirmado_en is None:
        encolar_correo(sesion, usuario, CORREO_CONFIRMACION, ahora)


def pedir_recupero(sesion: Session, email: str, ahora: datetime) -> None:
    usuario = _buscar(sesion, email)
    if usuario is not None and usuario.confirmado_en is not None and usuario.activo:
        encolar_correo(sesion, usuario, CORREO_RECUPERO, ahora)


def _cambiar_contrasena(
    sesion: Session, usuario: Usuario, nueva: str, ahora: datetime, conservar: str | None = None
) -> None:
    """Cierra las sesiones, salvo la indicada por su hash, y avisa por correo."""
    usuario.password_hash = calcular_hash_contrasena(nueva)
    cerrar = delete(Sesion).where(Sesion.usuario_id == usuario.id)
    if conservar:
        cerrar = cerrar.where(Sesion.hash_identificador != conservar)
    sesion.execute(cerrar)
    sesion.flush()
    encolar_correo(sesion, usuario, CORREO_CLAVE_CAMBIADA, ahora)


def restablecer(sesion: Session, codigo: str, nueva: str, ahora: datetime) -> Usuario:
    """Valida el enlace y la contraseña antes de usar el enlace: un rechazo no lo consume."""
    enlace = buscar_enlace(sesion, codigo, RECUPERO, ahora)
    usuario = sesion.get(Usuario, enlace.usuario_id)
    validar_contrasena(nueva, usuario.email)
    usar_enlace(sesion, codigo, RECUPERO, ahora)
    _cambiar_contrasena(sesion, usuario, nueva, ahora)
    # Quien demuestra tener el correo ya no tiene que esperar el fin del bloqueo.
    sesion.execute(delete(IntentoAcceso).where(IntentoAcceso.email == usuario.email))
    sesion.flush()
    return usuario


def cambiar_contrasena(
    sesion: Session, usuario: Usuario, actual: str, nueva: str, ahora: datetime, sesion_actual: str
) -> None:
    if not verificar_contrasena(usuario.password_hash, actual):
        raise ContrasenaIncorrecta()
    validar_contrasena(nueva, usuario.email)
    _cambiar_contrasena(sesion, usuario, nueva, ahora, conservar=sesion_actual)


def borrar_cuenta(sesion: Session, usuario: Usuario) -> None:
    """Borra la cuenta y todo lo que la nombra. Sesiones, enlaces y asignaciones caen en cascada."""
    sesion.execute(delete(IntentoAcceso).where(IntentoAcceso.email == usuario.email))
    sesion.execute(delete(CorreoSaliente).where(CorreoSaliente.destinatario == usuario.email))
    sesion.delete(usuario)
    sesion.flush()


def dar_de_baja_sin_contrasena(sesion: Session, codigo: str, ahora: datetime) -> None:
    """Baja desde el enlace de un correo."""
    borrar_cuenta(sesion, usar_enlace(sesion, codigo, BAJA, ahora))


def dar_de_baja(sesion: Session, usuario: Usuario, contrasena: str) -> None:
    if not verificar_contrasena(usuario.password_hash, contrasena):
        raise ContrasenaIncorrecta()
    borrar_cuenta(sesion, usuario)


def borrar_cuentas_sin_confirmar(sesion: Session, ahora: datetime) -> int:
    """Las cuentas sin confirmar cuyo último enlace de confirmación venció. No hace commit."""
    enlace_vigente = exists().where(
        EnlaceCuenta.usuario_id == Usuario.id,
        EnlaceCuenta.proposito == CONFIRMACION,
        EnlaceCuenta.usado_en.is_(None),
        EnlaceCuenta.vence_en > ahora,
    )
    vencidas = sesion.scalars(
        select(Usuario).where(
            Usuario.confirmado_en.is_(None),
            Usuario.creado_en <= ahora - VIGENCIA[CONFIRMACION],
            ~enlace_vigente,
        )
    ).all()
    for usuario in vencidas:
        borrar_cuenta(sesion, usuario)
    return len(vencidas)

