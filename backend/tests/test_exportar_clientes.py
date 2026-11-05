"""Exportación de la base de clientes: escenarios de `customer-base`."""

import csv
import io
from contextlib import nullcontext
from datetime import UTC, datetime

from app import administracion
from app.administracion import COLUMNAS_CLIENTES, exportar_clientes
from app.datos.modelos import Usuario

AHORA = datetime(2026, 11, 4, 12, 0, tzinfo=UTC)


def cuenta(sesion, email, confirmada=True, **datos):
    usuario = Usuario(
        email=email,
        nombre=datos.pop("nombre", "Ana"),
        password_hash="$argon2id$hash-secreto",
        confirmado_en=AHORA if confirmada else None,
        creado_en=AHORA,
        **datos,
    )
    sesion.add(usuario)
    sesion.flush()
    return usuario


def exportar(sesion):
    salida = io.StringIO()
    filas = exportar_clientes(sesion, salida)
    return filas, list(csv.DictReader(io.StringIO(salida.getvalue()))), salida.getvalue()


def test_exporta_solo_las_cuentas_confirmadas(sesion):
    cuenta(sesion, "ana@ejemplo.com", localidad="Pergamino", acepta_novedades=True, terminos_version="2026-11")
    cuenta(sesion, "sin.confirmar@ejemplo.com", confirmada=False)

    filas, registros, _ = exportar(sesion)

    assert filas == 1
    [ana] = registros
    assert ana["email"] == "ana@ejemplo.com"
    assert ana["localidad"] == "Pergamino"
    assert ana["acepta_novedades"] == "si"
    assert ana["terminos_version"] == "2026-11"
    assert ana["confirmado_en"] == AHORA.isoformat()


def test_no_incluye_datos_de_acceso(sesion):
    cuenta(sesion, "ana@ejemplo.com")
    _, registros, texto = exportar(sesion)
    assert tuple(registros[0]) == COLUMNAS_CLIENTES
    assert "argon2" not in texto
    assert "password" not in texto


def test_anula_las_formulas_de_planilla(sesion):
    cuenta(sesion, "ana@ejemplo.com", nombre="=HIPERVINCULO(\"x\")", organizacion="+54 coop")
    _, [fila], _ = exportar(sesion)
    assert fila["nombre"] == "'=HIPERVINCULO(\"x\")"
    assert fila["organizacion"] == "'+54 coop"


def test_el_comando_escribe_el_csv_en_la_salida_estandar(sesion, monkeypatch, capsys):
    cuenta(sesion, "ana@ejemplo.com")
    monkeypatch.setattr(administracion, "obtener_motor", lambda: None)
    monkeypatch.setattr(administracion, "Session", lambda _motor: nullcontext(sesion))

    assert administracion.principal(["exportar-clientes"]) == 0

    capturado = capsys.readouterr()
    assert capturado.out.splitlines()[0] == ",".join(COLUMNAS_CLIENTES)
    assert "ana@ejemplo.com" in capturado.out
    assert "Cuentas exportadas: 1" in capturado.err
