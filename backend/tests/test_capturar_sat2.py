"""Saneado, forma y comparación de las respuestas de SAT2 (weather-track-contrato-sat2).

Todos los valores son ficticios: estas pruebas nunca consultan SAT2.
"""

import pytest

from herramientas.capturar_sat2 import REDACTADO, comparar, forma, sanear

TOKEN = "TOKEN_FICTICIO.de-prueba-0000000000"


# Saneado


def test_reemplaza_las_claves_sensibles_conservando_el_tipo():
    datos = {
        "autenticado": True,
        "idCliente": 5,
        "token": TOKEN,
        "nombreDeUsuario": "cuenta-ficticia",
        "Clave": "clave-ficticia",
        "password": "otra",
        "NroSerie": "A123",
        "correoContacto": "x",
        "mailAlternativo": None,
    }

    saneado, rutas = sanear(datos, "AutenticarUsuario")

    assert saneado == {
        "autenticado": True,
        "idCliente": 0,
        "token": REDACTADO,
        "nombreDeUsuario": REDACTADO,
        "Clave": REDACTADO,
        "password": REDACTADO,
        "NroSerie": REDACTADO,
        "correoContacto": REDACTADO,
        "mailAlternativo": None,
    }
    assert sorted(rutas) == sorted(
        f"AutenticarUsuario.{clave}"
        for clave in ("idCliente", "token", "nombreDeUsuario", "Clave", "password", "NroSerie", "correoContacto")
    )


def test_una_clave_sensible_con_un_objeto_vacia_todo_lo_de_adentro():
    saneado, rutas = sanear({"cliente": {"id": 7, "nombre": "Cuenta", "activo": True}}, "R")

    assert saneado == {"cliente": {"id": 0, "nombre": REDACTADO, "activo": True}}
    assert rutas == ["R.cliente"]


@pytest.mark.parametrize(
    "valor",
    [
        "https://sat2.ejemplo.invalid/api",
        "ver http://otro.invalid",
        "www.ejemplo.invalid",
        "contacto@ejemplo.invalid",
        TOKEN,
        "QUJDREVGR0hJSktMTU5PUFFSU1RVVldY",
    ],
)
def test_reemplaza_por_valor_urls_correos_y_tokens_en_cualquier_clave(valor):
    saneado, rutas = sanear({"descripcion": valor}, "R")

    assert saneado == {"descripcion": REDACTADO}
    assert rutas == ["R.descripcion"]


def test_conserva_los_datos_publicos_de_la_estacion():
    equipos = [
        {
            "idEquipo": 1,
            "descripcion": "INTA Pergamino",
            "lat": -33.89,
            "lng": -60.57,
            "fechaAlta": "01/01/2024 0:00:00",
            "sensores": [
                {"idSensor": 6, "nombre": "Temp Amb. a 2 Mts", "unidad": "ºC", "Icono": 0},
                {"idSensor": 9, "nombre": "Velocidad del Viento", "unidad": "km/h", "Icono": 0},
            ],
        }
    ]
    historicos = [{"fecha": "2026-11-09 23:50", "valor": "20,30"}, {"fecha": "2026-11-09 23:40", "valor": -999.9}]

    assert sanear(equipos, "RecuperarEquipos") == (equipos, [])
    assert sanear(historicos, "H") == (historicos, [])


def test_informa_las_rutas_dentro_de_listas():
    _, rutas = sanear([{"ok": 1}, {"token": "x"}], "RecuperarEquipos")

    assert rutas == ["RecuperarEquipos[1].token"]


def test_no_modifica_los_datos_originales():
    original = {"token": TOKEN, "lista": [{"clave": "c"}]}

    sanear(original, "R")

    assert original == {"token": TOKEN, "lista": [{"clave": "c"}]}


# Forma


def test_la_forma_describe_tipos_sin_valores():
    datos = {
        "texto": "a",
        "entero": 1,
        "decimal": 1.5,
        "booleano": False,
        "nulo": None,
        "objeto": {"x": "b"},
    }

    assert forma(datos) == {
        "texto": "texto",
        "entero": "entero",
        "decimal": "decimal",
        "booleano": "booleano",
        "nulo": "nulo",
        "objeto": {"x": "texto"},
    }


def test_la_forma_de_una_lista_combina_sus_elementos():
    datos = [{"valor": "20,30", "fecha": "f"}, {"valor": -999.9, "fecha": "f", "alarma": True}]

    assert forma(datos) == [{"valor": "decimal|texto", "fecha": "texto", "alarma": "booleano"}]
    assert forma([]) == []


# Comparación


REFERENCIA = {"fecha": "texto", "datos": [{"nombre": "texto", "valor": "decimal|texto"}]}


def test_sin_diferencias():
    assert comparar(REFERENCIA, REFERENCIA, "R") == []


def test_un_tipo_ya_visto_no_es_un_cambio():
    actual = {"fecha": "texto", "datos": [{"nombre": "texto", "valor": "texto"}]}

    assert comparar(REFERENCIA, actual, "R") == []


def test_detecta_una_clave_nueva_una_faltante_y_un_tipo_cambiado():
    actual = {"fecha": "entero", "datos": [{"nombre": "texto", "unidad": "texto"}]}

    assert comparar(REFERENCIA, actual, "R") == [
        "R.fecha: el tipo pasó de texto a entero",
        "R.datos[].valor: ya no llega",
        "R.datos[].unidad: clave nueva",
    ]


def test_una_lista_vacia_no_se_compara():
    assert comparar(REFERENCIA, {"fecha": "texto", "datos": []}, "R") == []


def test_un_objeto_que_pasa_a_ser_texto_es_un_cambio():
    assert comparar({"x": {"y": "texto"}}, {"x": "texto"}, "R") == [
        "R.x: el tipo pasó de objeto a texto"
    ]


# Línea de comandos, con una SAT2 falsa


URL_FALSA = "https://sat2-falsa.ejemplo.invalid/api"
USUARIO_FALSO = "usuario-falso-sat2"
CLAVE_FALSA = "clave-falsa-sat2"
SERIE_FALSA = "SERIE-FALSA-77"
ID_CLIENTE_FALSO = 98765


class SatFalsa:
    """Responde como SAT2, con valores ficticios, y registra lo que le piden."""

    def __init__(self, extra_en_instantaneos=None):
        self.pedidos = []
        self.extra = extra_en_instantaneos or {}

    def __call__(self, peticion):
        import json as _json

        import httpx

        metodo = peticion.url.path.rsplit("/", 1)[-1]
        cuerpo = _json.loads(peticion.content)
        self.pedidos.append((metodo, cuerpo))
        if metodo == "AutenticarUsuario":
            datos = {"autenticado": True, "idCliente": ID_CLIENTE_FALSO, "token": TOKEN}
        elif metodo == "RecuperarEquipos":
            datos = [
                {
                    "idEquipo": 1,
                    "descripcion": "INTA Pergamino",
                    "lat": -33.89,
                    "lng": -60.57,
                    "NroSerie": SERIE_FALSA,
                    "enlace": URL_FALSA,
                    "sensores": [
                        {"idSensor": 6, "nombre": "Temp Amb. a 2 Mts", "unidad": "ºC"},
                        {"idSensor": 9, "nombre": "Velocidad del Viento", "unidad": "km/h"},
                    ],
                }
            ]
        elif metodo == "RecuperarInstantaneosDeEquipo":
            datos = {
                "fechaUltimaActualizacionDatos": "09/11/2026 12:00:00",
                "datosSensores": [{"nombreSensor": "Temp Amb. a 2 Mts", "valor": "20,30", "alarma": False}],
                **self.extra,
            }
        else:
            datos = [{"fecha": f"{cuerpo['fechaDesde']} 23:50", "valor": "20,30"}]
        return httpx.Response(200, json=datos)


def cliente_falso(sat):
    import httpx

    from app.ingesta.cliente_sat2 import ClienteSat2Http
    from app.ingesta.configuracion import ConfiguracionSat2

    configuracion = ConfiguracionSat2(url_base=URL_FALSA, usuario=USUARIO_FALSO, clave=CLAVE_FALSA)
    return lambda observar: ClienteSat2Http(configuracion, httpx.MockTransport(sat), observar=observar)


@pytest.fixture
def modo_real(monkeypatch):
    from herramientas import capturar_sat2

    monkeypatch.setenv("SAT2_MODO", "real")
    monkeypatch.setattr(capturar_sat2, "PAUSA_SEGUNDOS", 0)
    return capturar_sat2


SECRETOS = (TOKEN, URL_FALSA, "sat2-falsa", USUARIO_FALSO, CLAVE_FALSA, SERIE_FALSA, str(ID_CLIENTE_FALSO))


@pytest.mark.parametrize("modo", ["simulado", "prueba", ""])
def test_fuera_del_modo_real_no_consulta(monkeypatch, capsys, tmp_path, modo):
    from herramientas import capturar_sat2

    monkeypatch.setenv("SAT2_MODO", modo)

    def prohibido(_observar):
        raise AssertionError("No debe consultar SAT2 fuera del modo real")

    monkeypatch.setattr(capturar_sat2, "_cliente_del_worker", prohibido)

    assert capturar_sat2.main(["--salida", str(tmp_path / "r.json")]) == 2
    assert "modo real" in capsys.readouterr().err
    assert not (tmp_path / "r.json").exists()


def test_captura_saneada_en_utf8_sin_secretos(modo_real, monkeypatch, capsys, tmp_path):
    import json as _json
    from datetime import datetime as _datetime
    from datetime import timedelta as _timedelta

    from app.dominio.normalizacion import ZONA_ARGENTINA

    sat = SatFalsa()
    monkeypatch.setattr(modo_real, "_cliente_del_worker", cliente_falso(sat))
    destino = tmp_path / "respuestas.json"

    assert modo_real.main(["--salida", str(destino)]) == 0

    texto = destino.read_bytes().decode("utf-8")
    salida = capsys.readouterr()
    for secreto in SECRETOS:
        assert secreto not in texto
        assert secreto not in salida.out + salida.err
    captura = _json.loads(texto)
    respuestas = captura["respuestas"]
    assert respuestas["AutenticarUsuario"] == {"autenticado": True, "idCliente": 0, "token": REDACTADO}
    assert respuestas["RecuperarEquipos"][0]["descripcion"] == "INTA Pergamino"
    assert respuestas["RecuperarEquipos"][0]["sensores"][0]["unidad"] == "ºC"
    assert respuestas["RecuperarInstantaneosDeEquipo"]["datosSensores"][0]["valor"] == "20,30"
    assert [h["idSensor"] for h in respuestas["RecuperarHistoricosDeEquipoPorSensor"]] == [6, 9]
    ayer = (_datetime.now(ZONA_ARGENTINA) - _timedelta(days=1)).date().isoformat()
    assert captura["dia_historicos"] == ayer
    historicos = [c for m, c in sat.pedidos if m == "RecuperarHistoricosDeEquipoPorSensor"]
    assert {(c["fechaDesde"], c["fechaHasta"]) for c in historicos} == {(ayer, ayer)}
    assert "RecuperarEquipos[0].NroSerie" in salida.out
    assert "RecuperarEquipos[0].enlace" in salida.out


def test_comparar_sin_diferencias_y_con_una_clave_nueva(modo_real, monkeypatch, capsys, tmp_path):
    import json as _json

    monkeypatch.setattr(modo_real, "_cliente_del_worker", cliente_falso(SatFalsa()))
    destino = tmp_path / "respuestas.json"
    modo_real.main(["--salida", str(destino)])
    referencia = tmp_path / "forma.json"
    referencia.write_text(
        _json.dumps(modo_real.forma_de_captura(_json.loads(destino.read_text(encoding="utf-8")))),
        encoding="utf-8",
    )
    monkeypatch.setattr(modo_real, "RUTA_FORMA", referencia)
    capsys.readouterr()

    assert modo_real.main(["--comparar"]) == 0
    assert "Sin diferencias" in capsys.readouterr().out

    con_extra = SatFalsa(extra_en_instantaneos={"bateriaBaja": f"ver {URL_FALSA}"})
    monkeypatch.setattr(modo_real, "_cliente_del_worker", cliente_falso(con_extra))

    assert modo_real.main(["--comparar"]) == 1
    salida = capsys.readouterr()
    assert "RecuperarInstantaneosDeEquipo.bateriaBaja: clave nueva" in salida.out
    for secreto in SECRETOS:
        assert secreto not in salida.out + salida.err


def test_comparar_sin_forma_de_referencia(modo_real, monkeypatch, capsys, tmp_path):
    monkeypatch.setattr(modo_real, "_cliente_del_worker", cliente_falso(SatFalsa()))
    monkeypatch.setattr(modo_real, "RUTA_FORMA", tmp_path / "no-existe.json")

    assert modo_real.main(["--comparar"]) == 2
    assert "forma de referencia" in capsys.readouterr().err


def test_un_error_de_sat2_no_muestra_detalles(modo_real, monkeypatch, capsys, tmp_path):
    from app.ingesta.cliente_sat2 import ErrorSat2

    def caido(_observar):
        raise ErrorSat2(f"falla con {URL_FALSA}")

    monkeypatch.setattr(modo_real, "_cliente_del_worker", caido)

    assert modo_real.main(["--salida", str(tmp_path / "r.json")]) == 1
    salida = capsys.readouterr()
    assert "ErrorSat2" in salida.err
    assert URL_FALSA not in salida.out + salida.err
