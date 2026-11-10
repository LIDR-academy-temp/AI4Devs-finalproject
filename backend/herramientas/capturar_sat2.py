"""Captura saneada de respuestas reales de SAT2 y comparación de su forma (weather-track-contrato-sat2).

La ejecuta el responsable dentro del worker de su instalación, en modo real:

    docker compose exec -T worker python -m herramientas.capturar_sat2 --salida /tmp/respuestas.json
    docker compose cp worker:/tmp/respuestas.json backend/tests/datos_sat2/respuestas.json

    docker compose exec -T worker python -m herramientas.capturar_sat2 --comparar

Nada sensible llega al archivo ni a la terminal: las respuestas se sanean antes de escribirlas.
"""

import argparse
import json
import os
import re
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

VERSION = 1
REDACTADO = "<redactado>"
RUTA_FORMA = Path(__file__).resolve().parent / "forma_sat2.json"
ID_EQUIPO = 1
PAUSA_SEGUNDOS = 2.0

CLAVE_SENSIBLE = re.compile(r"token|clave|password|usuario|cliente|mail|correo|serie", re.IGNORECASE)
URL = re.compile(r"https?://|www\.", re.IGNORECASE)
CORREO = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
# Un token: 24 caracteres o más, sin espacios. Las fechas, nombres y descripciones tienen espacios
# o son más cortos.
TOKEN = re.compile(r"^[A-Za-z0-9._\-+/=]{24,}$")

AUTENTICACION = "AutenticarUsuario"
EQUIPOS = "RecuperarEquipos"
INSTANTANEOS = "RecuperarInstantaneosDeEquipo"
HISTORICOS = "RecuperarHistoricosDeEquipoPorSensor"


# Saneado


def _vaciar(valor: Any) -> Any:
    """Conserva la estructura y el tipo, sin ningún valor."""
    if isinstance(valor, dict):
        return {clave: _vaciar(interno) for clave, interno in valor.items()}
    if isinstance(valor, list):
        return [_vaciar(interno) for interno in valor]
    if isinstance(valor, bool) or valor is None:
        return valor
    if isinstance(valor, int | float):
        return 0
    return REDACTADO


def _texto_sensible(valor: str) -> bool:
    return bool(URL.search(valor) or CORREO.search(valor) or TOKEN.match(valor))


def sanear(datos: Any, ruta: str) -> tuple[Any, list[str]]:
    """Devuelve una copia saneada y las rutas reemplazadas, sin sus valores."""
    rutas: list[str] = []

    def recorrer(valor: Any, donde: str) -> Any:
        if isinstance(valor, dict):
            copia = {}
            for clave, interno in valor.items():
                destino = f"{donde}.{clave}"
                if CLAVE_SENSIBLE.search(clave) and interno is not None:
                    rutas.append(destino)
                    copia[clave] = _vaciar(interno)
                else:
                    copia[clave] = recorrer(interno, destino)
            return copia
        if isinstance(valor, list):
            return [recorrer(interno, f"{donde}[{n}]") for n, interno in enumerate(valor)]
        if isinstance(valor, str) and _texto_sensible(valor):
            rutas.append(donde)
            return REDACTADO
        return valor

    return recorrer(datos, ruta), rutas


# Forma


def _tipo(valor: Any) -> str:
    if valor is None:
        return "nulo"
    if isinstance(valor, bool):
        return "booleano"
    # Entero y decimal son lo mismo: JSON escribe 0 o 0.0 según el valor, no según el campo.
    if isinstance(valor, int | float):
        return "numero"
    return "texto"


def _combinar(a: Any, b: Any) -> Any:
    if a == b:
        return a
    if isinstance(a, dict) and isinstance(b, dict):
        combinada = dict(a)
        for clave, valor in b.items():
            combinada[clave] = _combinar(a[clave], valor) if clave in a else valor
        return combinada
    if isinstance(a, list) and isinstance(b, list):
        if not a or not b:
            return a or b
        return [_combinar(a[0], b[0])]
    return "|".join(sorted(set(_nombres(a)) | set(_nombres(b))))


def _nombres(forma_: Any) -> list[str]:
    if isinstance(forma_, dict):
        return ["objeto"]
    if isinstance(forma_, list):
        return ["lista"]
    return forma_.split("|")


def forma(datos: Any) -> Any:
    """Las claves y los tipos de una respuesta, sin sus valores."""
    if isinstance(datos, dict):
        return {clave: forma(valor) for clave, valor in datos.items()}
    if isinstance(datos, list):
        if not datos:
            return []
        combinada = forma(datos[0])
        for elemento in datos[1:]:
            combinada = _combinar(combinada, forma(elemento))
        return [combinada]
    return _tipo(datos)


def comparar(referencia: Any, actual: Any, ruta: str) -> list[str]:
    """Las diferencias de la forma actual respecto de la de referencia, sin valores."""
    if isinstance(referencia, dict) and isinstance(actual, dict):
        diferencias = []
        for clave, valor in referencia.items():
            if clave not in actual:
                diferencias.append(f"{ruta}.{clave}: ya no llega")
            else:
                diferencias += comparar(valor, actual[clave], f"{ruta}.{clave}")
        diferencias += [f"{ruta}.{clave}: clave nueva" for clave in actual if clave not in referencia]
        return diferencias
    if isinstance(referencia, list) and isinstance(actual, list):
        if not referencia or not actual:
            return []
        return comparar(referencia[0], actual[0], f"{ruta}[]")
    vistos, nuevos = set(_nombres(referencia)), set(_nombres(actual))
    if nuevos <= vistos:
        return []
    return [f"{ruta}: el tipo pasó de {'|'.join(sorted(vistos))} a {'|'.join(sorted(nuevos))}"]


# Captura


def forma_de_captura(captura: dict[str, Any]) -> dict[str, Any]:
    """La forma de cada método. Los históricos de todos los sensores se combinan en una sola."""
    respuestas = captura["respuestas"]
    historicos = [forma(item["respuesta"]) for item in respuestas[HISTORICOS]]
    combinada: Any = historicos[0] if historicos else []
    for otra in historicos[1:]:
        combinada = _combinar(combinada, otra)
    return {
        AUTENTICACION: forma(respuestas[AUTENTICACION]),
        EQUIPOS: forma(respuestas[EQUIPOS]),
        INSTANTANEOS: forma(respuestas[INSTANTANEOS]),
        HISTORICOS: combinada,
    }


def capturar(
    crear_cliente: Callable[[Callable[[str, Any], None]], Any],
    ahora: datetime,
    pausa_segundos: float,
    dormir: Callable[[float], None] = time.sleep,
) -> tuple[dict[str, Any], list[str]]:
    """Pide las respuestas a SAT2 y las devuelve saneadas, con las rutas reemplazadas."""
    from app.dominio.normalizacion import ZONA_ARGENTINA

    vistas: list[tuple[str, Any]] = []
    cliente = crear_cliente(lambda metodo, datos: vistas.append((metodo, datos)))
    equipos = cliente.recuperar_equipos()
    dormir(pausa_segundos)
    cliente.recuperar_instantaneos(ID_EQUIPO)
    ayer = (ahora.astimezone(ZONA_ARGENTINA) - timedelta(days=1)).date()
    equipo = next((e for e in equipos if e.get("idEquipo") == ID_EQUIPO), {})
    sensores = [s["idSensor"] for s in equipo.get("sensores", []) if "idSensor" in s]
    for id_sensor in sensores:
        dormir(pausa_segundos)
        cliente.recuperar_historicos(ID_EQUIPO, id_sensor, ayer, ayer)

    def primera(metodo: str) -> Any:
        return next(datos for nombre, datos in vistas if nombre == metodo)

    rutas: list[str] = []

    def limpio(datos: Any, ruta: str) -> Any:
        saneado, reemplazadas = sanear(datos, ruta)
        rutas.extend(reemplazadas)
        return saneado

    historicos = [datos for nombre, datos in vistas if nombre == HISTORICOS]
    captura = {
        "herramienta": f"capturar_sat2 {VERSION}",
        "capturado_en": ahora.astimezone(UTC).isoformat(timespec="seconds"),
        "equipo": ID_EQUIPO,
        "dia_historicos": ayer.isoformat(),
        "respuestas": {
            AUTENTICACION: limpio(primera(AUTENTICACION), AUTENTICACION),
            EQUIPOS: limpio(primera(EQUIPOS), EQUIPOS),
            INSTANTANEOS: limpio(primera(INSTANTANEOS), INSTANTANEOS),
            HISTORICOS: [
                {"idSensor": id_sensor, "respuesta": limpio(datos, f"{HISTORICOS}[idSensor={id_sensor}]")}
                for id_sensor, datos in zip(sensores, historicos, strict=True)
            ],
        },
    }
    return captura, rutas


def _cliente_del_worker(observar: Callable[[str, Any], None]) -> Any:
    """El cliente con la misma configuración que usa el worker: la de «Administración» o el .env."""
    from sqlalchemy.orm import sessionmaker

    from app.datos.conexion import obtener_motor
    from app.ingesta.cliente_sat2 import ClienteSat2Http
    from app.ingesta.origen_sat2 import OrigenSat2
    from app.ingesta.worker import RUTA_ENV

    origen = OrigenSat2(
        sessionmaker(obtener_motor()),
        RUTA_ENV,
        crear_http=lambda configuracion: ClienteSat2Http(configuracion, observar=observar),
    )
    return origen.cliente()


def main(argv: list[str] | None = None) -> int:
    lector = argparse.ArgumentParser(description="Captura saneada de respuestas reales de SAT2")
    accion = lector.add_mutually_exclusive_group(required=True)
    accion.add_argument("--salida", type=Path, help="archivo donde escribir las respuestas saneadas")
    accion.add_argument(
        "--comparar", action="store_true", help="compara la forma actual con la de referencia"
    )
    opciones = lector.parse_args(argv)

    if os.environ.get("SAT2_MODO") != "real":
        print("La captura solo corre en modo real: no se consultó SAT2.", file=sys.stderr)
        return 2
    if opciones.comparar and not RUTA_FORMA.is_file():
        print("Falta la forma de referencia: herramientas/forma_sat2.json.", file=sys.stderr)
        return 2

    from app.ingesta.cliente_sat2 import ErrorSat2
    from app.ingesta.configuracion import ConfiguracionIncompleta
    from app.ingesta.origen_sat2 import ConfiguracionSat2Ilegible

    try:
        captura, rutas = capturar(_cliente_del_worker, datetime.now(UTC), PAUSA_SEGUNDOS)
    except (ConfiguracionIncompleta, ConfiguracionSat2Ilegible) as error:
        # Estos mensajes solo nombran variables, nunca valores.
        print(f"Sin configuración de SAT2 utilizable: {error}", file=sys.stderr)
        return 1
    except ErrorSat2 as error:
        # El detalle de un error de SAT2 podría incluir datos de la conexión: solo el tipo.
        print(f"SAT2 no respondió como se esperaba: {type(error).__name__}", file=sys.stderr)
        return 1

    if opciones.comparar:
        referencia = json.loads(RUTA_FORMA.read_text(encoding="utf-8"))
        actual = forma_de_captura(captura)
        diferencias = [
            diferencia
            for metodo in referencia
            for diferencia in comparar(referencia[metodo], actual.get(metodo, {}), metodo)
        ]
        if not diferencias:
            print("Sin diferencias con la forma de referencia.")
            return 0
        print("SAT2 cambió la forma de sus respuestas:")
        for diferencia in diferencias:
            print(f"  - {diferencia}")
        return 1

    opciones.salida.write_text(
        json.dumps(captura, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    total = 3 + len(captura["respuestas"][HISTORICOS])
    print(f"Respuestas guardadas en {opciones.salida}: {total}.")
    print("Rutas saneadas (sin sus valores):")
    for ruta in rutas:
        print(f"  - {ruta}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
