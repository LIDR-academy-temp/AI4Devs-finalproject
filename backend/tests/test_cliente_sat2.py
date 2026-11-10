import json
from datetime import date

import httpx
import pytest

from app.ingesta.cliente_sat2 import (
    ClienteSat2Http,
    ErrorAutorizacion,
    ErrorCredenciales,
    ErrorSat2,
)
from app.ingesta.configuracion import (
    ConfiguracionIncompleta,
    ConfiguracionSat2,
    cargar_configuracion,
    leer_archivo_env,
)

CLAVE = "clave-secreta-de-prueba"
TOKEN = "token-secreto-de-prueba"
CONFIGURACION = ConfiguracionSat2(
    url_base="https://sat2.invalid/api", usuario="usuario-de-prueba", clave=CLAVE
)


class Fuente:
    """SAT2 falsa que registra las consultas recibidas."""

    def __init__(self, estados=None, autenticado=True):
        self.consultas = []
        self.estados = list(estados or [])
        self.autenticado = autenticado

    def __call__(self, peticion: httpx.Request) -> httpx.Response:
        metodo = peticion.url.path.rsplit("/", 1)[-1]
        cuerpo = json.loads(peticion.content)
        self.consultas.append((metodo, cuerpo))
        if metodo == "AutenticarUsuario":
            return httpx.Response(
                200,
                json={"autenticado": self.autenticado, "idCliente": 5, "token": TOKEN},
            )
        estado = self.estados.pop(0) if self.estados else 200
        if estado != 200:
            return httpx.Response(estado, text=f"error con {TOKEN}")
        return httpx.Response(200, json=[{"fecha": "2026-01-01 00:00", "valor": 1}])

    def metodos(self):
        return [m for m, _ in self.consultas]


def crear_cliente(fuente, reloj=lambda: 0.0):
    return ClienteSat2Http(CONFIGURACION, httpx.MockTransport(fuente), reloj)


def test_autentica_una_vez_y_envia_el_token_en_el_cuerpo():
    fuente = Fuente()
    cliente = crear_cliente(fuente)

    cliente.recuperar_equipos()
    cliente.recuperar_historicos(1, 10, date(2026, 1, 1), date(2026, 1, 2))

    assert fuente.metodos().count("AutenticarUsuario") == 1
    _, cuerpo = fuente.consultas[-1]
    assert cuerpo == {
        "idEquipo": "1",
        "idSensor": "10",
        "fechaDesde": "2026-01-01",
        "fechaHasta": "2026-01-02",
        "token": TOKEN,
    }
    assert fuente.consultas[1][1]["idCliente"] == 5


def test_renueva_el_token_antes_de_que_venza():
    tiempo = {"ahora": 0.0}
    fuente = Fuente()
    cliente = crear_cliente(fuente, reloj=lambda: tiempo["ahora"])

    cliente.recuperar_equipos()
    tiempo["ahora"] = 269.0
    cliente.recuperar_equipos()
    assert fuente.metodos().count("AutenticarUsuario") == 1

    tiempo["ahora"] = 270.0
    cliente.recuperar_equipos()
    assert fuente.metodos().count("AutenticarUsuario") == 2


def test_reintenta_una_vez_ante_un_error_de_autorizacion():
    fuente = Fuente(estados=[401, 200])
    assert crear_cliente(fuente).recuperar_equipos()
    assert fuente.metodos().count("AutenticarUsuario") == 2


def test_informa_si_la_autorizacion_falla_dos_veces():
    fuente = Fuente(estados=[401, 403])
    with pytest.raises(ErrorAutorizacion):
        crear_cliente(fuente).recuperar_equipos()


def test_credenciales_rechazadas():
    with pytest.raises(ErrorCredenciales):
        crear_cliente(Fuente(autenticado=False)).recuperar_equipos()


def test_los_errores_no_exponen_secretos():
    with pytest.raises(ErrorSat2) as error:
        crear_cliente(Fuente(estados=[500])).recuperar_equipos()
    assert TOKEN not in str(error.value)
    assert CLAVE not in str(error.value)
    assert "500" in str(error.value)


def test_repr_no_expone_secretos():
    cliente = crear_cliente(Fuente())
    assert CLAVE not in repr(cliente)
    assert CLAVE not in repr(CONFIGURACION)
    assert CONFIGURACION.usuario not in repr(CONFIGURACION)


def test_lee_el_archivo_env(tmp_path):
    ruta = tmp_path / ".env"
    ruta.write_text(
        '# comentario\n\nnombreDeUsuario=abc\nclave="con=igual"\nSAT2_URL_BASE=https://x.invalid/\n',
        encoding="utf-8",
    )
    assert leer_archivo_env(ruta) == {
        "nombreDeUsuario": "abc",
        "clave": "con=igual",
        "SAT2_URL_BASE": "https://x.invalid/",
    }


def test_configuracion_incompleta_solo_nombra_las_variables(tmp_path, monkeypatch):
    for nombre in ("nombreDeUsuario", "clave", "SAT2_URL_BASE"):
        monkeypatch.delenv(nombre, raising=False)
    ruta = tmp_path / ".env"
    ruta.write_text(f"nombreDeUsuario=abc\nclave={CLAVE}\n", encoding="utf-8")

    with pytest.raises(ConfiguracionIncompleta) as error:
        cargar_configuracion(ruta)

    assert "SAT2_URL_BASE" in str(error.value)
    assert CLAVE not in str(error.value)


def test_observar_recibe_cada_respuesta_decodificada_incluida_la_autenticacion():
    vistas = []
    cliente = ClienteSat2Http(
        CONFIGURACION,
        httpx.MockTransport(Fuente()),
        lambda: 0.0,
        observar=lambda metodo, datos: vistas.append((metodo, datos)),
    )

    cliente.recuperar_equipos()
    cliente.recuperar_historicos(1, 6, date(2026, 11, 9), date(2026, 11, 9))

    assert [metodo for metodo, _ in vistas] == [
        "AutenticarUsuario",
        "RecuperarEquipos",
        "RecuperarHistoricosDeEquipoPorSensor",
    ]
    assert vistas[0][1]["token"] == TOKEN
    assert vistas[1][1] == [{"fecha": "2026-01-01 00:00", "valor": 1}]


def test_sin_observar_el_cliente_funciona_igual():
    cliente = crear_cliente(Fuente())

    assert cliente.recuperar_equipos() == [{"fecha": "2026-01-01 00:00", "valor": 1}]
