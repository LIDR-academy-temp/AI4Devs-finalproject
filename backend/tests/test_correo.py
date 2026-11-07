"""Correos de las cuentas: escenarios de `transactional-email` de weather-track-registro-cuentas."""

import logging
from datetime import UTC, datetime, timedelta
from typing import ClassVar

import pytest
from sqlalchemy import func, select

from app.cuentas import envio
from app.cuentas.correo import (
    CORREO_CLAVE_CAMBIADA,
    CORREO_CONFIRMACION,
    CORREO_RECUPERO,
    CORREO_YA_REGISTRADO,
    armar_mensaje,
    encolar_correo,
)
from app.cuentas.enlaces import CONFIRMACION, usar_enlace
from app.cuentas.envio import (
    MAXIMO_INTENTOS,
    ConfiguracionSmtp,
    cargar_configuracion_smtp,
    enviador_smtp,
    enviar_pendientes,
)
from app.datos.modelos import CorreoSaliente, EnlaceCuenta, Usuario

AHORA = datetime(2026, 11, 4, 15, 0, tzinfo=UTC)
BASE = "https://weathertrack.ejemplo.com"
REMITENTE = "Weather Track <no-responder@ejemplo.com>"
TODOS = [CORREO_CONFIRMACION, CORREO_YA_REGISTRADO, CORREO_RECUPERO, CORREO_CLAVE_CAMBIADA]


@pytest.fixture
def usuario(sesion):
    registro = Usuario(email="persona@ejemplo.com", nombre="Ana <b>", password_hash="hash")
    sesion.add(registro)
    sesion.flush()
    return registro


@pytest.fixture(autouse=True)
def url_publica(monkeypatch):
    monkeypatch.setenv("URL_PUBLICA", BASE + "/")


def contar(sesion, modelo, *condiciones) -> int:
    return sesion.scalar(select(func.count()).select_from(modelo).where(*condiciones))


# Plantillas


@pytest.mark.parametrize("tipo", TODOS)
def test_todo_correo_lleva_la_baja_en_el_cuerpo_y_en_las_cabeceras(usuario, tipo):
    mensaje = armar_mensaje(tipo, usuario, "BAJA123", AHORA, codigo="COD456")

    assert "darse de baja y borrar su cuenta" in mensaje.texto
    assert f"{BASE}/baja#codigo=BAJA123" in mensaje.texto
    assert f'href="{BASE}/baja#codigo=BAJA123"' in mensaje.html
    assert mensaje.cabeceras == {
        "List-Unsubscribe": f"<{BASE}/api/v1/cuenta/baja-un-clic?codigo=BAJA123>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }


@pytest.mark.parametrize(
    ("tipo", "asunto", "enlace"),
    [
        (CORREO_CONFIRMACION, "Confirme su cuenta de Weather Track", "/confirmar#codigo=COD456"),
        (CORREO_RECUPERO, "Elija una contraseña nueva para Weather Track", "/restablecer#codigo=COD456"),
        (CORREO_YA_REGISTRADO, "Ya tiene una cuenta en Weather Track", "/recuperar"),
        (CORREO_CLAVE_CAMBIADA, "Su contraseña de Weather Track cambió", "/recuperar"),
    ],
)
def test_cada_tipo_tiene_su_asunto_y_su_enlace(usuario, tipo, asunto, enlace):
    mensaje = armar_mensaje(tipo, usuario, "BAJA123", AHORA, codigo="COD456")
    assert mensaje.asunto == asunto
    assert BASE + enlace in mensaje.texto


@pytest.mark.parametrize("tipo", [CORREO_YA_REGISTRADO, CORREO_CLAVE_CAMBIADA])
def test_los_avisos_no_llevan_otro_codigo_que_el_de_baja(usuario, tipo):
    mensaje = armar_mensaje(tipo, usuario, "BAJA123", AHORA, codigo="COD456")
    assert "COD456" not in mensaje.texto


def test_los_codigos_van_despues_de_la_almohadilla_salvo_la_baja_en_un_clic(usuario):
    mensaje = armar_mensaje(CORREO_RECUPERO, usuario, "BAJA123", AHORA, codigo="COD456")
    assert "?codigo=" not in mensaje.texto
    assert "?codigo=" not in mensaje.html


def test_el_html_escapa_los_datos_de_la_persona(usuario):
    mensaje = armar_mensaje(CORREO_CONFIRMACION, usuario, "BAJA123", AHORA, codigo="COD456")
    assert "Ana &lt;b&gt;" in mensaje.html
    assert "<b>" not in mensaje.html


def test_el_aviso_de_cambio_de_clave_usa_la_hora_de_argentina(usuario):
    mensaje = armar_mensaje(CORREO_CLAVE_CAMBIADA, usuario, "BAJA123", AHORA)
    assert "04/11/2026 12:00, hora de Argentina" in mensaje.texto


# Bandeja de salida


def test_encolar_emite_los_enlaces_y_guarda_el_correo(sesion, usuario):
    assert encolar_correo(sesion, usuario, CORREO_CONFIRMACION, AHORA) is True

    correo = sesion.scalar(select(CorreoSaliente))
    assert (correo.tipo, correo.destinatario) == (CORREO_CONFIRMACION, "persona@ejemplo.com")
    assert correo.proximo_intento_en == AHORA
    assert correo.cabeceras["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    propositos = sorted(sesion.scalars(select(EnlaceCuenta.proposito)))
    assert propositos == ["BAJA", "CONFIRMACION"]


def test_el_codigo_del_correo_sirve(sesion, usuario):
    encolar_correo(sesion, usuario, CORREO_CONFIRMACION, AHORA)
    correo = sesion.scalar(select(CorreoSaliente))
    codigo = correo.cuerpo_texto.split("/confirmar#codigo=")[1].split()[0]
    assert usar_enlace(sesion, codigo, CONFIRMACION, AHORA) == usuario


def test_no_encola_mas_de_tres_correos_del_mismo_tipo_por_hora(sesion, usuario):
    for minuto in range(3):
        assert encolar_correo(sesion, usuario, CORREO_RECUPERO, AHORA + timedelta(minutes=minuto))
    enlaces = contar(sesion, EnlaceCuenta)

    assert encolar_correo(sesion, usuario, CORREO_RECUPERO, AHORA + timedelta(minutes=5)) is False
    assert contar(sesion, CorreoSaliente) == 3
    # No emitió enlaces: el último que recibió sigue sirviendo.
    assert contar(sesion, EnlaceCuenta) == enlaces


def test_el_tope_es_por_tipo_y_se_renueva_a_la_hora(sesion, usuario):
    for minuto in range(3):
        encolar_correo(sesion, usuario, CORREO_RECUPERO, AHORA + timedelta(minutes=minuto))

    assert encolar_correo(sesion, usuario, CORREO_CLAVE_CAMBIADA, AHORA + timedelta(minutes=5))
    assert encolar_correo(sesion, usuario, CORREO_RECUPERO, AHORA + timedelta(minutes=61))


# Envío


class Buzon:
    def __init__(self, fallas=0):
        self.recibidos = []
        self.fallas = fallas

    def __call__(self, mensaje):
        if self.fallas:
            self.fallas -= 1
            raise ConnectionRefusedError("sin servidor")
        self.recibidos.append(mensaje)


def test_envia_el_correo_y_borra_su_contenido(sesion, usuario):
    encolar_correo(sesion, usuario, CORREO_CONFIRMACION, AHORA)
    buzon = Buzon()

    assert enviar_pendientes(sesion, buzon, REMITENTE, AHORA) == 1

    [mensaje] = buzon.recibidos
    assert mensaje["To"] == "persona@ejemplo.com"
    assert mensaje["From"] == REMITENTE
    assert mensaje["Subject"] == "Confirme su cuenta de Weather Track"
    assert mensaje["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    tipos = [parte.get_content_type() for parte in mensaje.iter_parts()]
    assert tipos == ["text/plain", "text/html"]

    correo = sesion.scalar(select(CorreoSaliente))
    assert correo.enviado_en == AHORA
    assert (correo.asunto, correo.cuerpo_texto, correo.cuerpo_html, correo.cabeceras) == (None,) * 4
    assert (correo.tipo, correo.destinatario) == (CORREO_CONFIRMACION, "persona@ejemplo.com")


def test_la_baja_en_un_clic_sale_sin_codificar(sesion, usuario):
    encolar_correo(sesion, usuario, CORREO_RECUPERO, AHORA)
    buzon = Buzon()
    enviar_pendientes(sesion, buzon, REMITENTE, AHORA)

    crudo = buzon.recibidos[0].as_bytes().decode()
    linea = next(l for l in crudo.splitlines() if l.startswith("List-Unsubscribe:"))
    assert linea.startswith(f"List-Unsubscribe: <{BASE}/api/v1/cuenta/baja-un-clic?codigo=")
    assert linea.endswith(">")
    # El asunto con eñe sí se codifica, como corresponde; la URL de baja no.
    assert "=?utf-8?" not in linea


def test_un_servidor_caido_no_pierde_el_correo(sesion, usuario):
    encolar_correo(sesion, usuario, CORREO_CONFIRMACION, AHORA)

    assert enviar_pendientes(sesion, Buzon(fallas=1), REMITENTE, AHORA) == 0
    correo = sesion.scalar(select(CorreoSaliente))
    assert correo.intentos == 1
    assert correo.proximo_intento_en == AHORA + timedelta(minutes=1)
    assert correo.cuerpo_texto

    buzon = Buzon()
    assert enviar_pendientes(sesion, buzon, REMITENTE, AHORA + timedelta(seconds=30)) == 0
    assert enviar_pendientes(sesion, buzon, REMITENTE, AHORA + timedelta(minutes=1)) == 1
    assert len(buzon.recibidos) == 1


def test_descarta_el_correo_tras_el_ultimo_intento(sesion, usuario):
    encolar_correo(sesion, usuario, CORREO_CONFIRMACION, AHORA)
    momento = AHORA
    for _ in range(MAXIMO_INTENTOS):
        enviar_pendientes(sesion, Buzon(fallas=1), REMITENTE, momento)
        momento += timedelta(hours=7)

    correo = sesion.scalar(select(CorreoSaliente))
    assert correo.descartado_en is not None
    assert correo.cuerpo_texto is None
    assert enviar_pendientes(sesion, Buzon(), REMITENTE, momento) == 0


def test_los_registros_no_muestran_direcciones_ni_codigos(sesion, usuario, caplog):
    encolar_correo(sesion, usuario, CORREO_RECUPERO, AHORA)
    with caplog.at_level(logging.WARNING):
        enviar_pendientes(sesion, Buzon(fallas=1), REMITENTE, AHORA)
    assert "ConnectionRefusedError" in caplog.text
    assert "persona@ejemplo.com" not in caplog.text
    assert "codigo" not in caplog.text


def test_borra_el_registro_de_los_correos_de_mas_de_un_dia(sesion, usuario):
    encolar_correo(sesion, usuario, CORREO_CONFIRMACION, AHORA)
    enviar_pendientes(sesion, Buzon(), REMITENTE, AHORA)

    enviar_pendientes(sesion, Buzon(), REMITENTE, AHORA + timedelta(hours=23))
    assert contar(sesion, CorreoSaliente) == 1
    enviar_pendientes(sesion, Buzon(), REMITENTE, AHORA + timedelta(days=1, minutes=1))
    assert contar(sesion, CorreoSaliente) == 0


# Configuración


def test_sin_servidor_no_hay_envio():
    assert cargar_configuracion_smtp({}) is None


def test_lee_la_configuracion_sin_mostrar_la_clave():
    configuracion = cargar_configuracion_smtp(
        {
            "SMTP_HOST": "smtp.ejemplo.com",
            "SMTP_PUERTO": "587",
            "SMTP_USUARIO": "cuenta",
            "SMTP_CLAVE": "clave-secreta",
            "CORREO_REMITENTE": REMITENTE,
        }
    )
    assert configuracion.host == "smtp.ejemplo.com"
    assert configuracion.puerto == 587
    assert configuracion.starttls is True
    assert configuracion.remitente == REMITENTE
    assert "clave-secreta" not in repr(configuracion)
    assert "cuenta" not in repr(configuracion)


class ServidorFalso:
    llamadas: ClassVar[list[str]] = []

    def __init__(self, host, puerto, timeout):
        ServidorFalso.llamadas = [f"conectar {host}:{puerto}"]

    def __enter__(self):
        return self

    def __exit__(self, *errores):
        return False

    def starttls(self):
        self.llamadas.append("starttls")

    def login(self, usuario, clave):
        self.llamadas.append(f"login {usuario}")

    def send_message(self, mensaje):
        self.llamadas.append("enviar")


@pytest.mark.parametrize(
    ("configuracion", "esperado"),
    [
        (
            ConfiguracionSmtp("smtp.ejemplo.com", 587, True, REMITENTE, "cuenta", "clave"),
            ["conectar smtp.ejemplo.com:587", "starttls", "login cuenta", "enviar"],
        ),
        (ConfiguracionSmtp("correo", 1025, False, REMITENTE), ["conectar correo:1025", "enviar"]),
    ],
)
def test_el_enviador_usa_starttls_y_credenciales_solo_si_corresponde(monkeypatch, configuracion, esperado):
    monkeypatch.setattr(envio.smtplib, "SMTP", ServidorFalso)
    enviador_smtp(configuracion)(object())
    assert ServidorFalso.llamadas == esperado
