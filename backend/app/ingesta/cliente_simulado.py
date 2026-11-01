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
        instantaneos = self._leer("instantaneos.json")
        ahora = self._reloj()
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
