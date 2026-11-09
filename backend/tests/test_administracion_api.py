"""Escenarios de `administration` contra la API y PostgreSQL (weather-track-administracion-sat2).

Todos los valores de SAT2 son ficticios: las pruebas nunca usan credenciales reales.
"""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.api.dependencias import obtener_ahora, obtener_sesion_bd
from app.api.principal import app
from app.cifrado_sat2 import descifrar, generar_par_de_claves
from app.cuentas.correo import CORREO_CONFIGURACION_SAT2
from app.datos.modelos import (
    ConfiguracionSat2,
    CorreoSaliente,
    EjecucionIngesta,
    Estacion,
    IntentoAcceso,
    Usuario,
)
from app.seguridad import calcular_hash_contrasena

CLAVE = "clave-de-prueba-larga"
ADMIN = "admin@ejemplo.example"
COMUN = "comun@ejemplo.example"
LOGIN = "/api/v1/auth/login"
CUENTA = "/api/v1/cuenta"
SAT2 = "/api/v1/administracion/sat2"
INICIO = datetime(2026, 11, 8, 12, 0, tzinfo=UTC)
CONFIGURACION = {
    "url_base": "https://sat2.ejemplo.invalid/api",
    "usuario": "usuario-ficticio-sat2",
    "clave": "contrasena-ficticia-sat2",
}


class Reloj:
    def __init__(self):
        self.ahora = INICIO

    def avanzar(self, **tiempo):
        self.ahora += timedelta(**tiempo)

    def __call__(self):
        return self.ahora


@pytest.fixture
def reloj():
    return Reloj()


@pytest.fixture
def claves(monkeypatch):
    publica, privada = generar_par_de_claves()
    monkeypatch.setenv("SAT2_CLAVE_PUBLICA", publica)
    monkeypatch.delenv("SAT2_CLAVE_PRIVADA", raising=False)
    return publica, privada


@pytest.fixture
def cliente(sesion, reloj, claves, monkeypatch):
    monkeypatch.setenv("COOKIE_SEGURA", "false")
    app.dependency_overrides[obtener_sesion_bd] = lambda: sesion
    app.dependency_overrides[obtener_ahora] = reloj
    yield TestClient(app)
    app.dependency_overrides.clear()


def crear_usuario(sesion, email, *, administrador=False, activo=True, nombre="Persona"):
    usuario = Usuario(
        email=email,
        nombre=nombre,
        password_hash=calcular_hash_contrasena(CLAVE),
        confirmado_en=INICIO,
        es_administrador=administrador,
        activo=activo,
    )
    sesion.add(usuario)
    sesion.commit()
    return usuario


@pytest.fixture
def admin(sesion):
    return crear_usuario(sesion, ADMIN, administrador=True, nombre="Admin")


@pytest.fixture
def comun(sesion):
    return crear_usuario(sesion, COMUN)


def ingresar(cliente, email):
    respuesta = cliente.post(LOGIN, json={"email": email, "contrasena": CLAVE})
    assert respuesta.status_code == 200
    return respuesta


def guardar(cliente, contrasena=CLAVE, **cambios):
    return cliente.put(SAT2, json={**CONFIGURACION, "contrasena_actual": contrasena, **cambios})


def contar(sesion, modelo):
    return sesion.scalar(select(func.count()).select_from(modelo))


# Rol en la sesión


def test_el_ingreso_informa_el_rol(cliente, admin, comun):
    assert ingresar(cliente, ADMIN).json()["es_administrador"] is True
    assert cliente.get(CUENTA).json()["es_administrador"] is True

    otro = TestClient(app)
    assert ingresar(otro, COMUN).json()["es_administrador"] is False
    assert otro.get(CUENTA).json()["es_administrador"] is False


def test_actualizar_la_cuenta_ignora_el_rol(cliente, sesion, comun):
    ingresar(cliente, COMUN)
    datos = {
        "nombre": "Otra",
        "apellido": "Pérez",
        "localidad": "Junín",
        "provincia": "Buenos Aires",
        "es_administrador": True,
    }

    respuesta = cliente.put(CUENTA, json=datos)

    assert respuesta.status_code == 200
    assert respuesta.json()["es_administrador"] is False
    sesion.refresh(comun)
    assert comun.es_administrador is False


# Invisible para el resto


def pedidos():
    return [
        ("get", SAT2, None),
        ("put", SAT2, {**CONFIGURACION, "contrasena_actual": CLAVE}),
        ("put", SAT2, {"url_base": ""}),
        ("delete", SAT2, None),
        ("post", SAT2, {}),
        ("patch", SAT2, {}),
        ("options", SAT2, None),
        ("get", "/api/v1/administracion", None),
        ("get", "/api/v1/administracion/otra", None),
    ]


def respuesta_de(cliente, metodo, ruta, cuerpo):
    if cuerpo is None:
        return cliente.request(metodo.upper(), ruta)
    return cliente.request(metodo.upper(), ruta, json=cuerpo)


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), pedidos())
@pytest.mark.parametrize("quien", ["sin_sesion", "comun"])
def test_para_el_resto_las_rutas_no_existen(cliente, comun, quien, metodo, ruta, cuerpo):
    if quien == "comun":
        ingresar(cliente, COMUN)
    inexistente = respuesta_de(cliente, metodo, "/api/v1/no-existe", cuerpo)

    respuesta = respuesta_de(cliente, metodo, ruta, cuerpo)

    assert respuesta.status_code == 404
    assert respuesta.json() == inexistente.json()
    assert respuesta.headers["content-type"] == inexistente.headers["content-type"]


def test_una_cuenta_desactivada_no_ve_la_administracion(cliente, sesion, admin):
    ingresar(cliente, ADMIN)
    admin.activo = False
    sesion.commit()

    assert cliente.get(SAT2).status_code == 404


def test_al_quitar_el_rol_deja_de_ver_la_administracion(cliente, sesion, admin):
    ingresar(cliente, ADMIN)
    assert cliente.get(SAT2).status_code == 200

    admin.es_administrador = False
    sesion.commit()

    assert cliente.get(SAT2).status_code == 404


def test_una_cuenta_comun_no_cuenta_para_el_limite_ni_los_intentos(cliente, sesion, comun):
    ingresar(cliente, COMUN)

    guardar(cliente, contrasena="mal")

    assert contar(sesion, IntentoAcceso) == 0
    assert contar(sesion, ConfiguracionSat2) == 0


# Consulta


def test_estado_inicial(cliente, admin):
    ingresar(cliente, ADMIN)

    estado = cliente.get(SAT2).json()

    assert estado == {
        "configuracion_guardada": False,
        "puede_guardar": True,
        "modo": "simulado",
        "cargada_en": None,
        "cargada_por": None,
        "ultimo_ciclo": None,
        "cambios": [],
    }


@pytest.mark.parametrize("clave", [None, "", "no-es-una-clave"])
def test_sin_clave_publica_no_se_puede_guardar(cliente, sesion, admin, monkeypatch, clave):
    if clave is None:
        monkeypatch.delenv("SAT2_CLAVE_PUBLICA")
    else:
        monkeypatch.setenv("SAT2_CLAVE_PUBLICA", clave)
    ingresar(cliente, ADMIN)

    assert cliente.get(SAT2).json()["puede_guardar"] is False
    respuesta = guardar(cliente)

    assert respuesta.status_code == 503
    assert respuesta.json()["codigo"] == "SERVIDOR_SIN_CLAVE"
    assert contar(sesion, ConfiguracionSat2) == 0
    assert contar(sesion, IntentoAcceso) == 0


def test_muestra_el_ultimo_ciclo(cliente, sesion, admin):
    estacion = Estacion(id_equipo_sat2=1, nombre="E", latitud=Decimal("-34"), longitud=Decimal("-60"))
    sesion.add(estacion)
    sesion.flush()
    for minutos, resultado in ((20, "EXITO"), (10, "ERROR")):
        momento = INICIO - timedelta(minutes=minutos)
        sesion.add(
            EjecucionIngesta(
                estacion_id=estacion.id,
                tipo="CICLO",
                iniciada_en=momento,
                finalizada_en=momento,
                resultado=resultado,
            )
        )
    sesion.commit()
    ingresar(cliente, ADMIN)

    ultimo = cliente.get(SAT2).json()["ultimo_ciclo"]

    assert ultimo["resultado"] == "ERROR"
    assert datetime.fromisoformat(ultimo["finalizado_en"]) == INICIO - timedelta(minutes=10)


# Guardado


def test_guarda_la_configuracion_cifrada(cliente, sesion, admin, claves):
    ingresar(cliente, ADMIN)

    respuesta = guardar(cliente)

    assert respuesta.status_code == 200
    estado = respuesta.json()
    assert estado["configuracion_guardada"] is True
    assert estado["cargada_por"] == ADMIN
    assert datetime.fromisoformat(estado["cargada_en"]) == INICIO
    fila = sesion.get(ConfiguracionSat2, 1)
    assert fila.cargada_por == admin.id
    assert descifrar(fila.contenido_cifrado, claves[1]) == CONFIGURACION


def test_las_respuestas_no_contienen_los_valores(cliente, admin):
    ingresar(cliente, ADMIN)

    textos = [guardar(cliente).text, cliente.get(SAT2).text]

    for texto in textos:
        for valor in CONFIGURACION.values():
            assert valor not in texto


def test_los_registros_no_contienen_los_valores(cliente, admin, caplog):
    ingresar(cliente, ADMIN)
    with caplog.at_level(logging.DEBUG):
        guardar(cliente)
        guardar(cliente, url_base="ftp://mal")

    for valor in [*CONFIGURACION.values(), CLAVE]:
        assert valor not in caplog.text


def test_reemplaza_la_configuracion_y_registra_cada_cambio(cliente, sesion, admin, reloj, claves):
    ingresar(cliente, ADMIN)
    guardar(cliente)
    reloj.avanzar(minutes=5)

    estado = guardar(cliente, usuario="otro-usuario-ficticio").json()

    assert contar(sesion, ConfiguracionSat2) == 1
    fila = sesion.get(ConfiguracionSat2, 1)
    sesion.refresh(fila)
    assert descifrar(fila.contenido_cifrado, claves[1])["usuario"] == "otro-usuario-ficticio"
    assert [datetime.fromisoformat(c["ocurrido_en"]) for c in estado["cambios"]] == [
        INICIO + timedelta(minutes=5),
        INICIO,
    ]
    assert {c["email"] for c in estado["cambios"]} == {ADMIN}


def test_muestra_los_ultimos_diez_cambios(cliente, admin, reloj):
    ingresar(cliente, ADMIN)
    for _ in range(12):
        guardar(cliente)
        reloj.avanzar(minutes=1)

    cambios = cliente.get(SAT2).json()["cambios"]

    assert len(cambios) == 10
    assert datetime.fromisoformat(cambios[0]["ocurrido_en"]) == INICIO + timedelta(minutes=11)


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("url_base", ""),
        ("url_base", "   "),
        ("url_base", "sat2.ejemplo.invalid"),
        ("url_base", "ftp://sat2.ejemplo.invalid"),
        ("url_base", "https://"),
        ("url_base", "https://sat2 .ejemplo.invalid"),
        ("usuario", ""),
        ("usuario", "  "),
        ("clave", ""),
        ("contrasena_actual", ""),
    ],
)
def test_un_campo_invalido_no_guarda_nada(cliente, sesion, admin, campo, valor):
    ingresar(cliente, ADMIN)

    respuesta = guardar(cliente, **{campo: valor})

    assert respuesta.status_code == 422
    assert set(respuesta.json()["campos"]) == {campo}
    assert contar(sesion, ConfiguracionSat2) == 0
    assert contar(sesion, IntentoAcceso) == 0


def test_acepta_una_url_sin_cifrado(cliente, admin, claves, sesion):
    ingresar(cliente, ADMIN)

    assert guardar(cliente, url_base="http://sat2.ejemplo.invalid").status_code == 200
    fila = sesion.get(ConfiguracionSat2, 1)
    assert descifrar(fila.contenido_cifrado, claves[1])["url_base"] == "http://sat2.ejemplo.invalid"


def test_la_clave_de_sat2_no_se_recorta(cliente, admin, claves, sesion):
    ingresar(cliente, ADMIN)

    guardar(cliente, clave=" con espacios ")

    fila = sesion.get(ConfiguracionSat2, 1)
    assert descifrar(fila.contenido_cifrado, claves[1])["clave"] == " con espacios "


# Contraseña del administrador


def test_una_contrasena_incorrecta_no_guarda_y_cuenta_como_intento(cliente, sesion, admin):
    ingresar(cliente, ADMIN)

    respuesta = guardar(cliente, contrasena="incorrecta")

    assert respuesta.status_code == 400
    assert respuesta.json()["codigo"] == "CONTRASENA_INCORRECTA"
    assert set(respuesta.json()["campos"]) == {"contrasena_actual"}
    assert contar(sesion, ConfiguracionSat2) == 0
    assert sesion.scalar(select(IntentoAcceso.email)) == ADMIN


def test_cinco_contrasenas_incorrectas_bloquean(cliente, sesion, admin):
    ingresar(cliente, ADMIN)
    for _ in range(5):
        assert guardar(cliente, contrasena="incorrecta").status_code == 400

    respuesta = guardar(cliente)

    assert respuesta.status_code == 429
    assert respuesta.json()["codigo"] == "DEMASIADOS_INTENTOS"
    assert contar(sesion, ConfiguracionSat2) == 0
    otro = TestClient(app)
    assert otro.post(LOGIN, json={"email": ADMIN, "contrasena": CLAVE}).status_code == 429


# Aviso por correo


def test_avisa_a_cada_administrador_activo(cliente, sesion, admin, comun):
    otro = crear_usuario(sesion, "otro-admin@ejemplo.example", administrador=True)
    crear_usuario(sesion, "inactivo@ejemplo.example", administrador=True, activo=False)
    ingresar(cliente, ADMIN)

    guardar(cliente)

    correos = sesion.scalars(
        select(CorreoSaliente).where(CorreoSaliente.tipo == CORREO_CONFIGURACION_SAT2)
    ).all()
    assert {c.destinatario for c in correos} == {ADMIN, otro.email}
    for correo in correos:
        assert ADMIN in correo.cuerpo_texto
        assert "/baja#codigo=" in correo.cuerpo_texto
        assert "List-Unsubscribe" in correo.cabeceras
        for valor in CONFIGURACION.values():
            assert valor not in correo.cuerpo_texto
            assert valor not in correo.cuerpo_html


def test_una_contrasena_incorrecta_no_envia_avisos(cliente, sesion, admin):
    ingresar(cliente, ADMIN)

    guardar(cliente, contrasena="incorrecta")

    assert contar(sesion, CorreoSaliente) == 0
