"""Inicio y cierre de sesión."""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.administracion import normalizar_email
from app.api.dependencias import (
    NOMBRE_COOKIE,
    Ahora,
    SesionBd,
    cookie_segura,
)
from app.api.errores import ErrorApi
from app.datos.modelos import IntentoAcceso, Sesion, Usuario
from app.seguridad import (
    generar_identificador_de_sesion,
    hash_de_identificador,
    simular_verificacion,
    verificar_contrasena,
)

DURACION_SESION = timedelta(hours=8)
MAX_FALLOS = 5
VENTANA_DE_FALLOS = timedelta(minutes=15)
MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos."

router = APIRouter(prefix="/api/v1/auth", tags=["acceso"])


class SolicitudInicio(BaseModel):
    # Sin caracteres de control: PostgreSQL rechaza el carácter nulo en un texto.
    email: str = Field(min_length=1, max_length=254, pattern=r"^[^\x00-\x1f\x7f]+$")
    # El tope evita gastar CPU calculando el hash de textos enormes.
    contrasena: str = Field(min_length=1, max_length=1024)


class UsuarioPublico(BaseModel):
    email: str
    nombre: str


def segundos_de_bloqueo(sesion: Session, email: str, ahora: datetime) -> int:
    """Cero si no está bloqueado. La espera se cuenta desde el último fallo."""
    fallos = sesion.scalars(
        select(IntentoAcceso.ocurrido_en)
        .where(IntentoAcceso.email == email)
        .order_by(IntentoAcceso.ocurrido_en.desc())
        .limit(MAX_FALLOS)
    ).all()
    if len(fallos) < MAX_FALLOS or fallos[0] - fallos[-1] > VENTANA_DE_FALLOS:
        return 0
    restante = fallos[0] + VENTANA_DE_FALLOS - ahora
    return max(0, int(restante.total_seconds()) + 1) if restante.total_seconds() > 0 else 0


@router.post("/login", operation_id="iniciarSesion")
def iniciar_sesion(
    solicitud: SolicitudInicio,
    respuesta: Response,
    sesion: SesionBd,
    ahora: Ahora,
) -> UsuarioPublico:
    email = normalizar_email(solicitud.email)

    espera = segundos_de_bloqueo(sesion, email, ahora)
    if espera:
        raise ErrorApi(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "DEMASIADOS_INTENTOS",
            "Demasiados intentos. Vuelva a probar más tarde.",
            {"Retry-After": str(espera)},
        )

    usuario = sesion.scalar(select(Usuario).where(Usuario.email == email))
    if usuario is None:
        simular_verificacion(solicitud.contrasena)
        valida = False
    else:
        valida = verificar_contrasena(usuario.password_hash, solicitud.contrasena)

    if usuario is None or not valida or not usuario.activo:
        sesion.add(IntentoAcceso(email=email, ocurrido_en=ahora))
        sesion.commit()
        raise ErrorApi(
            status.HTTP_401_UNAUTHORIZED, "CREDENCIALES_INVALIDAS", MENSAJE_CREDENCIALES
        )

    sesion.execute(delete(IntentoAcceso).where(IntentoAcceso.email == email))
    identificador = generar_identificador_de_sesion()
    sesion.add(
        Sesion(
            usuario_id=usuario.id,
            hash_identificador=hash_de_identificador(identificador),
            creada_en=ahora,
            vence_en=ahora + DURACION_SESION,
        )
    )
    sesion.commit()
    respuesta.set_cookie(
        NOMBRE_COOKIE,
        identificador,
        max_age=int(DURACION_SESION.total_seconds()),
        path="/api",
        httponly=True,
        secure=cookie_segura(),
        samesite="lax",
    )
    return UsuarioPublico(email=usuario.email, nombre=usuario.nombre)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, operation_id="cerrarSesion")
def cerrar_sesion(
    respuesta: Response,
    sesion: SesionBd,
    wt_sesion: Annotated[str | None, Cookie()] = None,
) -> None:
    if wt_sesion:
        sesion.execute(
            delete(Sesion).where(Sesion.hash_identificador == hash_de_identificador(wt_sesion))
        )
        sesion.commit()
    respuesta.delete_cookie(
        NOMBRE_COOKIE, path="/api", httponly=True, secure=cookie_segura(), samesite="lax"
    )
