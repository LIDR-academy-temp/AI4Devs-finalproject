"""Genera la guía legible de las especificaciones de OpenSpec (documentación viva).

Lee `openspec/specs/*/spec.md` y los cambios archivados, y escribe
`docs/especificaciones/README.md`. La salida no lleva fecha de generación, así que
solo cambia cuando cambian las especificaciones.

Uso, desde la carpeta backend:
    python -m herramientas.documentar_especificaciones
    python -m herramientas.documentar_especificaciones --comprobar
"""

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

RUTA_RAIZ = Path(__file__).resolve().parent.parent.parent
RUTA_GUIA = Path("docs/especificaciones/README.md")
COMANDO = "uv run python -m herramientas.documentar_especificaciones"

# La guía vive en docs/especificaciones, dos niveles debajo de la raíz.
PREFIJO_ENLACE = "../../"
CAMBIO_ARCHIVADO = re.compile(r"^(\d{4}-\d{2}-\d{2})-(.+)$")


class EspecificacionMalFormada(ValueError):
    """La especificación no tiene la estructura que espera OpenSpec."""


@dataclass(frozen=True)
class Requisito:
    nombre: str
    texto: str
    escenarios: list[str]


@dataclass(frozen=True, order=True)
class CambioArchivado:
    carpeta: str
    nombre: str
    fecha: str


@dataclass(frozen=True)
class Capacidad:
    nombre: str
    proposito: str
    requisitos: list[Requisito]
    ultimo_cambio: CambioArchivado | None

    @property
    def escenarios(self) -> int:
        return sum(len(r.escenarios) for r in self.requisitos)


def leer_capacidades(raiz: Path) -> list[Capacidad]:
    carpetas = sorted((raiz / "openspec/specs").iterdir(), key=lambda ruta: ruta.name)
    return [
        _leer_capacidad(raiz, carpeta.name)
        for carpeta in carpetas
        if (carpeta / "spec.md").is_file()
    ]


def _leer_capacidad(raiz: Path, nombre: str) -> Capacidad:
    lineas = (raiz / "openspec/specs" / nombre / "spec.md").read_text(encoding="utf-8").splitlines()
    proposito: list[str] = []
    requisitos: list[Requisito] = []
    seccion = ""
    requisito: str | None = None
    texto: list[str] = []
    escenarios: list[str] = []
    en_escenario = False

    def cerrar_requisito() -> None:
        if requisito is None:
            return
        if not escenarios:
            raise EspecificacionMalFormada(f"{nombre}: el requisito «{requisito}» no tiene escenarios")
        requisitos.append(Requisito(requisito, "\n".join(texto).strip(), list(escenarios)))

    for linea in lineas:
        if linea.startswith("## "):
            seccion = linea[3:].strip()
        elif linea.startswith("### Requirement:"):
            cerrar_requisito()
            requisito = linea.removeprefix("### Requirement:").strip()
            texto, escenarios, en_escenario = [], [], False
        elif linea.startswith("#### Scenario:"):
            escenarios.append(linea.removeprefix("#### Scenario:").strip())
            en_escenario = True
        elif seccion == "Purpose":
            proposito.append(linea)
        elif requisito is not None and not en_escenario:
            texto.append(linea)
    cerrar_requisito()

    proposito_texto = " ".join(parte.strip() for parte in proposito if parte.strip())
    if not proposito_texto:
        raise EspecificacionMalFormada(f"{nombre}: falta la sección Purpose")
    if not requisitos:
        raise EspecificacionMalFormada(f"{nombre}: no tiene requisitos")
    return Capacidad(nombre, proposito_texto, requisitos, _ultimo_cambio(raiz, nombre))


def _ultimo_cambio(raiz: Path, capacidad: str) -> CambioArchivado | None:
    archivo = raiz / "openspec/changes/archive"
    if not archivo.is_dir():
        return None
    # El nombre empieza con la fecha, así que el mayor es el más reciente.
    cambios = sorted(
        CambioArchivado(carpeta.name, coincidencia.group(2), coincidencia.group(1))
        for carpeta in archivo.iterdir()
        if (coincidencia := CAMBIO_ARCHIVADO.match(carpeta.name))
        and (carpeta / "specs" / capacidad).is_dir()
    )
    return cambios[-1] if cambios else None


def _plural(cantidad: int, singular: str, plural: str) -> str:
    return f"{cantidad} {singular if cantidad == 1 else plural}"


def _enlace_cambio(cambio: CambioArchivado | None) -> str:
    if cambio is None:
        return "Sin cambios archivados"
    ruta = f"{PREFIJO_ENLACE}openspec/changes/archive/{cambio.carpeta}/proposal.md"
    return f"[{cambio.nombre}]({ruta}), {cambio.fecha}"


def _celda(texto: str) -> str:
    return texto.replace("|", "\\|")


def generar_guia(raiz: Path) -> str:
    capacidades = leer_capacidades(raiz)
    requisitos = sum(len(c.requisitos) for c in capacidades)
    escenarios = sum(c.escenarios for c in capacidades)
    partes = [
        "# Especificaciones de Weather Track",
        "",
        "> Este archivo se genera desde `openspec/specs` y no se edita a mano.",
        f"> Para regenerarlo, desde `backend/`: `{COMANDO}`.",
        "",
        (
            "Qué hace Weather Track, según sus especificaciones de OpenSpec: "
            f"{_plural(len(capacidades), 'capacidad', 'capacidades')}, "
            f"{_plural(requisitos, 'requisito', 'requisitos')} y "
            f"{_plural(escenarios, 'escenario', 'escenarios')}. "
            "Cada capacidad enlaza su especificación, donde están los escenarios completos, "
            "y el último cambio archivado que la modificó."
        ),
        "",
        "## Índice",
        "",
        "| Capacidad | Propósito | Requisitos | Escenarios | Último cambio archivado |",
        "|---|---|---|---|---|",
    ]
    for capacidad in capacidades:
        partes.append(
            f"| [{capacidad.nombre}](#{capacidad.nombre}) | {_celda(capacidad.proposito)} | "
            f"{len(capacidad.requisitos)} | {capacidad.escenarios} | "
            f"{_enlace_cambio(capacidad.ultimo_cambio)} |"
        )
    for capacidad in capacidades:
        ruta = f"openspec/specs/{capacidad.nombre}/spec.md"
        partes += [
            "",
            f"## {capacidad.nombre}",
            "",
            capacidad.proposito,
            "",
            (
                f"Especificación: [{ruta}]({PREFIJO_ENLACE}{ruta}). "
                f"Último cambio archivado: {_enlace_cambio(capacidad.ultimo_cambio)}."
            ),
        ]
        for requisito in capacidad.requisitos:
            partes += ["", f"### {requisito.nombre}", "", requisito.texto, "", "Escenarios:", ""]
            partes += [f"- {escenario}" for escenario in requisito.escenarios]
    return "\n".join(partes) + "\n"


def main(argv: list[str] | None = None, raiz: Path = RUTA_RAIZ) -> int:
    lector = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    lector.add_argument(
        "--comprobar",
        action="store_true",
        help="no escribe: termina con error si la guía versionada está desactualizada",
    )
    opciones = lector.parse_args(argv)
    destino = raiz / RUTA_GUIA
    guia = generar_guia(raiz)

    if opciones.comprobar:
        if destino.is_file() and destino.read_text(encoding="utf-8") == guia:
            print(f"{RUTA_GUIA.as_posix()} está al día.")
            return 0
        print(
            f"{RUTA_GUIA.as_posix()} no coincide con las especificaciones. "
            f"Regenerarla desde backend/ con: {COMANDO}",
            file=sys.stderr,
        )
        return 1

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(guia, encoding="utf-8", newline="\n")
    print(f"Guía escrita en {RUTA_GUIA.as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
