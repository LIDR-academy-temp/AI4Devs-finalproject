"""Copia la base de una instalación a un proyecto aislado y lo arranca en modo de prueba.

Se ejecuta en la computadora anfitriona, desde la raíz del repositorio, con Docker:

    python backend/herramientas/preparar_copia_de_prueba.py

Sirve para ver los datos reales en "Caso de prueba - 1" sin tocar la instalación real (D6 de
weather-track-estaciones). De la base de origen solo se lee: `pg_dump` dentro de su contenedor.
La copia incluye las cuentas reales, así que conviene borrarla al terminar:

    docker compose -p wt-prueba down -v
"""

import argparse
import os
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
PROYECTO_REAL = "weather-track"
NOMBRE_VALIDO = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
MARCAR_COPIA = (
    "INSERT INTO configuracion_base (id, naturaleza) VALUES (1, 'COPIA_DE_PRUEBA') "
    "ON CONFLICT (id) DO UPDATE SET naturaleza = 'COPIA_DE_PRUEBA', fijada_en = now()"
)


class ErrorCopia(Exception):
    """El mensaje explica qué hacer y no contiene datos de la base."""


def compose(proyecto: str, *argumentos: str) -> list[str]:
    return ["docker", "compose", "-p", proyecto, *argumentos]


def ejecutar(comando: list[str], entorno: dict[str, str], **opciones) -> subprocess.CompletedProcess:
    resultado = subprocess.run(comando, cwd=RAIZ, env=entorno, **opciones)
    if resultado.returncode != 0:
        raise ErrorCopia(f"Falló: {' '.join(comando[:6])}")
    return resultado


def validar_proyectos(origen: str, destino: str) -> None:
    for nombre in (origen, destino):
        if not NOMBRE_VALIDO.match(nombre):
            raise ErrorCopia(f"Nombre de proyecto no válido: {nombre}")
    if destino in (origen, PROYECTO_REAL):
        raise ErrorCopia("El destino tiene que ser un proyecto distinto del origen y de la instalación real.")


def base_de_origen_en_marcha(origen: str, entorno: dict[str, str]) -> bool:
    salida = subprocess.run(
        compose(origen, "ps", "--status", "running", "--services"),
        cwd=RAIZ, env=entorno, capture_output=True, text=True,
    ).stdout
    return "db" in salida.split()


def destino_existe(destino: str) -> bool:
    salida = subprocess.run(
        ["docker", "volume", "ls", "-q", "--filter", f"name=^{destino}_datos_db$"],
        capture_output=True, text=True,
    ).stdout
    return bool(salida.strip())


def copiar(origen: str, destino: str, entorno: dict[str, str]) -> None:
    """pg_dump en el origen y pg_restore en el destino, sin pasar por un archivo."""
    volcado = subprocess.Popen(
        compose(origen, "exec", "-T", "db", "pg_dump", "-U", "weather_track", "-Fc", "weather_track"),
        cwd=RAIZ, env=entorno, stdout=subprocess.PIPE,
    )
    restauracion = subprocess.run(
        compose(
            destino, "exec", "-T", "db", "pg_restore", "-U", "weather_track", "-d", "weather_track",
            "--no-owner", "--no-privileges", "--exit-on-error",
        ),
        cwd=RAIZ, env=entorno, stdin=volcado.stdout,
    )
    volcado.stdout.close()
    if volcado.wait() != 0 or restauracion.returncode != 0:
        raise ErrorCopia("No se pudo copiar la base.")


def principal(argumentos: list[str] | None = None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument("--origen", default=PROYECTO_REAL)
    analizador.add_argument("--destino", default="wt-prueba")
    analizador.add_argument("--puerto", default="8089", help="Puerto local de la copia")
    args = analizador.parse_args(argumentos)

    # SAT2_MODO del entorno pisa al de .env: la copia nunca arranca en modo real.
    # Mailpit en otro puerto, para no chocar con el de la instalación real.
    entorno = {
        **os.environ,
        "SAT2_MODO": "prueba",
        "PUERTO_WEB": args.puerto,
        "PUERTO_CORREO": "8029",
    }
    try:
        validar_proyectos(args.origen, args.destino)
        if not base_de_origen_en_marcha(args.origen, entorno):
            raise ErrorCopia(
                f"La base de origen no está en marcha. Iniciarla con: docker compose -p {args.origen} start db"
            )
        if destino_existe(args.destino):
            raise ErrorCopia(
                f"El proyecto {args.destino} ya tiene una base. Borrarla con: "
                f"docker compose -p {args.destino} down -v"
            )
        print(f"Preparando la base de {args.destino}…")
        ejecutar(compose(args.destino, "up", "-d", "--wait", "db"), entorno)
        print(f"Copiando la base de {args.origen} (solo lectura)…")
        copiar(args.origen, args.destino, entorno)
        print("Aplicando migraciones y marcando la copia…")
        ejecutar(compose(args.destino, "run", "--rm", "--build", "migraciones"), entorno)
        ejecutar(
            compose(
                args.destino, "exec", "-T", "db", "psql", "-U", "weather_track", "-d", "weather_track",
                "-v", "ON_ERROR_STOP=1", "-q", "-c", MARCAR_COPIA,
            ),
            entorno,
        )
        print("Arrancando en modo de prueba…")
        ejecutar(compose(args.destino, "up", "--build", "-d", "--wait"), entorno)
    except ErrorCopia as error:
        print(error, file=sys.stderr)
        return 2
    print(f"Lista en http://localhost:{args.puerto}, con las cuentas de la base copiada.")
    print("Sus correos quedan en http://localhost:8029, sin salir a internet.")
    print(f"Contiene datos personales: borrarla al terminar con docker compose -p {args.destino} down -v")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
