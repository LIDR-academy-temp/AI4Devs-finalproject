"""Administración de la configuración de SAT2 (weather-track-administracion-sat2, D2 y D5).

Para cualquier cuenta sin el rol, y sin sesión, todo `/api/v1/administracion` responde lo mismo que
una ruta inexistente: un 401 o un 403 confirmarían que existe. La API cifra con la clave pública y
no puede descifrar lo que guarda.
"""

import os
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from pydantic import AfterValidator, BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.autenticacion import segundos_de_bloqueo
from app.api.cuenta import contrasena_incorrecta
from app.api.dependencias import NOMBRE_COOKIE, Ahora, SesionBd, obtener_usuario_actual
from app.api.errores import ErrorApi
from app.api.esquemas_cuenta import Contrasena, Texto
from app.api.limite_ip import limitar
from app.cifrado_sat2 import ClaveAusente, ClaveInvalida, cifrar, clave_publica_del_entorno
from app.cuentas.correo import CORREO_CONFIGURACION_SAT2, encolar_correo
from app.datos.modelos import (
    AlertaSistema,
    CambioConfiguracionSat2,
    ConfiguracionSat2,
    EjecucionIngesta,
    IntentoAcceso,
    Usuario,
)
from app.monitoreo import umbrales
from app.monitoreo.controles import evaluar
from app.seguridad import verificar_contrasena

CAMBIOS_VISIBLES = 10
ALERTAS_VISIBLES = 20
MODOS = ("real", "simulado", "prueba")


def requerir_administrador(
    sesion: SesionBd,
    ahora: Ahora,
    wt_sesion: Annotated[str | None, Cookie(alias=NOMBRE_COOKIE)] = None,
) -> Usuario:
    """Se comprueba en cada pedido, antes de leer el cuerpo y de contar el límite por IP."""
    try:
        usuario = obtener_usuario_actual(sesion, ahora, wt_sesion)
    except ErrorApi:
        usuario = None
    if usuario is None or not usuario.es_administrador:
        # El mismo cuerpo que FastAPI da a una ruta inexistente.
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return usuario


Administrador = Annotated[Usuario, Depends(requerir_administrador)]

router = APIRouter(
    prefix="/api/v1/administracion",
    tags=["administración"],
    dependencies=[Depends(requerir_administrador)],
)


def _url_valida(valor: str) -> str:
    partes = urlsplit(valor)
    if partes.scheme not in ("http", "https") or not partes.hostname or " " in valor:
        raise ValueError("La dirección debe empezar con http:// o https://.")
    return valor


class SolicitudConfiguracionSat2(BaseModel):
    url_base: Annotated[Texto(500), AfterValidator(_url_valida)]
    usuario: Texto(200)
    # Como toda contraseña, no se recorta: un espacio es parte de ella.
    clave: Contrasena
    contrasena_actual: Contrasena


class UltimoCiclo(BaseModel):
    resultado: str
    finalizado_en: datetime


class CambioVisible(BaseModel):
    ocurrido_en: datetime
    email: str


class EstadoConfiguracionSat2(BaseModel):
    """Nunca incluye la URL, el usuario ni la contraseña: la API no puede leerlos."""

    configuracion_guardada: bool
    puede_guardar: bool
    modo: str
    cargada_en: datetime | None
    cargada_por: str | None
    ultimo_ciclo: UltimoCiclo | None
    cambios: list[CambioVisible]


def _clave_publica() -> str | None:
    try:
        clave = clave_publica_del_entorno()
        # Cifrar algo vacío comprueba que la clave tenga el formato correcto.
        cifrar({}, clave)
    except (ClaveAusente, ClaveInvalida):
        return None
    return clave


def _estado(sesion: Session) -> EstadoConfiguracionSat2:
    fila = sesion.get(ConfiguracionSat2, 1)
    cambios = sesion.scalars(
        select(CambioConfiguracionSat2)
        .order_by(CambioConfiguracionSat2.ocurrido_en.desc(), CambioConfiguracionSat2.id.desc())
        .limit(CAMBIOS_VISIBLES)
    ).all()
    ciclo = sesion.scalars(
        select(EjecucionIngesta)
        .where(EjecucionIngesta.tipo == "CICLO", EjecucionIngesta.finalizada_en.is_not(None))
        .order_by(EjecucionIngesta.finalizada_en.desc())
        .limit(1)
    ).first()
    modo = os.environ.get("SAT2_MODO", "simulado")
    return EstadoConfiguracionSat2(
        configuracion_guardada=fila is not None,
        puede_guardar=_clave_publica() is not None,
        modo=modo if modo in MODOS else "desconocido",
        cargada_en=fila.cargada_en if fila else None,
        # El registro conserva el correo aunque la cuenta del autor ya no exista.
        cargada_por=cambios[0].email_usuario if fila and cambios else None,
        ultimo_ciclo=(
            UltimoCiclo(resultado=ciclo.resultado, finalizado_en=ciclo.finalizada_en)
            if ciclo
            else None
        ),
        cambios=[CambioVisible(ocurrido_en=c.ocurrido_en, email=c.email_usuario) for c in cambios],
    )


@router.get("/sat2", operation_id="obtenerConfiguracionSat2")
def obtener_configuracion(sesion: SesionBd) -> EstadoConfiguracionSat2:
    return _estado(sesion)


@router.put(
    "/sat2",
    operation_id="guardarConfiguracionSat2",
    dependencies=[limitar("inicio_de_sesion")],
)
def guardar_configuracion(
    solicitud: SolicitudConfiguracionSat2,
    administrador: Administrador,
    sesion: SesionBd,
    ahora: Ahora,
) -> EstadoConfiguracionSat2:
    espera = segundos_de_bloqueo(sesion, administrador.email, ahora)
    if espera:
        raise ErrorApi(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "DEMASIADOS_INTENTOS",
            "Demasiados intentos. Vuelva a probar más tarde.",
            {"Retry-After": str(espera)},
        )
    clave_publica = _clave_publica()
    if clave_publica is None:
        raise ErrorApi(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "SERVIDOR_SIN_CLAVE",
            "Falta configurar en el servidor la clave para guardar la configuración de SAT2.",
        )
    if not verificar_contrasena(administrador.password_hash, solicitud.contrasena_actual):
        # Cuenta como un intento fallido de ingreso a esta cuenta.
        sesion.add(IntentoAcceso(email=administrador.email, ocurrido_en=ahora))
        sesion.commit()
        raise contrasena_incorrecta("contrasena_actual")

    contenido = cifrar(
        {"url_base": solicitud.url_base, "usuario": solicitud.usuario, "clave": solicitud.clave},
        clave_publica,
    )
    fila = sesion.get(ConfiguracionSat2, 1) or ConfiguracionSat2(id=1)
    fila.contenido_cifrado = contenido
    fila.cargada_en = ahora
    fila.cargada_por = administrador.id
    sesion.add(fila)
    sesion.add(
        CambioConfiguracionSat2(
            ocurrido_en=ahora, usuario_id=administrador.id, email_usuario=administrador.email
        )
    )
    administradores = sesion.scalars(
        select(Usuario).where(
            Usuario.es_administrador, Usuario.activo, Usuario.confirmado_en.is_not(None)
        )
    ).all()
    for destinatario in administradores:
        encolar_correo(
            sesion, destinatario, CORREO_CONFIGURACION_SAT2, ahora, autor=administrador.email
        )
    sesion.commit()
    return _estado(sesion)


class ControlVisible(BaseModel):
    tipo: str
    # La estación afectada, o vacío para los controles generales.
    objeto: str
    estado: Literal["OK", "ALERTA"]
    detalle: str


class EstadoWorker(BaseModel):
    estado: Literal["ACTIVO", "SIN_ACTIVIDAD", "MODO_PRUEBA"]
    ultimo_ciclo_en: datetime | None


class AlertaVisible(BaseModel):
    tipo: str
    objeto: str
    abierta_en: datetime
    cerrada_en: datetime | None
    detalle: str


class EstadoSistema(BaseModel):
    """Sin credenciales, correos de cuentas ni direcciones IP (weather-track-monitoreo, D4)."""

    controles: list[ControlVisible]
    worker: EstadoWorker
    alertas: list[AlertaVisible]
    base_tamano_bytes: int


def _estado_del_worker(sesion: Session, ahora: datetime, modo: str) -> EstadoWorker:
    ultimo = sesion.scalar(
        select(func.max(EjecucionIngesta.iniciada_en)).where(EjecucionIngesta.tipo == "CICLO")
    )
    if modo == "prueba":
        return EstadoWorker(estado="MODO_PRUEBA", ultimo_ciclo_en=ultimo)
    activo = ultimo is not None and ahora - ultimo <= umbrales.WORKER_SIN_ACTIVIDAD_DESPUES_DE
    return EstadoWorker(estado="ACTIVO" if activo else "SIN_ACTIVIDAD", ultimo_ciclo_en=ultimo)


@router.get("/estado", operation_id="obtenerEstadoSistema")
def obtener_estado(sesion: SesionBd, ahora: Ahora) -> EstadoSistema:
    modo = os.environ.get("SAT2_MODO", "simulado")
    # La API no ve el disco de la base: lo mide el worker, y su estado sale de la alerta abierta.
    controles = [
        ControlVisible(
            tipo=r.tipo, objeto=r.objeto, estado="ALERTA" if r.en_alerta else "OK", detalle=r.detalle
        )
        for r in evaluar(sesion, ahora, modo, None)
    ]
    disco = sesion.scalar(
        select(AlertaSistema).where(
            AlertaSistema.tipo == "DISCO_CASI_LLENO", AlertaSistema.cerrada_en.is_(None)
        )
    )
    controles.insert(
        len(controles) - 1,
        ControlVisible(
            tipo="DISCO_CASI_LLENO",
            objeto="",
            estado="ALERTA" if disco else "OK",
            detalle=disco.detalle if disco else "Sin alertas de espacio en el disco de la base.",
        ),
    )
    alertas = sesion.scalars(
        select(AlertaSistema)
        .order_by(AlertaSistema.abierta_en.desc(), AlertaSistema.id.desc())
        .limit(ALERTAS_VISIBLES)
    ).all()
    return EstadoSistema(
        controles=controles,
        worker=_estado_del_worker(sesion, ahora, modo),
        alertas=[
            AlertaVisible(
                tipo=a.tipo, objeto=a.objeto, abierta_en=a.abierta_en, cerrada_en=a.cerrada_en, detalle=a.detalle
            )
            for a in alertas
        ],
        base_tamano_bytes=sesion.scalar(select(func.pg_database_size(func.current_database()))),
    )


@router.api_route(
    "/{resto:path}",
    methods=["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    include_in_schema=False,
)
def ruta_inexistente(resto: str) -> None:
    """Sin esto, un método no admitido daría 405 y revelaría que la ruta existe."""
    raise HTTPException(status.HTTP_404_NOT_FOUND)
