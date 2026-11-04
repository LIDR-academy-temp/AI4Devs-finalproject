"""Envío de la bandeja de salida desde el worker (D4 y D5 de weather-track-registro-cuentas).

Los datos del servidor de correo solo llegan al worker. Los registros nunca muestran direcciones,
contenidos ni enlaces: solo el número de correo, su tipo y el tipo de error.
"""

import logging
import os
import smtplib
from email import policy
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.datos.modelos import CorreoSaliente

registro = logging.getLogger("weather_track.correo")

MAXIMO_INTENTOS = 8
ESPERA_MAXIMA = timedelta(hours=6)
LOTE = 20
# El tope por destinatario mira la última hora; pasado un día, no queda ni el registro del envío.
CONSERVAR_REGISTRO = timedelta(days=1)
REMITENTE_LOCAL = "Weather Track <no-responder@weathertrack.localhost>"
# Sin plegar ni codificar cabeceras de hasta 998 caracteres (RFC 5322): una URL codificada en
# List-Unsubscribe no la reconoce ningún programa de correo.
POLITICA = policy.SMTP.clone(max_line_length=998)

Enviador = Callable[[EmailMessage], None]


@dataclass(frozen=True)
class ConfiguracionSmtp:
    host: str
    puerto: int
    starttls: bool
    remitente: str
    usuario: str | None = field(default=None, repr=False)
    clave: str | None = field(default=None, repr=False)


def cargar_configuracion_smtp(entorno: Mapping[str, str] = os.environ) -> ConfiguracionSmtp | None:
    """Sin `SMTP_HOST`, no hay envío: los correos esperan en la bandeja."""
    host = entorno.get("SMTP_HOST", "").strip()
    if not host:
        return None
    return ConfiguracionSmtp(
        host=host,
        puerto=int(entorno.get("SMTP_PUERTO", "587")),
        starttls=entorno.get("SMTP_STARTTLS", "true").strip().lower() == "true",
        remitente=entorno.get("CORREO_REMITENTE", "").strip() or REMITENTE_LOCAL,
        usuario=entorno.get("SMTP_USUARIO") or None,
        clave=entorno.get("SMTP_CLAVE") or None,
    )


def enviador_smtp(configuracion: ConfiguracionSmtp) -> Enviador:
    def enviar(mensaje: EmailMessage) -> None:
        with smtplib.SMTP(configuracion.host, configuracion.puerto, timeout=20) as servidor:
            if configuracion.starttls:
                servidor.starttls()
            if configuracion.usuario:
                servidor.login(configuracion.usuario, configuracion.clave or "")
            servidor.send_message(mensaje)

    return enviar


def construir_mensaje(correo: CorreoSaliente, remitente: str) -> EmailMessage:
    mensaje = EmailMessage(policy=POLITICA)
    mensaje["From"] = remitente
    mensaje["To"] = correo.destinatario
    mensaje["Subject"] = correo.asunto
    mensaje["Date"] = formatdate(localtime=False)
    mensaje["Message-ID"] = make_msgid(domain="weathertrack.localhost")
    for nombre, valor in (correo.cabeceras or {}).items():
        mensaje[nombre] = valor
    mensaje.set_content(correo.cuerpo_texto or "")
    mensaje.add_alternative(correo.cuerpo_html or "", subtype="html")
    return mensaje


def _vaciar(correo: CorreoSaliente) -> None:
    correo.asunto = None
    correo.cuerpo_texto = None
    correo.cuerpo_html = None
    correo.cabeceras = None


def espera_tras(intentos: int) -> timedelta:
    """1, 2, 4, 8… minutos, hasta 6 horas."""
    return min(timedelta(minutes=2 ** (intentos - 1)), ESPERA_MAXIMA)


def enviar_pendientes(
    sesion: Session, enviar: Enviador, remitente: str, ahora: datetime
) -> int:
    """Envía los correos que corresponden y devuelve cuántos salieron. Hace commit."""
    pendientes = sesion.scalars(
        select(CorreoSaliente)
        .where(
            CorreoSaliente.enviado_en.is_(None),
            CorreoSaliente.descartado_en.is_(None),
            CorreoSaliente.proximo_intento_en <= ahora,
        )
        .order_by(CorreoSaliente.proximo_intento_en)
        .limit(LOTE)
        .with_for_update(skip_locked=True)
    ).all()
    enviados = 0
    for correo in pendientes:
        try:
            enviar(construir_mensaje(correo, remitente))
        except (OSError, smtplib.SMTPException) as error:
            correo.intentos += 1
            if correo.intentos >= MAXIMO_INTENTOS:
                correo.descartado_en = ahora
                _vaciar(correo)
                registro.error("Correo %s (%s) descartado: %s", correo.id, correo.tipo, type(error).__name__)
            else:
                correo.proximo_intento_en = ahora + espera_tras(correo.intentos)
                registro.warning("Correo %s (%s) no salió: %s", correo.id, correo.tipo, type(error).__name__)
        else:
            correo.intentos += 1
            correo.enviado_en = ahora
            _vaciar(correo)
            enviados += 1
    sesion.execute(
        delete(CorreoSaliente).where(
            or_(
                CorreoSaliente.enviado_en < ahora - CONSERVAR_REGISTRO,
                CorreoSaliente.descartado_en < ahora - CONSERVAR_REGISTRO,
            )
        )
    )
    sesion.commit()
    return enviados
