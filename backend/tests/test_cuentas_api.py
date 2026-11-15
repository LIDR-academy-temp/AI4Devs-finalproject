"""API de cuentas: escenarios de `account-lifecycle`, `account-recovery` y `account-access`."""

import re
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.api.dependencias import obtener_ahora, obtener_sesion_bd
from app.api.principal import app
from app.cuentas.ciclo_de_vida import TERMINOS_VERSION, borrar_cuentas_sin_confirmar
from app.datos.modelos import CorreoSaliente, EnlaceCuenta, IntentoAcceso, Sesion, Usuario
from app.seguridad import calcular_hash_contrasena

INICIO = datetime(2026, 11, 4, 12, 0, tzinfo=UTC)
CLAVE = "una frase larga para la prueba"
NUEVA = "otra frase distinta y larga"
EMAIL = "ana@ejemplo.com"
AVISO_REGISTRO = "Si los datos son correctos, en unos minutos recibirá un correo para confirmar la cuenta."


class Reloj:
    def __init__(self):
        self.ahora = INICIO

    def __call__(self):
        return self.ahora


@pytest.fixture
def reloj():
    return Reloj()


@pytest.fixture
def cliente(sesion, reloj, monkeypatch):
    monkeypatch.setenv("COOKIE_SEGURA", "false")
    monkeypatch.setenv("URL_PUBLICA", "http://localhost:8080")
    app.dependency_overrides[obtener_sesion_bd] = lambda: sesion
    app.dependency_overrides[obtener_ahora] = reloj
    yield TestClient(app)
    app.dependency_overrides.clear()


def datos(**cambios):
    base = {
        "nombre": "Ana",
        "apellido": "Pérez",
        "email": EMAIL,
        "contrasena": CLAVE,
        "localidad": "Pergamino",
        "provincia": "Buenos Aires",
        "organizacion": "",
        "telefono": "",
        "acepta_terminos": True,
        "acepta_novedades": False,
    }
    return {**base, **cambios}


def registrar(cliente, **cambios):
    return cliente.post("/api/v1/auth/registro", json=datos(**cambios))


def contar(sesion, modelo, *condiciones):
    return sesion.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def ultimo_codigo(sesion, tipo, ruta):
    correo = sesion.scalars(
        select(CorreoSaliente).where(CorreoSaliente.tipo == tipo).order_by(CorreoSaliente.id.desc())
    ).first()
    return re.search(rf"/{ruta}#codigo=([A-Za-z0-9_-]+)", correo.cuerpo_texto).group(1)


def codigo_de_baja(sesion):
    correo = sesion.scalars(select(CorreoSaliente).order_by(CorreoSaliente.id.desc())).first()
    return re.search(r"/baja#codigo=([A-Za-z0-9_-]+)", correo.cuerpo_texto).group(1)


def ingresar(cliente, email=EMAIL, contrasena=CLAVE):
    return cliente.post("/api/v1/auth/login", json={"email": email, "contrasena": contrasena})


def cuenta_confirmada(sesion, email=EMAIL, contrasena=CLAVE):
    usuario = Usuario(
        email=email,
        nombre="Ana",
        password_hash=calcular_hash_contrasena(contrasena),
        confirmado_en=INICIO - timedelta(days=1),
    )
    sesion.add(usuario)
    sesion.commit()
    return usuario


# Registro


def test_un_registro_valido_crea_la_cuenta_sin_confirmar_y_envia_el_correo(cliente, sesion):
    respuesta = registrar(cliente, organizacion="Cooperativa Norte", acepta_novedades=True)

    assert (respuesta.status_code, respuesta.json()) == (202, {"mensaje": AVISO_REGISTRO})
    usuario = sesion.scalar(select(Usuario))
    assert (usuario.email, usuario.apellido, usuario.localidad) == (EMAIL, "Pérez", "Pergamino")
    assert usuario.organizacion == "Cooperativa Norte"
    assert usuario.telefono is None
    assert usuario.confirmado_en is None
    assert (usuario.terminos_version, usuario.terminos_aceptados_en) == (TERMINOS_VERSION, INICIO)
    assert usuario.acepta_novedades is True
    assert contar(sesion, CorreoSaliente, CorreoSaliente.tipo == "CONFIRMACION") == 1


def test_sin_aceptar_los_terminos_no_se_crea_la_cuenta(cliente, sesion):
    respuesta = registrar(cliente, acepta_terminos=False)

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "TERMINOS_NO_ACEPTADOS"
    assert "acepta_terminos" in respuesta.json()["campos"]
    assert contar(sesion, Usuario) == 0


def test_una_contrasena_corta_se_rechaza_en_su_campo(cliente, sesion):
    respuesta = registrar(cliente, contrasena="corta")

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "CONTRASENA_RECHAZADA"
    assert "al menos 15" in respuesta.json()["campos"]["contrasena"]
    assert contar(sesion, Usuario) == 0


def test_los_datos_invalidos_se_informan_por_campo_sin_repetir_lo_enviado(cliente):
    respuesta = registrar(cliente, email="sin-arroba", nombre="", telefono="abc")

    assert respuesta.status_code == 422
    assert set(respuesta.json()["campos"]) == {"email", "nombre", "telefono"}
    assert CLAVE not in respuesta.text


def test_un_correo_confirmado_recibe_la_misma_respuesta_y_un_aviso(cliente, sesion):
    usuario = cuenta_confirmada(sesion)
    hash_anterior = usuario.password_hash

    respuesta = registrar(cliente, nombre="Impostor", contrasena="una clave cualquiera y larga")

    assert (respuesta.status_code, respuesta.json()) == (202, {"mensaje": AVISO_REGISTRO})
    sesion.refresh(usuario)
    assert (usuario.nombre, usuario.password_hash) == ("Ana", hash_anterior)
    assert contar(sesion, CorreoSaliente, CorreoSaliente.tipo == "YA_REGISTRADO") == 1
    assert contar(sesion, CorreoSaliente, CorreoSaliente.tipo == "CONFIRMACION") == 0


def test_registrarse_de_nuevo_sin_confirmar_reemplaza_los_datos_y_el_enlace(cliente, sesion):
    registrar(cliente)
    primero = ultimo_codigo(sesion, "CONFIRMACION", "confirmar")

    respuesta = registrar(cliente, localidad="Rojas", contrasena="la nueva frase de la cuenta")

    assert respuesta.json() == {"mensaje": AVISO_REGISTRO}
    assert sesion.scalar(select(Usuario.localidad)) == "Rojas"
    anterior = cliente.post("/api/v1/auth/confirmacion", json={"codigo": primero})
    assert anterior.status_code == 400
    segundo = ultimo_codigo(sesion, "CONFIRMACION", "confirmar")
    assert cliente.post("/api/v1/auth/confirmacion", json={"codigo": segundo}).status_code == 200
    assert ingresar(cliente, contrasena="la nueva frase de la cuenta").status_code == 200


# Confirmación


def test_confirmar_habilita_el_inicio_de_sesion(cliente, sesion, reloj):
    registrar(cliente)
    assert ingresar(cliente).json()["codigo"] == "CUENTA_SIN_CONFIRMAR"

    reloj.ahora += timedelta(hours=47)
    codigo = ultimo_codigo(sesion, "CONFIRMACION", "confirmar")
    respuesta = cliente.post("/api/v1/auth/confirmacion", json={"codigo": codigo})

    assert respuesta.status_code == 200
    assert ingresar(cliente).status_code == 200


@pytest.mark.parametrize("codigo", ["usado", "vencido", "inexistente"])
def test_un_enlace_invalido_no_dice_de_quien_era(cliente, sesion, reloj, codigo):
    registrar(cliente)
    real = ultimo_codigo(sesion, "CONFIRMACION", "confirmar")
    if codigo == "usado":
        cliente.post("/api/v1/auth/confirmacion", json={"codigo": real})
    elif codigo == "vencido":
        reloj.ahora += timedelta(hours=48)
    else:
        real = "codigo-inexistente"

    respuesta = cliente.post("/api/v1/auth/confirmacion", json={"codigo": real})

    assert respuesta.status_code == 400
    assert respuesta.json()["codigo"] == "ENLACE_INVALIDO"
    assert EMAIL not in respuesta.text


def test_reenviar_solo_envia_a_cuentas_sin_confirmar(cliente, sesion):
    registrar(cliente)
    cuenta_confirmada(sesion, email="beto@ejemplo.com")
    respuestas = [
        cliente.post("/api/v1/auth/confirmacion/reenvio", json={"email": email})
        for email in (EMAIL, "beto@ejemplo.com", "nadie@ejemplo.com")
    ]

    assert {r.status_code for r in respuestas} == {202}
    assert len({r.text for r in respuestas}) == 1
    assert contar(sesion, CorreoSaliente, CorreoSaliente.tipo == "CONFIRMACION") == 2


# Recupero


def test_el_recupero_responde_igual_exista_o_no_la_cuenta(cliente, sesion):
    cuenta_confirmada(sesion)
    existe = cliente.post("/api/v1/auth/recupero", json={"email": EMAIL})
    no_existe = cliente.post("/api/v1/auth/recupero", json={"email": "nadie@ejemplo.com"})

    assert existe.status_code == no_existe.status_code == 202
    assert existe.json() == no_existe.json()
    assert "Su usuario es el correo" in existe.json()["mensaje"]
    assert contar(sesion, CorreoSaliente) == 1
    assert sesion.scalar(select(CorreoSaliente.destinatario)) == EMAIL


def test_la_contrasena_nueva_cierra_sesiones_desbloquea_y_avisa(cliente, sesion):
    usuario = cuenta_confirmada(sesion)
    assert ingresar(cliente).status_code == 200
    for _ in range(5):
        ingresar(cliente, contrasena="mala")
    assert ingresar(cliente).status_code == 429
    cliente.post("/api/v1/auth/recupero", json={"email": EMAIL})
    codigo = ultimo_codigo(sesion, "RECUPERO", "restablecer")

    respuesta = cliente.post("/api/v1/auth/recupero/nueva-contrasena", json={"codigo": codigo, "contrasena": NUEVA})

    assert respuesta.status_code == 200
    assert contar(sesion, Sesion, Sesion.usuario_id == usuario.id) == 0
    assert contar(sesion, IntentoAcceso) == 0
    assert contar(sesion, CorreoSaliente, CorreoSaliente.tipo == "CLAVE_CAMBIADA") == 1
    assert ingresar(cliente, contrasena=NUEVA).status_code == 200
    assert ingresar(cliente, contrasena=CLAVE).status_code == 401


def test_una_contrasena_rechazada_no_consume_el_enlace(cliente, sesion):
    cuenta_confirmada(sesion)
    cliente.post("/api/v1/auth/recupero", json={"email": EMAIL})
    codigo = ultimo_codigo(sesion, "RECUPERO", "restablecer")

    rechazo = cliente.post("/api/v1/auth/recupero/nueva-contrasena", json={"codigo": codigo, "contrasena": "corta"})
    assert rechazo.status_code == 422
    assert "contrasena" in rechazo.json()["campos"]
    otra = cliente.post("/api/v1/auth/recupero/nueva-contrasena", json={"codigo": codigo, "contrasena": NUEVA})
    assert otra.status_code == 200


def test_el_enlace_de_recupero_vence_a_los_30_minutos(cliente, sesion, reloj):
    cuenta_confirmada(sesion)
    cliente.post("/api/v1/auth/recupero", json={"email": EMAIL})
    codigo = ultimo_codigo(sesion, "RECUPERO", "restablecer")
    reloj.ahora += timedelta(minutes=31)

    respuesta = cliente.post("/api/v1/auth/recupero/nueva-contrasena", json={"codigo": codigo, "contrasena": NUEVA})

    assert respuesta.status_code == 400


# Mi cuenta


def test_mi_cuenta_muestra_y_guarda_los_datos_sin_cambiar_el_correo(cliente, sesion):
    cuenta_confirmada(sesion)
    ingresar(cliente)
    assert cliente.get("/api/v1/cuenta").json()["email"] == EMAIL

    nuevos = {
        "nombre": "Ana María",
        "apellido": "Pérez",
        "localidad": "Junín",
        "provincia": "Buenos Aires",
        "organizacion": None,
        "telefono": "+54 2477 400000",
        "acepta_novedades": True,
        "email": "otra@ejemplo.com",
    }
    respuesta = cliente.put("/api/v1/cuenta", json=nuevos)

    assert respuesta.status_code == 200
    assert respuesta.json()["localidad"] == "Junín"
    assert respuesta.json()["email"] == EMAIL


def test_mi_cuenta_exige_sesion(cliente):
    assert cliente.get("/api/v1/cuenta").status_code == 401


def test_cambiar_la_contrasena_exige_la_actual(cliente, sesion):
    cuenta_confirmada(sesion)
    ingresar(cliente)
    respuesta = cliente.post("/api/v1/cuenta/contrasena", json={"actual": "mala", "nueva": NUEVA})
    assert respuesta.status_code == 400
    assert "actual" in respuesta.json()["campos"]
    assert ingresar(cliente).status_code == 200


def test_cambiar_la_contrasena_cierra_las_demas_sesiones(cliente, sesion):
    usuario = cuenta_confirmada(sesion)
    otro_dispositivo = TestClient(app)
    ingresar(otro_dispositivo)
    ingresar(cliente)

    respuesta = cliente.post("/api/v1/cuenta/contrasena", json={"actual": CLAVE, "nueva": NUEVA})

    assert respuesta.status_code == 204
    assert cliente.get("/api/v1/cuenta").status_code == 200
    assert otro_dispositivo.get("/api/v1/cuenta").status_code == 401
    assert contar(sesion, Sesion, Sesion.usuario_id == usuario.id) == 1
    assert contar(sesion, CorreoSaliente, CorreoSaliente.tipo == "CLAVE_CAMBIADA") == 1


# Bajas


def test_la_baja_desde_la_aplicacion_borra_todo(cliente, sesion):
    cuenta_confirmada(sesion)
    ingresar(cliente)
    cliente.post("/api/v1/auth/recupero", json={"email": EMAIL})

    assert cliente.post("/api/v1/cuenta/baja", json={"contrasena": "mala"}).status_code == 400
    respuesta = cliente.post("/api/v1/cuenta/baja", json={"contrasena": CLAVE})

    assert respuesta.status_code == 204
    for modelo in (Usuario, Sesion, EnlaceCuenta, CorreoSaliente, IntentoAcceso):
        assert contar(sesion, modelo) == 0, modelo.__name__
    assert cliente.get("/api/v1/cuenta").status_code == 401


def test_la_baja_desde_el_correo_borra_la_cuenta(cliente, sesion):
    registrar(cliente)
    codigo = codigo_de_baja(sesion)

    respuesta = cliente.post("/api/v1/cuenta/baja-con-enlace", json={"codigo": codigo})

    assert respuesta.status_code == 200
    assert contar(sesion, Usuario) == 0
    assert contar(sesion, CorreoSaliente) == 0


def test_abrir_la_baja_en_un_clic_con_get_no_borra_nada(cliente, sesion):
    registrar(cliente)
    codigo = codigo_de_baja(sesion)

    assert cliente.get(f"/api/v1/cuenta/baja-un-clic?codigo={codigo}").status_code == 405
    assert contar(sesion, Usuario) == 1

    respuesta = cliente.post(
        f"/api/v1/cuenta/baja-un-clic?codigo={codigo}",
        content="List-Unsubscribe=One-Click",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert respuesta.status_code == 200
    assert contar(sesion, Usuario) == 0


def test_un_codigo_de_baja_invalido_no_borra_nada(cliente, sesion):
    cuenta_confirmada(sesion)
    respuesta = cliente.post("/api/v1/cuenta/baja-con-enlace", json={"codigo": "inventado"})
    assert respuesta.status_code == 400
    assert contar(sesion, Usuario) == 1


# Borrado de cuentas sin confirmar


def test_el_worker_borra_las_cuentas_sin_confirmar_vencidas(cliente, sesion):
    registrar(cliente)
    cuenta_confirmada(sesion, email="beto@ejemplo.com")

    assert borrar_cuentas_sin_confirmar(sesion, INICIO + timedelta(hours=47)) == 0
    assert borrar_cuentas_sin_confirmar(sesion, INICIO + timedelta(hours=48)) == 1
    sesion.commit()

    assert sesion.scalars(select(Usuario.email)).all() == ["beto@ejemplo.com"]
    assert contar(sesion, CorreoSaliente, CorreoSaliente.destinatario == EMAIL) == 0
    # El correo puede volver a registrarse.
    assert registrar(cliente).status_code == 202
    assert contar(sesion, Usuario, Usuario.email == EMAIL) == 1


def test_un_enlace_reenviado_extiende_el_plazo(cliente, sesion, reloj):
    registrar(cliente)
    reloj.ahora += timedelta(hours=40)
    cliente.post("/api/v1/auth/confirmacion/reenvio", json={"email": EMAIL})

    assert borrar_cuentas_sin_confirmar(sesion, INICIO + timedelta(hours=60)) == 0
    assert borrar_cuentas_sin_confirmar(sesion, INICIO + timedelta(hours=88)) == 1
