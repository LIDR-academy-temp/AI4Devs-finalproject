"""Origen de la configuración de SAT2 en el worker (D6 de weather-track-administracion-sat2).

Nunca consulta SAT2: usa una fuente HTTP falsa. Todos los valores son ficticios.
"""

import json
import logging
from datetime import UTC, datetime
from decimal import Decimal

import httpx
import pytest
from sqlalchemy import select

from app.cifrado_sat2 import cifrar, generar_par_de_claves
from app.datos.modelos import ConfiguracionSat2, EjecucionIngesta, Estacion
from app.ingesta import worker
from app.ingesta.cliente_sat2 import ClienteSat2Http
from app.ingesta.configuracion import ConfiguracionIncompleta
from app.ingesta.origen_sat2 import ConfiguracionSat2Ilegible, OrigenSat2, tarea_con_origen

AHORA = datetime(2026, 11, 9, 12, 0, tzinfo=UTC)
DEL_ENTORNO = {
    "SAT2_URL_BASE": "https://entorno.ejemplo.invalid/api/",
    "nombreDeUsuario": "usuario-del-entorno",
    "clave": "clave-del-entorno",
}
DE_LA_BASE = {
    "url_base": "https://base.ejemplo.invalid/api",
    "usuario": "usuario-de-la-base",
    "clave": "clave-de-la-base",
}


class FabricaDePruebas:
    def __init__(self, sesion):
        self.sesion = sesion

    def __call__(self):
        return self

    def __enter__(self):
        return self.sesion

    def __exit__(self, *errores):
        return False


class Fuente:
    """SAT2 falsa: registra con qué usuario se autentica cada cliente."""

    def __init__(self):
        self.autenticaciones = []
        self.consultas = 0

    def __call__(self, peticion: httpx.Request) -> httpx.Response:
        self.consultas += 1
        metodo = peticion.url.path.rsplit("/", 1)[-1]
        cuerpo = json.loads(peticion.content)
        if metodo == "AutenticarUsuario":
            self.autenticaciones.append((str(peticion.url.host), cuerpo.get("nombreDeUsuario")))
            return httpx.Response(200, json={"autenticado": True, "idCliente": 5, "token": "t"})
        return httpx.Response(200, json=[])


@pytest.fixture
def claves(monkeypatch):
    publica, privada = generar_par_de_claves()
    monkeypatch.setenv("SAT2_CLAVE_PRIVADA", privada)
    return publica, privada


@pytest.fixture
def entorno(tmp_path, monkeypatch):
    for nombre in DEL_ENTORNO:
        monkeypatch.delenv(nombre, raising=False)
    ruta = tmp_path / ".env"
    ruta.write_text("".join(f"{k}={v}\n" for k, v in DEL_ENTORNO.items()), encoding="utf-8")
    return ruta


@pytest.fixture
def entorno_vacio(tmp_path, monkeypatch):
    for nombre in DEL_ENTORNO:
        monkeypatch.delenv(nombre, raising=False)
    return tmp_path / "no-existe.env"


@pytest.fixture
def fuente():
    return Fuente()


def origen(sesion, ruta_env, fuente):
    return OrigenSat2(
        FabricaDePruebas(sesion),
        ruta_env=ruta_env,
        crear_http=lambda configuracion: ClienteSat2Http(configuracion, httpx.MockTransport(fuente)),
    )


def guardar(sesion, publica, **cambios):
    fila = sesion.get(ConfiguracionSat2, 1) or ConfiguracionSat2(id=1)
    fila.contenido_cifrado = cifrar({**DE_LA_BASE, **cambios}, publica)
    fila.cargada_en = AHORA
    sesion.add(fila)
    sesion.flush()


def test_sin_configuracion_guardada_usa_el_entorno(sesion, entorno, fuente):
    origen(sesion, entorno, fuente).cliente().recuperar_equipos()

    assert fuente.autenticaciones == [("entorno.ejemplo.invalid", "usuario-del-entorno")]


def test_con_configuracion_guardada_usa_la_base(sesion, entorno, fuente, claves):
    guardar(sesion, claves[0])

    origen(sesion, entorno, fuente).cliente().recuperar_equipos()

    assert fuente.autenticaciones == [("base.ejemplo.invalid", "usuario-de-la-base")]


def test_sin_cambios_reutiliza_el_cliente_y_su_sesion(sesion, entorno, fuente, claves):
    guardar(sesion, claves[0])
    elegido = origen(sesion, entorno, fuente)

    primero = elegido.cliente()
    primero.recuperar_equipos()
    segundo = elegido.cliente()
    segundo.recuperar_equipos()

    assert primero is segundo
    assert len(fuente.autenticaciones) == 1


def test_un_cambio_crea_un_cliente_nuevo_con_otra_sesion(sesion, entorno, fuente, claves):
    guardar(sesion, claves[0])
    elegido = origen(sesion, entorno, fuente)
    anterior = elegido.cliente()
    anterior.recuperar_equipos()

    guardar(sesion, claves[0], usuario="usuario-nuevo")
    nuevo = elegido.cliente()
    nuevo.recuperar_equipos()

    assert nuevo is not anterior
    assert fuente.autenticaciones[-1] == ("base.ejemplo.invalid", "usuario-nuevo")


def test_guardar_desde_el_entorno_pasa_a_la_base(sesion, entorno, fuente, claves):
    elegido = origen(sesion, entorno, fuente)
    elegido.cliente().recuperar_equipos()

    guardar(sesion, claves[0])
    elegido.cliente().recuperar_equipos()

    assert [usuario for _, usuario in fuente.autenticaciones] == [
        "usuario-del-entorno",
        "usuario-de-la-base",
    ]


def test_los_clientes_comparten_un_solo_bloqueo(sesion, entorno, fuente, claves):
    elegido = origen(sesion, entorno, fuente)
    anterior = elegido.cliente()
    guardar(sesion, claves[0])

    assert elegido.cliente()._bloqueo is anterior._bloqueo


def test_sin_configuracion_ni_entorno_informa_las_variables(sesion, entorno_vacio, fuente):
    with pytest.raises(ConfiguracionIncompleta, match="nombreDeUsuario"):
        origen(sesion, entorno_vacio, fuente).cliente()
    assert fuente.consultas == 0


def test_sin_clave_privada_no_consulta_ni_vuelve_al_entorno(
    sesion, entorno, fuente, claves, monkeypatch
):
    guardar(sesion, claves[0])
    monkeypatch.delenv("SAT2_CLAVE_PRIVADA")

    with pytest.raises(ConfiguracionSat2Ilegible, match="SAT2_CLAVE_PRIVADA") as error:
        origen(sesion, entorno, fuente).cliente()

    assert fuente.consultas == 0
    for valor in [*DE_LA_BASE.values(), *DEL_ENTORNO.values(), claves[1]]:
        assert valor not in str(error.value)


def test_otra_clave_privada_no_consulta(sesion, entorno, fuente, claves, monkeypatch):
    guardar(sesion, claves[0])
    monkeypatch.setenv("SAT2_CLAVE_PRIVADA", generar_par_de_claves()[1])

    with pytest.raises(ConfiguracionSat2Ilegible):
        origen(sesion, entorno, fuente).cliente()
    assert fuente.consultas == 0


def test_tras_un_error_no_sigue_con_el_cliente_anterior(sesion, entorno, fuente, claves, monkeypatch):
    elegido = origen(sesion, entorno, fuente)
    elegido.cliente()
    guardar(sesion, claves[0])
    monkeypatch.delenv("SAT2_CLAVE_PRIVADA")

    with pytest.raises(ConfiguracionSat2Ilegible):
        elegido.cliente()
    with pytest.raises(ConfiguracionSat2Ilegible):
        elegido.cliente()

    monkeypatch.setenv("SAT2_CLAVE_PRIVADA", claves[1])
    elegido.cliente().recuperar_equipos()
    assert fuente.autenticaciones[-1][1] == "usuario-de-la-base"


# Tareas del worker


def crear_estacion(sesion):
    estacion = Estacion(id_equipo_sat2=1, nombre="E", latitud=Decimal("-34"), longitud=Decimal("-60"))
    sesion.add(estacion)
    sesion.flush()
    return estacion


def test_la_tarea_recibe_el_cliente_vigente(sesion, entorno, fuente):
    recibidos = []

    tarea_con_origen(
        lambda fabrica, cliente: recibidos.append(cliente),
        FabricaDePruebas(sesion),
        origen(sesion, entorno, fuente),
    )

    assert len(recibidos) == 1


def test_el_ciclo_sin_configuracion_legible_queda_en_error(
    sesion, entorno, fuente, claves, monkeypatch, caplog
):
    estacion = crear_estacion(sesion)
    guardar(sesion, claves[0])
    monkeypatch.delenv("SAT2_CLAVE_PRIVADA")

    def no_debe_correr(*_argumentos):
        raise AssertionError("No debe correr sin configuración")

    with caplog.at_level(logging.ERROR):
        tarea_con_origen(
            no_debe_correr,
            FabricaDePruebas(sesion),
            origen(sesion, entorno, fuente),
            registrar_ciclo=True,
            reloj=lambda: AHORA,
        )

    ejecucion = sesion.scalar(select(EjecucionIngesta))
    assert ejecucion.estacion_id == estacion.id
    assert ejecucion.tipo == "CICLO"
    assert ejecucion.resultado == "ERROR"
    assert "SAT2_CLAVE_PRIVADA" in ejecucion.detalle
    assert "SAT2_CLAVE_PRIVADA" in caplog.text
    assert fuente.consultas == 0
    for valor in [*DE_LA_BASE.values(), claves[1]]:
        assert valor not in caplog.text
        assert valor not in ejecucion.detalle


def test_otras_tareas_sin_configuracion_solo_registran_el_error(
    sesion, entorno_vacio, fuente, caplog
):
    crear_estacion(sesion)

    with caplog.at_level(logging.ERROR):
        tarea_con_origen(
            lambda *_argumentos: None, FabricaDePruebas(sesion), origen(sesion, entorno_vacio, fuente)
        )

    assert sesion.scalar(select(EjecucionIngesta)) is None
    assert "nombreDeUsuario" in caplog.text


# Arranque


def test_el_modo_real_arranca_con_la_configuracion_guardada_sin_entorno(
    sesion, entorno_vacio, claves, monkeypatch
):
    guardar(sesion, claves[0])
    monkeypatch.setattr(worker, "RUTA_ENV", entorno_vacio)

    elegido = worker.crear_origen_real(FabricaDePruebas(sesion))

    assert isinstance(elegido, OrigenSat2)
    assert elegido.cliente() is not None
