"""Escenarios de "Política de contraseñas" de `account-lifecycle`."""

import pytest

from app.cuentas.contrasenas import (
    LISTA,
    ContrasenaRechazada,
    contrasenas_comunes,
    validar_contrasena,
)

EMAIL = "ana.perez@ejemplo.com"


def rechazo(contrasena, email=EMAIL) -> str:
    with pytest.raises(ContrasenaRechazada) as error:
        validar_contrasena(contrasena, email)
    return str(error.value)


def test_una_contrasena_de_14_caracteres_se_rechaza_e_indica_el_minimo():
    assert "al menos 15 caracteres" in rechazo("a" * 7 + "b" * 7)


def test_15_caracteres_alcanzan():
    validar_contrasena("lluvia en el sur", EMAIL)


def test_una_frase_larga_sin_numeros_ni_simbolos_se_acepta():
    frase = "el viento del oeste trae lluvia al lote"
    assert len(frase) >= 38
    validar_contrasena(frase, EMAIL)


@pytest.mark.parametrize("comun", ["passwordpassword", "qwertyuiopasdfghjkl", "123456789012345"])
def test_una_contrasena_comun_se_rechaza_sin_revelar_la_lista(comun):
    mensaje = rechazo(comun)
    assert mensaje == "Esa contraseña es demasiado común. Elija otra."
    assert comun not in mensaje


def test_la_comparacion_con_la_lista_ignora_mayusculas():
    rechazo("PasswordPassword")


def test_la_normalizacion_no_permite_evadir_la_lista():
    # La misma contraseña común escrita con letras de ancho completo.
    rechazo("ｐａｓｓｗｏｒｄｐａｓｓｗｏｒｄ")


@pytest.mark.parametrize("contrasena", ["ana.perez@ejemplo.com y algo mas", "mi clave es ANA.PEREZ 2026"])
def test_no_puede_contener_el_correo(contrasena):
    assert rechazo(contrasena) == "La contraseña no puede contener su correo."


def test_el_maximo_es_128_caracteres():
    validar_contrasena("x" * 100 + " lote de soja norte", EMAIL)
    assert "como máximo 128" in rechazo("y" * 129)


def test_la_lista_tiene_su_fuente_y_su_licencia():
    encabezado = LISTA.read_text(encoding="utf-8").splitlines()[:4]
    texto = " ".join(encabezado)
    assert "SecLists" in texto
    assert "Licencia MIT" in texto


def test_la_lista_solo_trae_contrasenas_que_la_politica_no_rechaza_por_largo():
    comunes = contrasenas_comunes()
    assert len(comunes) > 300
    assert all(15 <= len(c) <= 128 and c == c.lower() for c in comunes)
