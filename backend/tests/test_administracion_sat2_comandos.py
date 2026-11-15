"""El rol de administrador y las claves de SAT2 solo se manejan desde el servidor (D1 y D3)."""

from datetime import UTC, datetime

import pytest

from app import administracion
from app.administracion import (
    ErrorAdministracion,
    hacer_administrador,
    quitar_administrador,
)
from app.cifrado_sat2 import cifrar, descifrar
from app.datos.modelos import Usuario

AHORA = datetime(2026, 11, 7, 12, 0, tzinfo=UTC)


def crear(sesion, email="admin@ejemplo.com", **cambios):
    datos = {
        "email": email,
        "nombre": "Nombre",
        "password_hash": "hash",
        "confirmado_en": AHORA,
    }
    usuario = Usuario(**{**datos, **cambios})
    sesion.add(usuario)
    sesion.flush()
    return usuario


def test_hacer_administradora_una_cuenta_confirmada(sesion):
    usuario = crear(sesion)

    hacer_administrador(sesion, " Admin@Ejemplo.com ")

    assert usuario.es_administrador is True


def test_hacer_administradora_dos_veces_no_falla(sesion):
    usuario = crear(sesion)
    hacer_administrador(sesion, usuario.email)

    hacer_administrador(sesion, usuario.email)

    assert usuario.es_administrador is True


@pytest.mark.parametrize(
    ("cambios", "mensaje"),
    [
        ({"confirmado_en": None}, "sin confirmar"),
        ({"activo": False}, "desactivada"),
    ],
)
def test_una_cuenta_sin_confirmar_o_desactivada_no_puede_ser_administradora(
    sesion, cambios, mensaje
):
    usuario = crear(sesion, **cambios)

    with pytest.raises(ErrorAdministracion, match=mensaje):
        hacer_administrador(sesion, usuario.email)
    assert usuario.es_administrador is False


def test_un_correo_inexistente_se_informa(sesion):
    with pytest.raises(ErrorAdministracion, match="No existe"):
        hacer_administrador(sesion, "nadie@ejemplo.com")


def test_quitar_el_rol(sesion):
    usuario = crear(sesion, es_administrador=True)

    quitar_administrador(sesion, usuario.email)

    assert usuario.es_administrador is False


def test_generar_claves_no_usa_la_base_y_las_claves_funcionan(monkeypatch, capsys):
    def sin_base():
        raise AssertionError("generar-claves-sat2 no debe conectarse a la base")

    monkeypatch.setattr(administracion, "obtener_motor", sin_base)

    assert administracion.principal(["generar-claves-sat2"]) == 0

    lineas = capsys.readouterr().out.splitlines()
    variables = dict(linea.split("=", 1) for linea in lineas if "=" in linea)
    assert set(variables) == {"SAT2_CLAVE_PUBLICA", "SAT2_CLAVE_PRIVADA"}
    configuracion = {"url_base": "https://x.invalid", "usuario": "u", "clave": "c"}
    contenido = cifrar(configuracion, variables["SAT2_CLAVE_PUBLICA"])
    assert descifrar(contenido, variables["SAT2_CLAVE_PRIVADA"]) == configuracion


def test_cada_generacion_da_claves_nuevas(monkeypatch, capsys):
    administracion.principal(["generar-claves-sat2"])
    primera = capsys.readouterr().out
    administracion.principal(["generar-claves-sat2"])

    assert capsys.readouterr().out != primera


def test_los_comandos_de_rol_estan_en_la_linea_de_comandos():
    analizador = administracion._analizador()

    assert analizador.parse_args(["hacer-administrador", "--email", "a@b.c"]).comando == (
        "hacer-administrador"
    )
    assert analizador.parse_args(["quitar-administrador", "--email", "a@b.c"]).comando == (
        "quitar-administrador"
    )
