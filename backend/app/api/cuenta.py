"""Mi cuenta: datos, contraseña y baja (weather-track-registro-cuentas, D6 y D11).

La baja desde el correo pide confirmar con un botón: abrir el enlace nunca borra nada. La baja en
un clic de `List-Unsubscribe` es un POST que hace el programa de correo por pedido del titular.
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Query, Response, status
from pydantic import BaseModel

from app.api.dependencias import NOMBRE_COOKIE, Ahora, SesionBd, UsuarioActual, cookie_segura
from app.api.errores import ErrorApi
from app.api.esquemas_cuenta import Aviso, Codigo, Contrasena, DatosPersonales
from app.api.limite_ip import limitar
from app.api.registro import contrasena_rechazada, enlace_invalido
from app.cuentas.ciclo_de_vida import (
    ContrasenaIncorrecta,
    cambiar_contrasena,
    dar_de_baja,
    dar_de_baja_sin_contrasena,
)
from app.cuentas.contrasenas import ContrasenaRechazada
from app.cuentas.enlaces import EnlaceInvalido
from app.datos.modelos import Usuario
from app.seguridad import hash_de_identificador

router = APIRouter(prefix="/api/v1/cuenta", tags=["cuenta"])

AVISO_BAJA = "Su cuenta y todos sus datos se borraron."


class Cuenta(BaseModel):
    email: str
    nombre: str
    # Las cuentas creadas antes del registro público no tienen estos datos.
    apellido: str | None
    localidad: str | None
    provincia: str | None
    organizacion: str | None
    telefono: str | None
    acepta_novedades: bool
    terminos_version: str | None
    # Lo otorga solo la línea de comandos del servidor; actualizar la cuenta no lo cambia.
    es_administrador: bool


class SolicitudCambioContrasena(BaseModel):
    actual: Contrasena
    nueva: Contrasena


class SolicitudBaja(BaseModel):
    contrasena: Contrasena


class SolicitudBajaConEnlace(BaseModel):
    codigo: Codigo


def _cuenta(usuario: Usuario) -> Cuenta:
    return Cuenta(
        email=usuario.email,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        localidad=usuario.localidad,
        provincia=usuario.provincia,
        organizacion=usuario.organizacion,
        telefono=usuario.telefono,
        acepta_novedades=usuario.acepta_novedades,
        terminos_version=usuario.terminos_version,
        es_administrador=usuario.es_administrador,
    )


def contrasena_incorrecta(campo: str) -> ErrorApi:
    mensaje = "La contraseña no es correcta."
    return ErrorApi(status.HTTP_400_BAD_REQUEST, "CONTRASENA_INCORRECTA", mensaje, campos={campo: mensaje})


def _borrar_cookie(respuesta: Response) -> None:
    respuesta.delete_cookie(NOMBRE_COOKIE, path="/api", httponly=True, secure=cookie_segura(), samesite="lax")


@router.get("", operation_id="obtenerCuenta")
def obtener_cuenta(usuario: UsuarioActual) -> Cuenta:
    return _cuenta(usuario)


@router.put("", operation_id="actualizarCuenta")
def actualizar_cuenta(datos: DatosPersonales, usuario: UsuarioActual, sesion: SesionBd) -> Cuenta:
    # El correo no se cambia: es el usuario y la dirección confirmada.
    for campo, valor in datos.model_dump().items():
        setattr(usuario, campo, valor)
    sesion.commit()
    return _cuenta(usuario)


@router.post(
    "/contrasena",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="cambiarContrasena",
    dependencies=[limitar("inicio_de_sesion")],
)
def cambiar(
    solicitud: SolicitudCambioContrasena,
    usuario: UsuarioActual,
    sesion: SesionBd,
    ahora: Ahora,
    wt_sesion: Annotated[str | None, Cookie()] = None,
) -> None:
    try:
        cambiar_contrasena(
            sesion, usuario, solicitud.actual, solicitud.nueva, ahora, hash_de_identificador(wt_sesion or "")
        )
    except ContrasenaIncorrecta:
        raise contrasena_incorrecta("actual") from None
    except ContrasenaRechazada as error:
        raise contrasena_rechazada(error, "nueva") from None
    sesion.commit()


@router.post(
    "/baja",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="darDeBaja",
    dependencies=[limitar("inicio_de_sesion")],
)
def baja(solicitud: SolicitudBaja, usuario: UsuarioActual, sesion: SesionBd, respuesta: Response) -> None:
    try:
        dar_de_baja(sesion, usuario, solicitud.contrasena)
    except ContrasenaIncorrecta:
        raise contrasena_incorrecta("contrasena") from None
    sesion.commit()
    _borrar_cookie(respuesta)


@router.post("/baja-con-enlace", operation_id="darDeBajaConEnlace", dependencies=[limitar("enlaces")])
def baja_con_enlace(
    solicitud: SolicitudBajaConEnlace, sesion: SesionBd, ahora: Ahora, respuesta: Response
) -> Aviso:
    try:
        dar_de_baja_sin_contrasena(sesion, solicitud.codigo, ahora)
    except EnlaceInvalido:
        raise enlace_invalido() from None
    sesion.commit()
    _borrar_cookie(respuesta)
    return Aviso(mensaje=AVISO_BAJA)


@router.post("/baja-un-clic", operation_id="darDeBajaEnUnClic", dependencies=[limitar("enlaces")])
def baja_un_clic(
    codigo: Annotated[str, Query(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_-]+$")],
    sesion: SesionBd,
    ahora: Ahora,
) -> Aviso:
    """RFC 8058: el programa de correo envía `List-Unsubscribe=One-Click`, que no hace falta leer."""
    try:
        dar_de_baja_sin_contrasena(sesion, codigo, ahora)
    except EnlaceInvalido:
        raise enlace_invalido() from None
    sesion.commit()
    return Aviso(mensaje=AVISO_BAJA)
