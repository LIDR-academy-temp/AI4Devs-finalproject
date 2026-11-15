"""El manual de operación cubre lo que el sistema define y no tiene enlaces rotos (operations-manual)."""

import argparse
import re
from pathlib import Path

import pytest

from app.administracion import _analizador
from app.datos.modelos import TIPOS_ALERTA
from app.monitoreo import salud

RAIZ = Path(__file__).resolve().parents[2]
MANUAL = RAIZ / "docs" / "clientes"

CAPITULOS = [
    "README.md",
    "01-puesta-en-marcha.md",
    "02-lo-que-ven-los-usuarios.md",
    "03-cuentas-y-administradores.md",
    "04-sat2-y-sus-claves.md",
    "05-monitoreo-y-avisos.md",
    "06-respaldo-y-restauracion.md",
    "07-actualizacion.md",
    "08-seguridad-problemas-y-glosario.md",
]

# El texto que ve el usuario en la franja de salud (SaludEstacion.tsx) para cada estado.
TEXTO_DEL_SEMAFORO = {
    salud.EN_VIVO: "En vivo",
    salud.CON_DEMORAS: "Con demoras",
    salud.CAIDO: "Caído",
    salud.MODO_PRUEBA: "Modo prueba",
}

ENLACE = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)\)")


def leer(nombre: str) -> str:
    return (MANUAL / nombre).read_text(encoding="utf-8")


def comandos_de_administracion() -> list[str]:
    for accion in _analizador()._actions:
        if isinstance(accion, argparse._SubParsersAction):
            return sorted(accion.choices)
    raise AssertionError("El analizador de administración no tiene comandos")


def estados_del_semaforo() -> list[str]:
    return [valor for nombre, valor in vars(salud).items() if nombre.isupper() and isinstance(valor, str)]


@pytest.mark.parametrize("capitulo", CAPITULOS)
def test_existe_cada_capitulo(capitulo):
    assert (MANUAL / capitulo).is_file(), f"Falta el capítulo docs/clientes/{capitulo}"


def test_la_portada_enlaza_todos_los_capitulos():
    portada = leer("README.md")

    faltan = [c for c in CAPITULOS[1:] if f"({c})" not in portada]

    assert not faltan, f"La portada no enlaza: {faltan}"


@pytest.mark.parametrize("tipo", TIPOS_ALERTA)
def test_cada_alerta_tiene_su_entrada(tipo):
    assert f"`{tipo}`" in leer("05-monitoreo-y-avisos.md"), f"El manual no explica la alerta {tipo}"


@pytest.mark.parametrize("estado", estados_del_semaforo())
def test_cada_estado_del_semaforo_tiene_su_entrada(estado):
    assert estado in TEXTO_DEL_SEMAFORO, f"Estado nuevo del semáforo sin texto conocido: {estado}"
    texto = TEXTO_DEL_SEMAFORO[estado]

    assert f"«{texto}»" in leer("05-monitoreo-y-avisos.md"), f"El manual no explica el semáforo «{texto}»"


def test_el_aviso_de_grafana_tiene_su_entrada():
    regla = (RAIZ / "monitoreo/grafana/provisioning/alerting/worker-caido.yaml").read_text(encoding="utf-8")
    titulo = re.search(r"title:\s*(.+)", regla).group(1).strip()

    assert titulo in leer("05-monitoreo-y-avisos.md"), f"El manual no explica el aviso de Grafana «{titulo}»"


@pytest.mark.parametrize("comando", comandos_de_administracion())
def test_cada_comando_de_administracion_esta_documentado(comando):
    assert f"`{comando}`" in leer("03-cuentas-y-administradores.md"), f"El manual no explica el comando {comando}"


def test_enlaces_e_imagenes_existen():
    rotos = []
    for capitulo in CAPITULOS:
        archivo = MANUAL / capitulo
        if not archivo.is_file():
            continue
        for destino in ENLACE.findall(archivo.read_text(encoding="utf-8")):
            if destino.startswith(("http://", "https://", "mailto:", "#")):
                continue
            ruta = destino.split("#", 1)[0]
            if not (archivo.parent / ruta).resolve().exists():
                rotos.append(f"{capitulo}: {destino}")

    assert not rotos, f"Enlaces o imágenes rotos: {rotos}"


def test_no_copia_los_comandos_de_instalacion():
    """La guía de instalación es la única fuente para instalar (D2)."""
    for capitulo in CAPITULOS:
        texto = leer(capitulo) if (MANUAL / capitulo).is_file() else ""
        assert "git clone" not in texto, f"{capitulo} copia los pasos de instalación: enlazá la guía"
