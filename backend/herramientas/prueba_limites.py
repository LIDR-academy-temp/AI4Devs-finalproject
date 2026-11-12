"""Mide el rango máximo por consulta y la antigüedad de los históricos de SAT2.

Hace una consulta por vez, con pausas, sobre un solo sensor. Solo informa fechas,
cantidades y tiempos: nunca imprime ni guarda credenciales, tokens o cuerpos de error.

Uso, desde la carpeta backend:
    python -m herramientas.prueba_limites --simulado
    python -m herramientas.prueba_limites
"""

import argparse
import json
import sys
import time
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from app.ingesta.cliente_sat2 import ClienteSat2, ClienteSat2Http, ErrorSat2
from app.ingesta.cliente_simulado import ClienteSat2Simulado
from app.ingesta.configuracion import ConfiguracionIncompleta, cargar_configuracion

RAIZ_BACKEND = Path(__file__).resolve().parent.parent
RUTA_ENV = RAIZ_BACKEND.parent / ".env"
RUTA_INFORME = RAIZ_BACKEND / ".salida" / "limites_sat2.json"

VENTANAS_DIAS = (1, 7, 31, 62, 93, 184, 365)
REGISTROS_POR_DIA = 144
PAUSA_SEGUNDOS = 2.0
MAX_CONSULTAS = 40
MAX_ERRORES_SEGUIDOS = 3
ZONA_ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")


class LimiteDeConsultas(Exception):
    """Se alcanzó el tope de consultas o de errores seguidos."""


def elegir_sensor(equipo: dict[str, Any]) -> dict[str, Any]:
    """Prefiere temperatura, que informa de forma continua."""
    for sensor in equipo["sensores"]:
        if "temp" in sensor["nombre"].lower():
            return sensor
    return equipo["sensores"][0]


def leer_fecha_alta(equipo: dict[str, Any]) -> date | None:
    try:
        return datetime.strptime(equipo["fechaAlta"].split()[0], "%d/%m/%Y").date()
    except (KeyError, ValueError, IndexError):
        return None


def extremos_de_fechas(registros: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    fechas = sorted(str(r["fecha"]) for r in registros if r.get("fecha"))
    return (fechas[0], fechas[-1]) if fechas else (None, None)


class Medidor:
    """Encapsula el ritmo de consultas y sus topes de seguridad."""

    def __init__(
        self,
        cliente: ClienteSat2,
        dormir: Callable[[float], None],
        reloj: Callable[[], float],
        pausa: float,
    ) -> None:
        self._cliente = cliente
        self._dormir = dormir
        self._reloj = reloj
        self._pausa = pausa
        self.consultas = 0
        self._errores_seguidos = 0

    def consultar(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> tuple[list[dict[str, Any]] | None, str | None, float]:
        if self.consultas >= MAX_CONSULTAS:
            raise LimiteDeConsultas("Tope de consultas alcanzado")
        if self.consultas:
            self._dormir(self._pausa)
        self.consultas += 1
        inicio = self._reloj()
        try:
            registros = self._cliente.recuperar_historicos(
                id_equipo, id_sensor, desde, hasta
            )
        except ErrorSat2 as error:
            self._errores_seguidos += 1
            if self._errores_seguidos >= MAX_ERRORES_SEGUIDOS:
                raise LimiteDeConsultas("Errores seguidos de la fuente") from None
            return None, type(error).__name__, self._reloj() - inicio
        self._errores_seguidos = 0
        return registros, None, self._reloj() - inicio


def medir_rango(
    medidor: Medidor, id_equipo: int, id_sensor: int, referencia: date
) -> tuple[list[dict[str, Any]], int | None]:
    """Prueba ventanas crecientes y se detiene ante el primer fallo o recorte."""
    resultados = []
    rango_seguro = None
    for dias in VENTANAS_DIAS:
        desde = referencia - timedelta(days=dias - 1)
        registros, error, segundos = medidor.consultar(
            id_equipo, id_sensor, desde, referencia
        )
        fila: dict[str, Any] = {
            "dias": dias,
            "desde": desde.isoformat(),
            "hasta": referencia.isoformat(),
            "segundos": round(segundos, 2),
            "registros_esperados": dias * REGISTROS_POR_DIA,
        }
        if registros is None:
            resultados.append({**fila, "resultado": "error", "error": error})
            break
        primera, ultima = extremos_de_fechas(registros)
        recortada = primera is None or primera[:10] > desde.isoformat()
        resultados.append(
            {
                **fila,
                "resultado": "recortada" if recortada else "completa",
                "registros": len(registros),
                "primera_fecha": primera,
                "ultima_fecha": ultima,
                "orden_descendente": bool(registros)
                and str(registros[0].get("fecha")) == ultima,
            }
        )
        if recortada:
            break
        rango_seguro = dias
    return resultados, rango_seguro


def medir_antiguedad(
    medidor: Medidor,
    id_equipo: int,
    id_sensor: int,
    fecha_alta: date | None,
    referencia: date,
) -> dict[str, Any]:
    """Busca por bisección el día más antiguo con datos, con consultas de un día."""

    def tiene_datos(dia: date) -> bool | None:
        registros, _, _ = medidor.consultar(id_equipo, id_sensor, dia, dia)
        return None if registros is None else bool(registros)

    if fecha_alta is None:
        return {"resultado": "sin_fecha_de_alta"}
    if tiene_datos(fecha_alta):
        return {"resultado": "desde_el_alta", "fecha_mas_antigua": fecha_alta.isoformat()}

    sin_datos, con_datos = fecha_alta, referencia
    if not tiene_datos(con_datos):
        return {"resultado": "sin_datos_en_la_referencia"}
    while (con_datos - sin_datos).days > 1:
        medio = sin_datos + (con_datos - sin_datos) // 2
        respuesta = tiene_datos(medio)
        if respuesta is None:
            return {"resultado": "interrumpida", "fecha_mas_antigua": con_datos.isoformat()}
        if respuesta:
            con_datos = medio
        else:
            sin_datos = medio
    return {
        "resultado": "aproximada",
        "fecha_mas_antigua": con_datos.isoformat(),
        "nota": "Asume datos continuos: un corte de la estación puede adelantar la fecha.",
    }


def ejecutar_prueba(
    cliente: ClienteSat2,
    hoy: date,
    dormir: Callable[[float], None] = time.sleep,
    reloj: Callable[[], float] = time.monotonic,
    pausa: float = PAUSA_SEGUNDOS,
) -> dict[str, Any]:
    equipo = cliente.recuperar_equipos()[0]
    sensor = elegir_sensor(equipo)
    referencia = hoy - timedelta(days=1)
    medidor = Medidor(cliente, dormir, reloj, pausa)
    informe: dict[str, Any] = {
        "ejecutada_el": hoy.isoformat(),
        "sensor": sensor["nombre"],
        "fecha_alta": equipo.get("fechaAlta"),
        "cantidad_de_sensores": len(equipo["sensores"]),
        "ventanas": [],
        "rango_seguro_dias": None,
        "antiguedad": None,
    }
    try:
        informe["ventanas"], informe["rango_seguro_dias"] = medir_rango(
            medidor, equipo["idEquipo"], sensor["idSensor"], referencia
        )
        informe["antiguedad"] = medir_antiguedad(
            medidor, equipo["idEquipo"], sensor["idSensor"], leer_fecha_alta(equipo), referencia
        )
    except LimiteDeConsultas as motivo:
        informe["detenida_por"] = str(motivo)
    informe["consultas_de_historicos"] = medidor.consultas
    return informe


def imprimir_resumen(informe: dict[str, Any], ruta: Path) -> None:
    print(f"Sensor: {informe['sensor']} | fecha de alta: {informe['fecha_alta']}")
    for fila in informe["ventanas"]:
        print(
            f"  {fila['dias']:>3} días: {fila['resultado']:<9} "
            f"{fila.get('registros', '-')}/{fila['registros_esperados']} registros "
            f"en {fila['segundos']} s"
        )
    print(f"Rango seguro: {informe['rango_seguro_dias']} días")
    print(f"Antigüedad: {informe['antiguedad']}")
    if informe.get("detenida_por"):
        print(f"Detenida por: {informe['detenida_por']}")
    print(f"Consultas de históricos: {informe['consultas_de_historicos']}")
    print(f"Informe: {ruta}")


def principal(
    argumentos: list[str] | None = None,
    ruta_env: Path = RUTA_ENV,
    ruta_informe: Path = RUTA_INFORME,
    dormir: Callable[[float], None] = time.sleep,
) -> int:
    opciones = argparse.ArgumentParser(description="Prueba de límites de SAT2")
    opciones.add_argument("--simulado", action="store_true", help="no accede a SAT2")
    args = opciones.parse_args(argumentos)
    hoy = datetime.now(ZONA_ARGENTINA).date()

    cliente: ClienteSat2
    if args.simulado:
        cliente = ClienteSat2Simulado()
    else:
        try:
            cliente = ClienteSat2Http(cargar_configuracion(ruta_env))
        except ConfiguracionIncompleta as error:
            print(error, file=sys.stderr)
            return 2
    try:
        informe = ejecutar_prueba(cliente, hoy, dormir=dormir)
    except ErrorSat2 as error:
        # El mensaje de ErrorSat2 nunca incluye cuerpos, tokens ni claves.
        print(f"No se pudo completar: {type(error).__name__}: {error}", file=sys.stderr)
        return 1
    finally:
        cerrar = getattr(cliente, "cerrar", None)
        if cerrar:
            cerrar()
    informe["modo"] = "simulado" if args.simulado else "real"
    ruta_informe.parent.mkdir(parents=True, exist_ok=True)
    ruta_informe.write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    imprimir_resumen(informe, ruta_informe)
    return 0


if __name__ == "__main__":
    sys.exit(principal())
