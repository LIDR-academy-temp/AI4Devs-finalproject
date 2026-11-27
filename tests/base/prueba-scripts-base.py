#!/usr/bin/env python3
"""
Prueba de los scripts de la base (scripts/base/) que deciden si la
integración continua queda en verde, sin necesitar la base:

- analizar() de comprobar-estructura.py: qué salida acepta como «sin fallas»
  y cuál rechaza (sin RESUMEN, cero tablas, líneas mal formadas).
- sin_pareja() de correr-validaciones.py: cada migración con su validación
  y ninguna validación huérfana.
- leer_sql() de base_local.py: un fichero que falta se informa con nuestro
  mensaje, no con un error de Python.
- main() de cada script: que la decisión de la integración continua use de
  verdad esas piezas (se le cambia de dónde lee y qué le responde la base).

Un caso que debe pasar y uno que debe rechazarse por pieza (CLAUDE.md §4).

Uso:  python3 tests/base/prueba-scripts-base.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import contextlib
import importlib.util
import io
import sys
import tempfile
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import leer_sql  # noqa: E402


def cargar(nombre: str):
    spec = importlib.util.spec_from_file_location(nombre.replace("-", "_"), RAIZ / "scripts" / "base" / f"{nombre}.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


comprobar = cargar("comprobar-estructura")
validaciones = cargar("correr-validaciones")

RESUMEN_BUENO = "RESUMEN\t1\t1\t0\t2"
FALLA_BUENA = "FALLA\tpublic.t\tsin-organizacion_id\tla tabla no tiene la columna organizacion_id\t"


def main() -> int:
    resultados = []

    def caso(nombre: str, ok: bool, detalle: str):
        resultados.append(ok)
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")

    # analizar()
    f, r, e = comprobar.analizar(RESUMEN_BUENO + "\n")
    caso("P1 salida sin fallas y con una tabla recorrida", not f and not e and r["tablas"] == 1, f"errores {e}")
    f, r, e = comprobar.analizar(FALLA_BUENA + "\n" + RESUMEN_BUENO + "\n")
    caso("P2 una falla bien formada se lee como falla", f == [["public.t", "sin-organizacion_id",
                                                              "la tabla no tiene la columna organizacion_id"]]
         and not e, f"fallas {f}, errores {e}")
    _, _, e = comprobar.analizar("")
    caso("N1 sin línea RESUMEN no se aprueba", bool(e), f"errores {e}")
    _, _, e = comprobar.analizar("RESUMEN\t3\t0\t0\t0\n")
    caso("N2 cero tablas recorridas no se aprueba", bool(e), f"errores {e}")
    _, _, e = comprobar.analizar("FALLA\tpublic.evasora\tx\tsin-organizacion_id\texplicación\t\n" + RESUMEN_BUENO)
    caso("N3 una FALLA con campos de más no se ignora", bool(e), f"errores {e}")
    _, _, e = comprobar.analizar("FALLA\tpublic.evas\n" + "ora\tsin-organizacion_id\tx\t\n" + RESUMEN_BUENO)
    caso("N4 una FALLA partida por un salto de línea no se ignora", bool(e), f"errores {e}")
    _, _, e = comprobar.analizar("RESUMEN\tuno\t1\t0\t0\n")
    caso("N5 un RESUMEN sin números no se aprueba", bool(e), f"errores {e}")

    # sin_pareja()
    h = validaciones.sin_pareja(["20261123170000_organizacion.sql"], ["20261123170000_organizacion.sql"])
    caso("P3 cada migración con su validación", h == [], f"sin pareja {h}")
    h = validaciones.sin_pareja(["20261123170000_organizacion.sql", "20261130000000_usuario.sql"],
                                ["20261123170000_organizacion.sql"])
    caso("N6 una migración sin validación", len(h) == 1 and "20261130000000_usuario.sql" in h[0], f"sin pareja {h}")
    h = validaciones.sin_pareja(["20261123170000_organizacion.sql"],
                                ["20261123170000_organizacion.sql", "20261130000000_usuario.sql"])
    caso("N7 una validación sin migración", len(h) == 1 and "20261130000000_usuario.sql" in h[0], f"sin pareja {h}")

    # leer_sql()
    with tempfile.TemporaryDirectory() as tmp:
        existe = Path(tmp) / "existe.sql"
        existe.write_text("select 1;", encoding="utf-8")
        caso("P4 lee un fichero que existe", leer_sql(existe) == "select 1;", "leído")
        try:
            leer_sql(Path(tmp) / "no-existe.sql")
            caso("N8 un fichero que falta se informa con mensaje propio", False, "no se detuvo")
        except SystemExit as salida:
            mensaje = str(salida.code)
            caso("N8 un fichero que falta se informa con mensaje propio",
                 mensaje.startswith("ERROR: no existe") and "no-existe.sql" in mensaje, mensaje)

    # main() de cada script: que la decisión de la integración continua use de
    # verdad las piezas anteriores. Se le cambia de dónde lee y qué le responde
    # la base, sin base de verdad.
    def correr_main(modulo, *args):
        salida = io.StringIO()
        try:
            with contextlib.redirect_stdout(salida):
                codigo = modulo.main(*args)
        except SystemExit as e:
            return f"salió: {e.code}", salida.getvalue()
        return codigo, salida.getvalue()

    with tempfile.TemporaryDirectory() as tmp:
        migraciones, carpeta = Path(tmp) / "migrations", Path(tmp) / "validaciones"
        migraciones.mkdir()
        carpeta.mkdir()
        (migraciones / "20261130000000_usuario.sql").write_text("select 1;", encoding="utf-8")
        originales = (validaciones.MIGRACIONES, validaciones.CARPETA)
        validaciones.MIGRACIONES, validaciones.CARPETA = migraciones, carpeta
        try:
            codigo, texto = correr_main(validaciones, [])
            caso("N9 correr-validaciones, sin argumentos, falla con una migración sin validación",
                 codigo == 1 and "20261130000000_usuario.sql" in texto, f"código {codigo}")
            (carpeta / "20261130000000_usuario.sql").write_text("select 1;", encoding="utf-8")
            (carpeta / "20261201000000_huerfana.sql").write_text("select 1;", encoding="utf-8")
            codigo, texto = correr_main(validaciones, [])
            caso("N10 correr-validaciones, sin argumentos, falla con una validación sin migración",
                 codigo == 1 and "20261201000000_huerfana.sql" in texto, f"código {codigo}")
        finally:
            validaciones.MIGRACIONES, validaciones.CARPETA = originales

    originales = (comprobar.psql_ok, comprobar.leer_sql, comprobar.COMPROBACION)
    comprobar.leer_sql = lambda fichero: "select 1;"
    try:
        comprobar.psql_ok = lambda sql: RESUMEN_BUENO + "\n"
        codigo, _ = correr_main(comprobar)
        caso("P5 comprobar-estructura aprueba una salida sin fallas", codigo == 0, f"código {codigo}")
        comprobar.psql_ok = lambda sql: "RESUMEN\t3\t0\t0\t0\n"
        codigo, _ = correr_main(comprobar)
        caso("N11 comprobar-estructura no aprueba si no recorrió ninguna tabla", codigo == 1, f"código {codigo}")
        comprobar.psql_ok = lambda sql: "FALLA\tpublic.evas\nora\tsin-organizacion_id\tx\t\n" + RESUMEN_BUENO
        codigo, _ = correr_main(comprobar)
        caso("N12 comprobar-estructura no aprueba una falla partida", codigo == 1, f"código {codigo}")
        comprobar.leer_sql = originales[1]
        comprobar.COMPROBACION = Path(tempfile.gettempdir()) / f"no-existe-{uuid.uuid4()}.sql"
        codigo, _ = correr_main(comprobar)
        caso("N13 comprobar-estructura informa con mensaje propio si falta su SQL",
             isinstance(codigo, str) and "ERROR: no existe" in codigo, str(codigo))
    finally:
        comprobar.psql_ok, comprobar.leer_sql, comprobar.COMPROBACION = originales

    malos = resultados.count(False)
    print(f"prueba-scripts-base: {len(resultados) - malos} de {len(resultados)} casos dan lo esperado.")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())
