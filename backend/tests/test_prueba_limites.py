import json
from datetime import date

import httpx
import pytest

from app.ingesta.cliente_sat2 import ClienteSat2Http, ErrorSat2
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.ingesta.configuracion import ConfiguracionSat2
from herramientas import prueba_limites
from herramientas.prueba_limites import ejecutar_prueba, principal

HOY = date(2026, 11, 2)
CLAVE = "clave-secreta-de-prueba"
TOKEN = "token-secreto-de-prueba"
USUARIO = "usuario-de-prueba"


def sin_pausa(_segundos):
    return None


def medir(cliente, **opciones):
    return ejecutar_prueba(cliente, HOY, dormir=sin_pausa, **opciones)


def test_sin_limites_llega_a_la_mayor_ventana():
    informe = medir(ClienteSat2Simulado())
    assert informe["rango_seguro_dias"] == 365
    assert [f["dias"] for f in informe["ventanas"]] == [1, 7, 31, 62, 93, 184, 365]
    assert all(f["orden_descendente"] for f in informe["ventanas"])


def test_se_detiene_en_el_primer_rango_rechazado():
    informe = medir(ClienteSat2Simulado(max_dias_por_consulta=31))
    assert informe["rango_seguro_dias"] == 31
    assert informe["ventanas"][-1]["dias"] == 62
    assert informe["ventanas"][-1]["resultado"] == "error"
    assert informe["ventanas"][-1]["error"] == "ErrorSat2"


def test_detecta_un_recorte_silencioso():
    informe = medir(ClienteSat2Simulado(primera_fecha_con_datos=date(2026, 9, 1)))
    assert informe["rango_seguro_dias"] == 62
    assert informe["ventanas"][-1]["dias"] == 93
    assert informe["ventanas"][-1]["resultado"] == "recortada"


def test_encuentra_la_fecha_mas_antigua_por_biseccion():
    informe = medir(ClienteSat2Simulado(primera_fecha_con_datos=date(2025, 3, 10)))
    assert informe["antiguedad"]["fecha_mas_antigua"] == "2025-03-10"
    assert informe["antiguedad"]["resultado"] == "aproximada"


def test_reconoce_datos_desde_el_alta():
    informe = medir(ClienteSat2Simulado())
    assert informe["antiguedad"] == {
        "resultado": "desde_el_alta",
        "fecha_mas_antigua": "2024-01-01",
    }


def test_hace_pocas_consultas_y_pausa_entre_ellas():
    pausas = []
    informe = ejecutar_prueba(
        ClienteSat2Simulado(primera_fecha_con_datos=date(2025, 3, 10)),
        HOY,
        dormir=pausas.append,
    )
    assert informe["consultas_de_historicos"] <= 25
    assert len(pausas) == informe["consultas_de_historicos"] - 1
    assert set(pausas) == {prueba_limites.PAUSA_SEGUNDOS}


class ClienteQueFalla(ClienteSat2Simulado):
    def __init__(self):
        super().__init__()
        self.intentos = 0

    def recuperar_historicos(self, *args):
        self.intentos += 1
        raise ErrorSat2("caída")


def test_se_detiene_ante_errores_seguidos():
    cliente = ClienteQueFalla()
    informe = medir(cliente)
    assert cliente.intentos <= prueba_limites.MAX_ERRORES_SEGUIDOS
    assert informe["rango_seguro_dias"] is None


def fuente_real_falsa(peticion: httpx.Request) -> httpx.Response:
    metodo = peticion.url.path.rsplit("/", 1)[-1]
    if metodo == "AutenticarUsuario":
        return httpx.Response(
            200, json={"autenticado": True, "idCliente": 5, "token": TOKEN}
        )
    simulado = ClienteSat2Simulado()
    if metodo == "RecuperarEquipos":
        return httpx.Response(200, json=simulado.recuperar_equipos())
    cuerpo = json.loads(peticion.content)
    if cuerpo["fechaDesde"] < "2026-10-01":
        return httpx.Response(500, text=f"fallo interno con {TOKEN} y {CLAVE}")
    return httpx.Response(
        200,
        json=simulado.recuperar_historicos(
            1,
            int(cuerpo["idSensor"]),
            date.fromisoformat(cuerpo["fechaDesde"]),
            date.fromisoformat(cuerpo["fechaHasta"]),
        ),
    )


def test_ni_la_salida_ni_el_informe_contienen_secretos(tmp_path, monkeypatch, capsys):
    ruta_informe = tmp_path / "informe.json"
    ruta_env = tmp_path / ".env"
    ruta_env.write_text(
        f"nombreDeUsuario={USUARIO}\nclave={CLAVE}\nSAT2_URL_BASE=https://sat2.invalid/api\n",
        encoding="utf-8",
    )
    for nombre in ("nombreDeUsuario", "clave", "SAT2_URL_BASE"):
        monkeypatch.delenv(nombre, raising=False)

    crear_real = ClienteSat2Http
    monkeypatch.setattr(
        prueba_limites,
        "ClienteSat2Http",
        lambda configuracion: crear_real(configuracion, httpx.MockTransport(fuente_real_falsa)),
    )

    assert principal([], ruta_env, ruta_informe, dormir=sin_pausa) == 0

    salida = capsys.readouterr()
    textos = salida.out + salida.err + ruta_informe.read_text(encoding="utf-8")
    assert "Rango seguro" in salida.out
    for secreto in (CLAVE, TOKEN, USUARIO):
        assert secreto not in textos


def test_sin_configuracion_solo_nombra_variables(tmp_path, monkeypatch, capsys):
    for nombre in ("nombreDeUsuario", "clave", "SAT2_URL_BASE"):
        monkeypatch.delenv(nombre, raising=False)
    ruta_env = tmp_path / ".env"
    ruta_env.write_text(f"clave={CLAVE}\n", encoding="utf-8")

    assert principal([], ruta_env, tmp_path / "x.json", dormir=sin_pausa) == 2

    salida = capsys.readouterr()
    assert "nombreDeUsuario" in salida.err
    assert CLAVE not in salida.err + salida.out


def test_credenciales_rechazadas_no_exponen_secretos(tmp_path, monkeypatch, capsys):
    def rechaza(_peticion):
        return httpx.Response(200, json={"autenticado": False})

    crear_real = ClienteSat2Http
    monkeypatch.setattr(
        prueba_limites,
        "ClienteSat2Http",
        lambda configuracion: crear_real(configuracion, httpx.MockTransport(rechaza)),
    )
    monkeypatch.setattr(
        prueba_limites,
        "cargar_configuracion",
        lambda _ruta: ConfiguracionSat2("https://sat2.invalid", USUARIO, CLAVE),
    )

    assert principal([], tmp_path / ".env", tmp_path / "x.json", dormir=sin_pausa) == 1

    salida = capsys.readouterr()
    assert "ErrorCredenciales" in salida.err
    assert CLAVE not in salida.err and USUARIO not in salida.err


def test_el_modo_simulado_no_requiere_configuracion(tmp_path, monkeypatch, capsys):
    for nombre in ("nombreDeUsuario", "clave", "SAT2_URL_BASE"):
        monkeypatch.delenv(nombre, raising=False)
    ruta_informe = tmp_path / "informe.json"

    codigo = principal(["--simulado"], tmp_path / ".env", ruta_informe, dormir=sin_pausa)

    assert codigo == 0
    assert json.loads(ruta_informe.read_text(encoding="utf-8"))["modo"] == "simulado"
