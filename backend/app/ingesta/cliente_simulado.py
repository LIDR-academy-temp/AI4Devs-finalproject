"""Cliente de SAT2 con datos ficticios, para desarrollo y evaluación sin credenciales."""

import json
import math
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from app.ingesta.cliente_sat2 import ErrorSat2

CARPETA_DATOS = Path(__file__).parent / "datos_simulados"
ZONA_ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")
VALOR_CENTINELA = -999.9


def _ahora_argentina() -> datetime:
    return datetime.now(ZONA_ARGENTINA)


class ClienteSat2Simulado:
    """Reproduce las rarezas de la fuente: coma decimal, orden descendente y huecos.

    `max_dias_por_consulta` y `primera_fecha_con_datos` permiten simular sus límites.
    """

    def __init__(
        self,
        reloj: Callable[[], datetime] = _ahora_argentina,
        max_dias_por_consulta: int | None = None,
        primera_fecha_con_datos: date | None = None,
    ) -> None:
        self._reloj = reloj
        self._max_dias = max_dias_por_consulta
        self._primera_fecha = primera_fecha_con_datos

    def recuperar_equipos(self) -> list[dict[str, Any]]:
        return self._leer("catalogo.json")

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        self._exigir_equipo(id_equipo)
        return self._instantaneos_en(self._reloj())

    def _instantaneos_en(self, ahora: datetime) -> dict[str, Any]:
        instantaneos = self._leer("instantaneos.json")
        medicion = ahora.replace(
            minute=ahora.minute - ahora.minute % 10, second=0, microsecond=0
        )
        instantaneos["fechaUltimaActualizacionDatos"] = medicion.strftime(
            "%d/%m/%Y %H:%M:%S"
        )
        return instantaneos

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        self._exigir_equipo(id_equipo)
        if self._max_dias and (hasta - desde).days + 1 > self._max_dias:
            raise ErrorSat2("Rango rechazado por la fuente simulada")
        inicio = max(desde, self._primera_fecha) if self._primera_fecha else desde
        serie = []
        dia = hasta
        while dia >= inicio:
            serie.extend(self._serie_del_dia(id_sensor, dia))
            dia -= timedelta(days=1)
        return serie

    def _serie_del_dia(self, id_sensor: int, dia: date) -> list[dict[str, Any]]:
        registros = []
        ahora = self._reloj().replace(tzinfo=None)
        for minutos in range(23 * 60 + 50, -1, -10):
            momento = datetime(dia.year, dia.month, dia.day) + timedelta(minutes=minutos)
            if momento >= ahora:
                continue
            # Cada 7 días faltan dos horas de registros y hay un valor centinela.
            if dia.toordinal() % 7 == 0:
                if 180 <= minutos < 300:
                    continue
                if minutos == 600:
                    registros.append(self._registro(momento, VALOR_CENTINELA))
                    continue
            valor = 15 + id_sensor + 8 * math.sin(minutos / 1440 * 2 * math.pi)
            registros.append(self._registro(momento, round(valor, 2)))
        return registros

    @staticmethod
    def _registro(momento: datetime, valor: float) -> dict[str, Any]:
        return {"fecha": momento.strftime("%Y-%m-%d %H:%M"), "valor": valor}

    def _exigir_equipo(self, id_equipo: int) -> None:
        if id_equipo not in {e["idEquipo"] for e in self.recuperar_equipos()}:
            raise ErrorSat2("Equipo desconocido en la fuente simulada")

    @staticmethod
    def _leer(nombre: str) -> Any:
        return json.loads((CARPETA_DATOS / nombre).read_text(encoding="utf-8"))


class ClienteSat2Escenarios(ClienteSat2Simulado):
    """Una estación ficticia por cada caso de las historias de usuario, para las pruebas E2E.

    Solo cambia lo que entrega la fuente: el estado lo calculan el ciclo y el motor reales.
    """

    def __init__(self, reloj: Callable[[], datetime] = _ahora_argentina) -> None:
        super().__init__(reloj)
        self._escenarios = {e["idEquipo"]: e for e in self._leer("escenarios.json")}

    def recuperar_equipos(self) -> list[dict[str, Any]]:
        plantilla = self._leer("catalogo.json")[0]
        return [
            {**plantilla, "idEquipo": id_equipo, "descripcion": escenario["descripcion"]}
            for id_equipo, escenario in self._escenarios.items()
        ]

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        self._exigir_equipo(id_equipo)
        escenario = self._escenarios[id_equipo]
        if escenario.get("fuenteCaida"):
            raise ErrorSat2("Fuente simulada caída")
        atraso = timedelta(minutes=escenario.get("atrasoMinutos", 0))
        instantaneos = self._instantaneos_en(self._reloj() - atraso)
        for lectura in instantaneos["datosSensores"]:
            if lectura["nombreSensor"] in escenario["lecturas"]:
                lectura["valor"] = escenario["lecturas"][lectura["nombreSensor"]]
        return instantaneos

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        self._exigir_equipo(id_equipo)
        # Una sola estación con históricos: en las demás, una lectura histórica podría
        # ganarle a la del ciclo y cambiar el caso que se quiere probar.
        if not self._escenarios[id_equipo].get("conHistoricos"):
            return []
        return super().recuperar_historicos(id_equipo, id_sensor, desde, hasta)
