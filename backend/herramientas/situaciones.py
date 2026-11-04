"""Carga una situación de la recomendación en "Caso de prueba - 1" (D8 de weather-track-estaciones).

Para las pruebas de extremo a extremo, las pruebas negativas y la demo, en modo prueba:

    docker compose exec api python -m herramientas.situaciones indice_elevado
    docker compose exec api python -m herramientas.situaciones --lista

Solo cambia lo que entrega la fuente simulada: el estado lo calculan el ciclo y el motor reales.
Se niega a escribir en una base que no sea ficticia, así nunca mezcla datos con los reales.
"""

import argparse
import json
import sys
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.datos.conexion import obtener_motor
from app.datos.modelos import EjecucionIngesta, Estacion, Observacion, Recomendacion, Sensor
from app.datos.naturaleza import FICTICIA, leer_naturaleza
from app.ingesta.ciclo import ejecutar_ciclo
from app.ingesta.cliente_sat2 import ErrorSat2
from app.ingesta.cliente_simulado import ZONA_ARGENTINA, ClienteSat2Simulado
from app.ingesta.modo_prueba import EQUIPO_CASO_1

SITUACIONES: dict[str, dict[str, Any]] = json.loads(
    (Path(__file__).parent / "situaciones.json").read_text(encoding="utf-8")
)


class SituacionImposible(Exception):
    """No se puede cargar la situación. El mensaje explica qué hacer."""


class ClienteDeSituacion(ClienteSat2Simulado):
    """La fuente simulada, con las lecturas, el atraso o la caída de una situación."""

    def __init__(self, clave: str, reloj: Callable[[], datetime]) -> None:
        super().__init__(reloj)
        self._situacion = SITUACIONES[clave]

    def instante(self) -> datetime:
        """Hora de medición que informará la fuente, en hora de Argentina."""
        momento = self._reloj() - timedelta(minutes=self._situacion.get("atrasoMinutos", 0))
        return momento.replace(minute=momento.minute - momento.minute % 10, second=0, microsecond=0)

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        self._exigir_equipo(id_equipo)
        if self._situacion.get("fuenteCaida"):
            raise ErrorSat2("Fuente simulada caída")
        atraso = timedelta(minutes=self._situacion.get("atrasoMinutos", 0))
        instantaneos = self._instantaneos_en(self._reloj() - atraso)
        for lectura in instantaneos["datosSensores"]:
            if lectura["nombreSensor"] in self._situacion["lecturas"]:
                lectura["valor"] = self._situacion["lecturas"][lectura["nombreSensor"]]
        return instantaneos

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        # Los históricos ya los sembró el modo prueba: la situación solo cambia el presente.
        return []


def cargar_situacion(sesion: Session, clave: str, ahora: datetime) -> EjecucionIngesta:
    """Reemplaza el estado actual del caso 1 por el de la situación. Hace commit."""
    if clave not in SITUACIONES:
        raise SituacionImposible(f"Situación desconocida: {clave}. Ver --lista.")
    if leer_naturaleza(sesion) != FICTICIA:
        raise SituacionImposible(
            "Las situaciones solo se cargan en una base con datos ficticios, arrancada en modo prueba."
        )
    estacion = sesion.scalar(select(Estacion).where(Estacion.id_equipo_sat2 == EQUIPO_CASO_1))
    if estacion is None:
        raise SituacionImposible("No existe el caso de prueba 1: arrancar el sistema en modo prueba.")

    cliente = ClienteDeSituacion(clave, reloj=lambda: ahora.astimezone(ZONA_ARGENTINA))
    sensores = select(Sensor.id).where(Sensor.estacion_id == estacion.id)
    # Lo posterior a la medición le ganaría a la situación en las condiciones actuales.
    sesion.execute(
        delete(Observacion).where(
            Observacion.sensor_id.in_(sensores), Observacion.medido_en >= cliente.instante()
        )
    )
    sesion.execute(delete(Recomendacion).where(Recomendacion.estacion_id == estacion.id))
    sesion.execute(
        delete(EjecucionIngesta).where(
            EjecucionIngesta.estacion_id == estacion.id, EjecucionIngesta.tipo == "CICLO"
        )
    )
    sesion.commit()
    return ejecutar_ciclo(sesion, cliente, estacion, ahora)


def principal(argumentos: list[str] | None = None) -> int:
    analizador = argparse.ArgumentParser(description="Carga una situación en el caso de prueba 1")
    analizador.add_argument("clave", nargs="?", choices=sorted(SITUACIONES))
    analizador.add_argument("--lista", action="store_true", help="Muestra las situaciones")
    args = analizador.parse_args(argumentos)
    if args.lista or args.clave is None:
        for clave, situacion in SITUACIONES.items():
            print(f"{clave}: {situacion['descripcion']}")
        return 0
    with Session(obtener_motor()) as sesion:
        try:
            ejecucion = cargar_situacion(sesion, args.clave, datetime.now(UTC))
        except SituacionImposible as error:
            print(error, file=sys.stderr)
            return 2
        print(f"Situación cargada: {SITUACIONES[args.clave]['descripcion']} ({ejecucion.resultado}).")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
