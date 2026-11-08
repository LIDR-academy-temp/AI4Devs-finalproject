"""La configuración de SAT2 se cifra con una clave pública y solo la clave privada la abre (D3)."""

from pathlib import Path

import pytest

from app import cifrado_sat2
from app.cifrado_sat2 import (
    ClaveAusente,
    ClaveInvalida,
    ConfiguracionIlegible,
    cifrar,
    clave_privada_del_entorno,
    clave_publica_del_entorno,
    descifrar,
    generar_par_de_claves,
)

# Valores ficticios: nunca se usan credenciales reales en las pruebas.
CONFIGURACION = {
    "url_base": "https://sat2.ejemplo.invalid/api",
    "usuario": "usuario-ficticio",
    "clave": "contrasena-ficticia-ñ",
}


@pytest.fixture
def claves():
    return generar_par_de_claves()


def test_ida_y_vuelta(claves):
    publica, privada = claves

    assert descifrar(cifrar(CONFIGURACION, publica), privada) == CONFIGURACION


def test_el_texto_cifrado_no_contiene_los_valores(claves):
    contenido = cifrar(CONFIGURACION, claves[0])

    for valor in CONFIGURACION.values():
        assert valor.encode() not in contenido
    assert b"usuario" not in contenido


def test_dos_cifrados_del_mismo_contenido_son_distintos(claves):
    assert cifrar(CONFIGURACION, claves[0]) != cifrar(CONFIGURACION, claves[0])


def test_otra_clave_privada_no_lo_abre(claves):
    _, otra_privada = generar_par_de_claves()

    with pytest.raises(ConfiguracionIlegible):
        descifrar(cifrar(CONFIGURACION, claves[0]), otra_privada)


def test_un_contenido_alterado_no_se_abre(claves):
    contenido = bytearray(cifrar(CONFIGURACION, claves[0]))
    contenido[-1] ^= 1

    with pytest.raises(ConfiguracionIlegible):
        descifrar(bytes(contenido), claves[1])


def test_el_par_de_claves_es_texto_distinto(claves):
    publica, privada = claves

    assert publica != privada
    assert publica.isascii() and privada.isascii()


@pytest.mark.parametrize("clave", ["", "no-es-base64-!", "QUJD"])
def test_una_clave_publica_mal_formada_se_rechaza(clave):
    with pytest.raises(ClaveInvalida):
        cifrar(CONFIGURACION, clave)


def test_una_clave_privada_mal_formada_se_rechaza(claves):
    with pytest.raises(ClaveInvalida):
        descifrar(cifrar(CONFIGURACION, claves[0]), "QUJD")


def test_los_errores_no_muestran_las_claves(claves):
    publica, privada = claves
    with pytest.raises(ConfiguracionIlegible) as error:
        descifrar(b"basura", privada)

    assert privada not in str(error.value)
    assert publica not in str(error.value)


def test_lee_las_claves_del_entorno(monkeypatch, claves):
    monkeypatch.setenv("SAT2_CLAVE_PUBLICA", claves[0])
    monkeypatch.setenv("SAT2_CLAVE_PRIVADA", claves[1])

    assert clave_publica_del_entorno() == claves[0]
    assert clave_privada_del_entorno() == claves[1]


@pytest.mark.parametrize(
    ("funcion", "variable"),
    [
        (clave_publica_del_entorno, "SAT2_CLAVE_PUBLICA"),
        (clave_privada_del_entorno, "SAT2_CLAVE_PRIVADA"),
    ],
)
@pytest.mark.parametrize("valor", [None, "", "   "])
def test_una_clave_ausente_se_informa_por_su_nombre(monkeypatch, funcion, variable, valor):
    if valor is None:
        monkeypatch.delenv(variable, raising=False)
    else:
        monkeypatch.setenv(variable, valor)

    with pytest.raises(ClaveAusente, match=variable):
        funcion()


def test_el_modulo_no_depende_de_la_api_ni_de_la_ingesta():
    codigo = Path(cifrado_sat2.__file__).read_text(encoding="utf-8")

    assert "app.api" not in codigo
    assert "app.ingesta" not in codigo
