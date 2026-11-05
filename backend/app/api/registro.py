"""Registro, confirmación y recupero de la contraseña (weather-track-registro-cuentas, D7).

Registro, reenvío y recupero responden siempre lo mismo, exista o no el correo.
"""

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.api.dependencias import Ahora, SesionBd
from app.api.errores import ErrorApi
from app.api.esquemas_cuenta import Aviso, Codigo, Contrasena, Correo, DatosPersonales
from app.api.limite_ip import limitar
from app.cuentas.ciclo_de_vida import (
    DatosRegistro,
    confirmar,
    pedir_recupero,
    reenviar_confirmacion,
    registrar,
    restablecer,
)
from app.cuentas.contrasenas import ContrasenaRechazada, validar_contrasena
from app.cuentas.enlaces import EnlaceInvalido

router = APIRouter(prefix="/api/v1/auth", tags=["acceso"])

AVISO_REGISTRO = "Si los datos son correctos, en unos minutos recibirá un correo para confirmar la cuenta."
AVISO_REENVIO = "Si hay una cuenta sin confirmar con ese correo, recibirá un enlace nuevo."
AVISO_RECUPERO = (
    "Si hay una cuenta con ese correo, recibirá un enlace para elegir una contraseña nueva. "
    "Su usuario es el correo con el que se registró."
)
MENSAJE_ENLACE_INVALIDO = "El enlace no es válido o ya venció. Puede pedir uno nuevo."


class SolicitudRegistro(DatosPersonales):
    email: Correo
    contrasena: Contrasena
    acepta_terminos: bool


class SolicitudCorreo(BaseModel):
    email: Correo


class SolicitudCodigo(BaseModel):
    codigo: Codigo


class SolicitudNuevaContrasena(BaseModel):
    codigo: Codigo
    contrasena: Contrasena


def enlace_invalido() -> ErrorApi:
    return ErrorApi(status.HTTP_400_BAD_REQUEST, "ENLACE_INVALIDO", MENSAJE_ENLACE_INVALIDO)


def contrasena_rechazada(error: ContrasenaRechazada, campo: str) -> ErrorApi:
    return ErrorApi(
        status.HTTP_422_UNPROCESSABLE_CONTENT, "CONTRASENA_RECHAZADA", str(error), campos={campo: str(error)}
    )


@router.post(
    "/registro",
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="registrarCuenta",
    dependencies=[limitar("registro")],
)
def registrar_cuenta(solicitud: SolicitudRegistro, sesion: SesionBd, ahora: Ahora) -> Aviso:
    if not solicitud.acepta_terminos:
        mensaje = "Para crear la cuenta hay que aceptar los términos y la política de privacidad."
        raise ErrorApi(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "TERMINOS_NO_ACEPTADOS",
            mensaje,
            campos={"acepta_terminos": mensaje},
        )
    try:
        validar_contrasena(solicitud.contrasena, solicitud.email)
    except ContrasenaRechazada as error:
        raise contrasena_rechazada(error, "contrasena") from None
    registrar(
        sesion,
        DatosRegistro(
            nombre=solicitud.nombre,
            apellido=solicitud.apellido,
            email=solicitud.email,
            contrasena=solicitud.contrasena,
            localidad=solicitud.localidad,
            provincia=solicitud.provincia,
            organizacion=solicitud.organizacion,
            telefono=solicitud.telefono,
            acepta_novedades=solicitud.acepta_novedades,
        ),
        ahora,
    )
    sesion.commit()
    return Aviso(mensaje=AVISO_REGISTRO)


@router.post("/confirmacion", operation_id="confirmarCuenta", dependencies=[limitar("enlaces")])
def confirmar_cuenta(solicitud: SolicitudCodigo, sesion: SesionBd, ahora: Ahora) -> Aviso:
    try:
        confirmar(sesion, solicitud.codigo, ahora)
    except EnlaceInvalido:
        raise enlace_invalido() from None
    sesion.commit()
    return Aviso(mensaje="Su cuenta quedó confirmada. Ya puede ingresar.")


@router.post(
    "/confirmacion/reenvio",
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="reenviarConfirmacion",
    dependencies=[limitar("recupero")],
)
def reenviar(solicitud: SolicitudCorreo, sesion: SesionBd, ahora: Ahora) -> Aviso:
    reenviar_confirmacion(sesion, solicitud.email, ahora)
    sesion.commit()
    return Aviso(mensaje=AVISO_REENVIO)


@router.post(
    "/recupero",
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="pedirRecupero",
    dependencies=[limitar("recupero")],
)
def recuperar(solicitud: SolicitudCorreo, sesion: SesionBd, ahora: Ahora) -> Aviso:
    pedir_recupero(sesion, solicitud.email, ahora)
    sesion.commit()
    return Aviso(mensaje=AVISO_RECUPERO)


@router.post(
    "/recupero/nueva-contrasena", operation_id="elegirNuevaContrasena", dependencies=[limitar("enlaces")]
)
def nueva_contrasena(solicitud: SolicitudNuevaContrasena, sesion: SesionBd, ahora: Ahora) -> Aviso:
    try:
        restablecer(sesion, solicitud.codigo, solicitud.contrasena, ahora)
    except EnlaceInvalido:
        raise enlace_invalido() from None
    except ContrasenaRechazada as error:
        raise contrasena_rechazada(error, "contrasena") from None
    sesion.commit()
    return Aviso(mensaje="Su contraseña cambió. Ya puede ingresar con ella.")
