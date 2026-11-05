"""Operaciones administrativas sobre cuentas. Las crea ya confirmadas.

    python -m app.administracion crear-usuario --email a@b.example --nombre "Nombre"
    python -m app.administracion asignar-estacion --email a@b.example --id-equipo 1
    python -m app.administracion restablecer-clave --email a@b.example
    python -m app.administracion desactivar-usuario --email a@b.example
    python -m app.administracion exportar-clientes > clientes.csv
"""

import argparse
import csv
import sys
from datetime import UTC, datetime
from typing import TextIO

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.datos.conexion import obtener_motor
from app.datos.modelos import Estacion, Sesion, Usuario, UsuarioEstacion
from app.seguridad import calcular_hash_contrasena, generar_contrasena


class ErrorAdministracion(Exception):
    """Operación imposible. El mensaje se muestra tal cual a quien administra."""


def normalizar_email(email: str) -> str:
    return email.strip().lower()


def _usuario(sesion: Session, email: str) -> Usuario:
    usuario = sesion.scalar(select(Usuario).where(Usuario.email == normalizar_email(email)))
    if usuario is None:
        raise ErrorAdministracion(f"No existe el usuario {normalizar_email(email)}.")
    return usuario


def crear_usuario(sesion: Session, email: str, nombre: str) -> str:
    """Devuelve una clave aleatoria, que no se guarda y solo se puede ver una vez."""
    limpio = normalizar_email(email)
    if "@" not in limpio or len(limpio) > 254:
        raise ErrorAdministracion("El correo no es válido.")
    if not nombre.strip():
        raise ErrorAdministracion("El nombre no puede estar vacío.")
    if sesion.scalar(select(Usuario.id).where(Usuario.email == limpio)):
        raise ErrorAdministracion(f"Ya existe el usuario {limpio}.")
    clave = generar_contrasena()
    sesion.add(
        Usuario(
            email=limpio,
            nombre=nombre.strip(),
            password_hash=calcular_hash_contrasena(clave),
            confirmado_en=datetime.now(UTC),
        )
    )
    sesion.flush()
    return clave


def asignar_estacion(sesion: Session, email: str, id_equipo: int) -> None:
    usuario = _usuario(sesion, email)
    estacion = sesion.scalar(select(Estacion).where(Estacion.id_equipo_sat2 == id_equipo))
    if estacion is None:
        raise ErrorAdministracion(f"No existe la estación con equipo {id_equipo}.")
    if sesion.get(UsuarioEstacion, (usuario.id, estacion.id)) is None:
        sesion.add(UsuarioEstacion(usuario_id=usuario.id, estacion_id=estacion.id))
    sesion.flush()


def restablecer_clave(sesion: Session, email: str) -> str:
    usuario = _usuario(sesion, email)
    clave = generar_contrasena()
    usuario.password_hash = calcular_hash_contrasena(clave)
    sesion.execute(delete(Sesion).where(Sesion.usuario_id == usuario.id))
    sesion.flush()
    return clave


def desactivar_usuario(sesion: Session, email: str) -> None:
    usuario = _usuario(sesion, email)
    usuario.activo = False
    sesion.execute(delete(Sesion).where(Sesion.usuario_id == usuario.id))
    sesion.flush()


COLUMNAS_CLIENTES = (
    "email",
    "nombre",
    "apellido",
    "organizacion",
    "telefono",
    "localidad",
    "provincia",
    "acepta_novedades",
    "terminos_version",
    "terminos_aceptados_en",
    "confirmado_en",
    "creado_en",
)


def _celda(valor: object) -> str:
    """Una planilla ejecuta como fórmula el texto que empieza con =, +, - o @: se lo anula."""
    if valor is None:
        return ""
    if isinstance(valor, datetime):
        return valor.isoformat()
    if isinstance(valor, bool):
        return "si" if valor else "no"
    texto = str(valor)
    return "'" + texto if texto[:1] in ("=", "+", "-", "@") else texto


def exportar_clientes(sesion: Session, salida: TextIO) -> int:
    """Base de clientes: solo cuentas confirmadas y sin datos de acceso. Devuelve cuántas filas."""
    escritor = csv.writer(salida)
    escritor.writerow(COLUMNAS_CLIENTES)
    usuarios = sesion.scalars(
        select(Usuario).where(Usuario.confirmado_en.is_not(None)).order_by(Usuario.creado_en)
    ).all()
    for usuario in usuarios:
        escritor.writerow([_celda(getattr(usuario, columna)) for columna in COLUMNAS_CLIENTES])
    return len(usuarios)


def _analizador() -> argparse.ArgumentParser:
    analizador = argparse.ArgumentParser(description="Administración de cuentas")
    comandos = analizador.add_subparsers(dest="comando", required=True)
    crear = comandos.add_parser("crear-usuario")
    crear.add_argument("--email", required=True)
    crear.add_argument("--nombre", required=True)
    asignar = comandos.add_parser("asignar-estacion")
    asignar.add_argument("--email", required=True)
    asignar.add_argument("--id-equipo", required=True, type=int)
    for nombre in ("restablecer-clave", "desactivar-usuario"):
        comandos.add_parser(nombre).add_argument("--email", required=True)
    comandos.add_parser("exportar-clientes")
    return analizador


def principal(argumentos: list[str] | None = None) -> int:
    args = _analizador().parse_args(argumentos)
    if args.comando == "exportar-clientes":
        # Solo el CSV va a la salida estándar, para poder redirigirla a un archivo.
        with Session(obtener_motor()) as sesion:
            filas = exportar_clientes(sesion, sys.stdout)
        print(f"Cuentas exportadas: {filas}", file=sys.stderr)
        return 0
    clave = None
    with Session(obtener_motor()) as sesion:
        try:
            if args.comando == "crear-usuario":
                clave = crear_usuario(sesion, args.email, args.nombre)
            elif args.comando == "asignar-estacion":
                asignar_estacion(sesion, args.email, args.id_equipo)
            elif args.comando == "restablecer-clave":
                clave = restablecer_clave(sesion, args.email)
            else:
                desactivar_usuario(sesion, args.email)
        except ErrorAdministracion as error:
            print(error, file=sys.stderr)
            return 2
        sesion.commit()
    print("Operación realizada.")
    if clave:
        print(f"Clave generada, se muestra una sola vez: {clave}")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
