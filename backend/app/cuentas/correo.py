"""Correos de las cuentas: plantillas y bandeja de salida (D4 y D6 de weather-track-registro-cuentas).

La API solo encola: el worker envía. Todo correo lleva un enlace de baja en el cuerpo y en las
cabeceras `List-Unsubscribe`. Los códigos viajan después de `#`, que el navegador no envía al
servidor; la baja en un clic de la cabecera es la única excepción.
"""

import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from html import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.cuentas.enlaces import BAJA, CONFIRMACION, RECUPERO, emitir_enlace
from app.datos.modelos import CorreoSaliente, Usuario
from app.dominio.normalizacion import ZONA_ARGENTINA

CORREO_CONFIRMACION = "CONFIRMACION"
CORREO_YA_REGISTRADO = "YA_REGISTRADO"
CORREO_RECUPERO = "RECUPERO"
CORREO_CLAVE_CAMBIADA = "CLAVE_CAMBIADA"

# El enlace de un solo uso que necesita cada tipo, además del de baja.
ENLACE_DEL_TIPO = {
    CORREO_CONFIRMACION: CONFIRMACION,
    CORREO_YA_REGISTRADO: None,
    CORREO_RECUPERO: RECUPERO,
    CORREO_CLAVE_CAMBIADA: None,
}
MAXIMO_POR_HORA = 3


@dataclass(frozen=True)
class Mensaje:
    asunto: str
    texto: str
    html: str
    cabeceras: dict[str, str]


def url_publica() -> str:
    return os.environ.get("URL_PUBLICA", "http://localhost:8080").rstrip("/")


def _parrafos(tipo: str, nombre: str, base: str, codigo: str | None, ahora: datetime) -> tuple[str, list[str]]:
    """Asunto y párrafos. Los enlaces van solos en su propio párrafo."""
    saludo = f"Hola, {nombre}:"
    if tipo == CORREO_CONFIRMACION:
        return "Confirme su cuenta de Weather Track", [
            saludo,
            "Para activar su cuenta, abra este enlace dentro de las próximas 48 horas:",
            f"{base}/confirmar#codigo={codigo}",
            "Si no la confirma a tiempo, la cuenta y sus datos se borran.",
        ]
    if tipo == CORREO_YA_REGISTRADO:
        return "Ya tiene una cuenta en Weather Track", [
            saludo,
            "Alguien intentó registrarse con este correo, que ya tiene una cuenta. "
            "Si fue usted, puede ingresar como siempre o recuperar la contraseña:",
            f"{base}/recuperar",
            "Si no fue usted, puede ignorar este mensaje: su cuenta no cambió.",
        ]
    if tipo == CORREO_RECUPERO:
        return "Elija una contraseña nueva para Weather Track", [
            saludo,
            "Para elegir una contraseña nueva, abra este enlace dentro de los próximos 30 minutos:",
            f"{base}/restablecer#codigo={codigo}",
            "Si no lo pidió, ignore este mensaje: su contraseña no cambia.",
        ]
    if tipo == CORREO_CLAVE_CAMBIADA:
        fecha = ahora.astimezone(ZONA_ARGENTINA).strftime("%d/%m/%Y %H:%M")
        return "Su contraseña de Weather Track cambió", [
            saludo,
            f"La contraseña de su cuenta cambió el {fecha}, hora de Argentina, y se cerraron las sesiones abiertas.",
            "Si no fue usted, recupere el acceso ahora:",
            f"{base}/recuperar",
        ]
    raise ValueError(f"Tipo de correo desconocido: {tipo}")


def armar_mensaje(
    tipo: str,
    usuario: Usuario,
    codigo_baja: str,
    ahora: datetime,
    codigo: str | None = None,
    base: str | None = None,
) -> Mensaje:
    base = base or url_publica()
    asunto, parrafos = _parrafos(tipo, usuario.nombre, base, codigo, ahora)
    enlace_baja = f"{base}/baja#codigo={codigo_baja}"
    leyenda = "Para darse de baja y borrar su cuenta y todos sus datos, abra este enlace:"
    parrafos = [*parrafos, "—", leyenda, enlace_baja, "Weather Track"]

    texto = "\n\n".join(p for p in parrafos if p != "—")
    html_parrafos = []
    for parrafo in parrafos:
        if parrafo == "—":
            html_parrafos.append('<hr style="border:none;border-top:1px solid #d5dce3">')
        elif parrafo.startswith(base):
            html_parrafos.append(f'<p><a href="{escape(parrafo)}">{escape(parrafo)}</a></p>')
        else:
            html_parrafos.append(f"<p>{escape(parrafo)}</p>")
    html = (
        '<!doctype html><html lang="es"><body style="font-family:system-ui,sans-serif;'
        f'color:#1b2733;line-height:1.45">{"".join(html_parrafos)}</body></html>'
    )
    cabeceras = {
        "List-Unsubscribe": f"<{base}/api/v1/cuenta/baja-un-clic?codigo={codigo_baja}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }
    return Mensaje(asunto=asunto, texto=texto, html=html, cabeceras=cabeceras)


def correos_recientes(sesion: Session, destinatario: str, tipo: str, ahora: datetime) -> int:
    return sesion.scalar(
        select(func.count())
        .select_from(CorreoSaliente)
        .where(
            CorreoSaliente.destinatario == destinatario,
            CorreoSaliente.tipo == tipo,
            CorreoSaliente.creado_en > ahora - timedelta(hours=1),
        )
    )


def encolar_correo(sesion: Session, usuario: Usuario, tipo: str, ahora: datetime) -> bool:
    """Emite los enlaces del correo y lo deja en la bandeja de salida. No hace commit.

    Devuelve False, sin emitir ni encolar nada, si ese destinatario ya recibió 3 correos de ese
    tipo en la última hora: así un enlace anterior todavía vigente no queda anulado.
    """
    if correos_recientes(sesion, usuario.email, tipo, ahora) >= MAXIMO_POR_HORA:
        return False
    proposito = ENLACE_DEL_TIPO[tipo]
    codigo = emitir_enlace(sesion, usuario, proposito, ahora) if proposito else None
    codigo_baja = emitir_enlace(sesion, usuario, BAJA, ahora)
    mensaje = armar_mensaje(tipo, usuario, codigo_baja, ahora, codigo)
    sesion.add(
        CorreoSaliente(
            tipo=tipo,
            destinatario=usuario.email,
            asunto=mensaje.asunto,
            cuerpo_texto=mensaje.texto,
            cuerpo_html=mensaje.html,
            cabeceras=mensaje.cabeceras,
            creado_en=ahora,
            proximo_intento_en=ahora,
        )
    )
    sesion.flush()
    return True
