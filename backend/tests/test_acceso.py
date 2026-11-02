"""Escenarios de `account-access`, contra la API y PostgreSQL."""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app import administracion
from app.administracion import ErrorAdministracion
from app.api import autenticacion
from app.api.dependencias import (
    EstacionAutorizada,
    obtener_ahora,
    obtener_sesion_bd,
)
from app.api.principal import app
from app.datos.modelos import Estacion, IntentoAcceso, Sesion, Usuario, UsuarioEstacion
from app.seguridad import (
    calcular_hash_contrasena,
    hash_de_identificador,
    verificar_contrasena,
)

CLAVE = "clave-de-prueba-larga"
EMAIL = "persona@ejemplo.example"
LOGIN = "/api/v1/auth/login"
LOGOUT = "/api/v1/auth/logout"
ESTACIONES = "/api/v1/estaciones"
INICIO = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)
GENERICO = "Correo o contraseña incorrectos."


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
def cliente(sesion, reloj, monkeypatch):
    monkeypatch.setenv("COOKIE_SEGURA", "false")
    app.dependency_overrides[obtener_sesion_bd] = lambda: sesion
    app.dependency_overrides[obtener_ahora] = reloj
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def usuario(sesion):
    registro = Usuario(
        email=EMAIL, nombre="Persona", password_hash=calcular_hash_contrasena(CLAVE)
    )
    sesion.add(registro)
    sesion.commit()
    return registro


def crear_estacion(sesion, id_equipo, nombre="Estación"):
    registro = Estacion(
        id_equipo_sat2=id_equipo,
        nombre=nombre,
        latitud=Decimal("-34"),
        longitud=Decimal("-60"),
    )
    sesion.add(registro)
    sesion.commit()
    return registro


def ingresar(cliente, email=EMAIL, contrasena=CLAVE):
    return cliente.post(LOGIN, json={"email": email, "contrasena": contrasena})


def contar(sesion, modelo):
    return sesion.scalar(select(func.count()).select_from(modelo))


# Inicio de sesión


def test_credenciales_validas(cliente, usuario):
    respuesta = ingresar(cliente)
    assert respuesta.status_code == 200
    assert respuesta.json() == {"email": EMAIL, "nombre": "Persona"}
    assert cliente.cookies.get("wt_sesion")


def test_el_correo_no_distingue_mayusculas(cliente, usuario):
    assert ingresar(cliente, email="  PERSONA@Ejemplo.Example ").status_code == 200


@pytest.mark.parametrize(
    ("email", "contrasena"),
    [(EMAIL, "otra-clave"), ("nadie@ejemplo.example", CLAVE)],
)
def test_credenciales_invalidas_dan_un_mismo_mensaje(cliente, usuario, email, contrasena):
    respuesta = ingresar(cliente, email, contrasena)
    assert respuesta.status_code == 401
    assert respuesta.json() == {"codigo": "CREDENCIALES_INVALIDAS", "mensaje": GENERICO}
    assert not cliente.cookies.get("wt_sesion")


def test_correo_inexistente_gasta_una_verificacion(cliente, usuario, monkeypatch):
    llamadas = []
    monkeypatch.setattr(autenticacion, "simular_verificacion", llamadas.append)
    ingresar(cliente, "nadie@ejemplo.example", "x")
    assert llamadas == ["x"]


def test_cuenta_desactivada_da_el_mismo_mensaje(cliente, sesion, usuario):
    usuario.activo = False
    sesion.commit()
    respuesta = ingresar(cliente)
    assert respuesta.status_code == 401
    assert respuesta.json()["mensaje"] == GENERICO


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"email": "", "contrasena": "x"},
        {"email": EMAIL},
        {"email": EMAIL, "contrasena": "x" * 1025},
    ],
)
def test_solicitud_invalida_no_repite_lo_enviado(cliente, cuerpo):
    respuesta = cliente.post(LOGIN, json=cuerpo)
    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "SOLICITUD_INVALIDA"
    assert "xxx" not in respuesta.text


def test_la_cookie_tiene_los_atributos_de_seguridad(cliente, usuario, monkeypatch):
    monkeypatch.setenv("COOKIE_SEGURA", "true")
    encabezado = ingresar(cliente).headers["set-cookie"]
    for atributo in ("HttpOnly", "Secure", "SameSite=lax", "Max-Age=28800", "Path=/api"):
        assert atributo in encabezado


def test_solo_se_guarda_el_hash_de_la_sesion(cliente, sesion, usuario):
    ingresar(cliente)
    identificador = cliente.cookies.get("wt_sesion")
    guardado = sesion.scalar(select(Sesion.hash_identificador))
    assert guardado == hash_de_identificador(identificador)
    assert guardado != identificador


def test_los_registros_no_contienen_secretos(cliente, usuario, caplog):
    with caplog.at_level(logging.DEBUG):
        ingresar(cliente)
        ingresar(cliente, contrasena="otra-clave-secreta")
    assert CLAVE not in caplog.text
    assert "otra-clave-secreta" not in caplog.text
    assert cliente.cookies.get("wt_sesion") not in caplog.text


# Límite de intentos


def fallar(cliente, veces=5):
    for _ in range(veces):
        assert ingresar(cliente, contrasena="mal").status_code == 401


def test_bloquea_tras_cinco_fallos_sin_evaluar_la_contrasena(cliente, usuario, monkeypatch):
    fallar(cliente)

    def prohibido(*_argumentos):
        raise AssertionError("No debe evaluar la contraseña")

    monkeypatch.setattr(autenticacion, "verificar_contrasena", prohibido)
    respuesta = ingresar(cliente)

    assert respuesta.status_code == 429
    assert respuesta.json()["codigo"] == "DEMASIADOS_INTENTOS"
    assert int(respuesta.headers["retry-after"]) > 0


def test_cuatro_fallos_no_bloquean(cliente, usuario):
    fallar(cliente, veces=4)
    assert ingresar(cliente).status_code == 200


def test_el_bloqueo_termina_a_los_quince_minutos_del_ultimo_fallo(cliente, usuario, reloj):
    fallar(cliente)
    reloj.avanzar(minutes=14, seconds=59)
    assert ingresar(cliente).status_code == 429
    reloj.avanzar(seconds=1)
    assert ingresar(cliente).status_code == 200


def test_un_ingreso_correcto_reinicia_los_fallos(cliente, sesion, usuario):
    fallar(cliente, veces=4)
    assert ingresar(cliente).status_code == 200
    assert contar(sesion, IntentoAcceso) == 0
    fallar(cliente, veces=4)
    assert ingresar(cliente).status_code == 200


def test_fallos_espaciados_no_bloquean(cliente, usuario, reloj):
    for _ in range(5):
        assert ingresar(cliente, contrasena="mal").status_code == 401
        reloj.avanzar(minutes=5)
    assert ingresar(cliente).status_code == 200


def test_el_bloqueo_es_por_correo_y_no_distingue_mayusculas(cliente, sesion, usuario):
    otra = Usuario(
        email="otra@ejemplo.example", nombre="Otra", password_hash=calcular_hash_contrasena(CLAVE)
    )
    sesion.add(otra)
    sesion.commit()
    for _ in range(5):
        ingresar(cliente, email=EMAIL.upper(), contrasena="mal")

    assert ingresar(cliente).status_code == 429
    assert ingresar(cliente, email=otra.email).status_code == 200


def test_correo_inexistente_tambien_se_bloquea(cliente):
    for _ in range(5):
        ingresar(cliente, "nadie@ejemplo.example", "mal")
    assert ingresar(cliente, "nadie@ejemplo.example", "mal").status_code == 429


# Vigencia y cierre


def test_sin_sesion_responde_401(cliente):
    respuesta = cliente.get(ESTACIONES)
    assert respuesta.status_code == 401
    assert respuesta.json()["codigo"] == "NO_AUTENTICADO"


def test_identificador_inventado_responde_401(cliente):
    cliente.cookies.set("wt_sesion", "inventado", path="/api")
    assert cliente.get(ESTACIONES).status_code == 401


def test_la_sesion_vence_a_las_ocho_horas(cliente, usuario, reloj):
    ingresar(cliente)
    reloj.avanzar(hours=7, minutes=59)
    assert cliente.get(ESTACIONES).status_code == 200
    reloj.avanzar(minutes=1)
    assert cliente.get(ESTACIONES).status_code == 401


def test_salir_invalida_la_sesion_de_inmediato(cliente, sesion, usuario):
    ingresar(cliente)
    identificador = cliente.cookies.get("wt_sesion")

    respuesta = cliente.post(LOGOUT)
    assert respuesta.status_code == 204
    assert contar(sesion, Sesion) == 0

    cliente.cookies.set("wt_sesion", identificador, path="/api")
    assert cliente.get(ESTACIONES).status_code == 401


def test_salir_sin_sesion_no_falla(cliente):
    assert cliente.post(LOGOUT).status_code == 204


def test_desactivar_una_cuenta_corta_su_sesion(cliente, sesion, usuario):
    ingresar(cliente)
    identificador = cliente.cookies.get("wt_sesion")
    administracion.desactivar_usuario(sesion, EMAIL)
    sesion.commit()
    cliente.cookies.set("wt_sesion", identificador, path="/api")
    assert cliente.get(ESTACIONES).status_code == 401


# Autorización


@app.get("/api/v1/_prueba/estaciones/{estacionId}", include_in_schema=False)
def _ruta_de_prueba(estacion: EstacionAutorizada) -> dict[str, int]:
    return {"id": estacion.id}


def test_lista_solo_las_estaciones_asignadas(cliente, sesion, usuario):
    propia = crear_estacion(sesion, 1, "Propia")
    crear_estacion(sesion, 2, "Ajena")
    sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=propia.id))
    sesion.commit()
    ingresar(cliente)

    datos = cliente.get(ESTACIONES).json()

    assert [e["nombre"] for e in datos] == ["Propia"]
    assert datos[0]["id"] == propia.id


def test_no_lista_estaciones_inactivas(cliente, sesion, usuario):
    estacion = crear_estacion(sesion, 1)
    estacion.activa = False
    sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=estacion.id))
    sesion.commit()
    ingresar(cliente)
    assert cliente.get(ESTACIONES).json() == []


def test_estacion_no_asignada_responde_403(cliente, sesion, usuario):
    ajena = crear_estacion(sesion, 2)
    ingresar(cliente)
    respuesta = cliente.get(f"/api/v1/_prueba/estaciones/{ajena.id}")
    assert respuesta.status_code == 403
    assert respuesta.json()["codigo"] == "SIN_ACCESO"


def test_estacion_asignada_se_autoriza(cliente, sesion, usuario):
    propia = crear_estacion(sesion, 1)
    sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=propia.id))
    sesion.commit()
    ingresar(cliente)
    assert cliente.get(f"/api/v1/_prueba/estaciones/{propia.id}").json() == {"id": propia.id}


def test_estacion_inexistente_responde_404(cliente, usuario):
    ingresar(cliente)
    assert cliente.get("/api/v1/_prueba/estaciones/999999").status_code == 404


def test_estacion_sin_sesion_responde_401(cliente, sesion):
    estacion = crear_estacion(sesion, 1)
    assert cliente.get(f"/api/v1/_prueba/estaciones/{estacion.id}").status_code == 401


def test_no_existe_registro_publico(cliente):
    assert cliente.post("/api/v1/auth/registro", json={}).status_code == 404
    rutas = app.openapi()["paths"]
    assert not [r for r in rutas if "regist" in r or "signup" in r]


# Administración


def test_crear_usuario_guarda_solo_el_hash(sesion):
    clave = administracion.crear_usuario(sesion, " Nuevo@Ejemplo.Example ", "Nuevo")
    usuario = sesion.scalar(select(Usuario))
    assert usuario.email == "nuevo@ejemplo.example"
    assert clave not in usuario.password_hash
    assert usuario.password_hash.startswith("$argon2id$")
    assert verificar_contrasena(usuario.password_hash, clave)


@pytest.mark.parametrize(
    ("email", "nombre"), [("sin-arroba", "N"), ("a@b.example", " "), ("x" * 255 + "@b", "N")]
)
def test_crear_usuario_rechaza_datos_invalidos(sesion, email, nombre):
    with pytest.raises(ErrorAdministracion):
        administracion.crear_usuario(sesion, email, nombre)


def test_crear_usuario_repetido_falla(sesion, usuario):
    with pytest.raises(ErrorAdministracion):
        administracion.crear_usuario(sesion, EMAIL, "Otra")


def test_alta_administrativa_permite_consultar_la_estacion(cliente, sesion):
    estacion = crear_estacion(sesion, 7, "Asignada")
    clave = administracion.crear_usuario(sesion, "alta@ejemplo.example", "Alta")
    administracion.asignar_estacion(sesion, "alta@ejemplo.example", 7)
    administracion.asignar_estacion(sesion, "alta@ejemplo.example", 7)
    sesion.commit()

    assert ingresar(cliente, "alta@ejemplo.example", clave).status_code == 200
    assert [e["id"] for e in cliente.get(ESTACIONES).json()] == [estacion.id]
    assert contar(sesion, UsuarioEstacion) == 1


def test_asignar_a_datos_inexistentes_falla(sesion, usuario):
    with pytest.raises(ErrorAdministracion):
        administracion.asignar_estacion(sesion, EMAIL, 999)
    with pytest.raises(ErrorAdministracion):
        administracion.asignar_estacion(sesion, "nadie@ejemplo.example", 1)


def test_restablecer_la_clave_invalida_las_sesiones(cliente, sesion, usuario):
    ingresar(cliente)
    identificador = cliente.cookies.get("wt_sesion")

    nueva = administracion.restablecer_clave(sesion, EMAIL)
    sesion.commit()

    cliente.cookies.set("wt_sesion", identificador, path="/api")
    assert cliente.get(ESTACIONES).status_code == 401
    assert ingresar(cliente, contrasena=CLAVE).status_code == 401
    assert ingresar(cliente, contrasena=nueva).status_code == 200


def test_el_comando_informa_errores_sin_traza(capsys, monkeypatch):
    def falla(*_argumentos):
        raise ErrorAdministracion("Ya existe el usuario a@b.example.")

    class SesionFalsa:
        def __init__(self, *_argumentos):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_errores):
            return False

    monkeypatch.setattr(administracion, "crear_usuario", falla)
    monkeypatch.setattr(administracion, "Session", SesionFalsa)
    monkeypatch.setattr(administracion, "obtener_motor", lambda: None)

    codigo = administracion.principal(["crear-usuario", "--email", "a@b.example", "--nombre", "N"])

    assert codigo == 2
    assert "Ya existe" in capsys.readouterr().err

