"""De dónde toma el worker la configuración de SAT2 (D6 de weather-track-administracion-sat2).

Antes de cada tarea mira la configuración guardada por un administrador:

- Si no hay, usa las variables del entorno, como antes.
- Si hay, la descifra con la clave privada. Si cambió desde la última vez, crea un cliente nuevo,
  que abre una sesión nueva con SAT2.
- Si no puede descifrarla, no consulta SAT2 ni vuelve al entorno: usar credenciales viejas sin
  avisar sería peor.

Ningún mensaje incluye valores de la configuración.
"""

import logging
import threading
from collections.abc import Callable
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cifrado_sat2 import (
    ClaveAusente,
    ClaveInvalida,
    ConfiguracionIlegible,
    clave_privada_del_entorno,
    descifrar,
)
from app.datos.modelos import ConfiguracionSat2 as FilaConfiguracion
from app.datos.modelos import EjecucionIngesta, Estacion
from app.ingesta.cliente_sat2 import ClienteSat2, ClienteSat2Http
from app.ingesta.configuracion import (
    ConfiguracionIncompleta,
    ConfiguracionSat2,
    cargar_configuracion,
)

registro = logging.getLogger("weather_track.worker")

# Lo que guarda la fila cuando no hay configuración en la base: se usa el entorno.
DEL_ENTORNO = b""


class ConfiguracionSat2Ilegible(Exception):
    """Hay una configuración guardada, pero el worker no puede descifrarla."""


class ClienteSerializado:
    """Garantiza una sola consulta a SAT2 por vez entre el ciclo y la carga.

    El bloqueo se toma por consulta: el ciclo espera como máximo una consulta en curso y nunca a
    toda la carga. Los clientes que reemplazan a otro comparten su bloqueo, para que una carga en
    curso con el cliente anterior no consulte a la vez que el ciclo con el nuevo.
    """

    def __init__(self, cliente: ClienteSat2, bloqueo: threading.Lock | None = None) -> None:
        self._cliente = cliente
        self._bloqueo = bloqueo or threading.Lock()

    def recuperar_equipos(self) -> list[dict[str, Any]]:
        with self._bloqueo:
            return self._cliente.recuperar_equipos()

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        with self._bloqueo:
            return self._cliente.recuperar_instantaneos(id_equipo)

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        with self._bloqueo:
            return self._cliente.recuperar_historicos(id_equipo, id_sensor, desde, hasta)


class OrigenSat2:
    def __init__(
        self,
        fabrica: Callable[[], Session],
        ruta_env: Path,
        crear_http: Callable[[ConfiguracionSat2], ClienteSat2] = ClienteSat2Http,
    ) -> None:
        self._fabrica = fabrica
        self._ruta_env = ruta_env
        self._crear_http = crear_http
        self._bloqueo = threading.Lock()
        self._cliente: ClienteSerializado | None = None
        self._http: ClienteSat2 | None = None
        self._version: bytes | None = None

    def _configuracion(self, contenido: bytes) -> ConfiguracionSat2:
        if contenido == DEL_ENTORNO:
            return cargar_configuracion(self._ruta_env)
        try:
            datos = descifrar(contenido, clave_privada_del_entorno())
        except ClaveAusente:
            raise ConfiguracionSat2Ilegible(
                "Hay una configuración de SAT2 guardada, pero falta SAT2_CLAVE_PRIVADA."
            ) from None
        except (ClaveInvalida, ConfiguracionIlegible):
            raise ConfiguracionSat2Ilegible(
                "La configuración de SAT2 guardada no se puede descifrar con SAT2_CLAVE_PRIVADA."
            ) from None
        return ConfiguracionSat2(
            url_base=datos["url_base"].rstrip("/"), usuario=datos["usuario"], clave=datos["clave"]
        )

    def _descartar(self) -> None:
        # No se cierra el cliente anterior: una carga inicial en otro hilo puede estar usándolo.
        # Termina esa carga y se libera solo.
        self._cliente = self._http = self._version = None

    def cliente(self) -> ClienteSat2:
        """El cliente para la configuración vigente. Lanza un error sin valores si no hay una."""
        with self._fabrica() as sesion:
            contenido = sesion.scalar(select(FilaConfiguracion.contenido_cifrado))
        # El contenido cifrado cambia en cada guardado, aunque los valores sean los mismos.
        version = DEL_ENTORNO if contenido is None else bytes(contenido)
        if self._cliente is not None and version == self._version:
            return self._cliente
        try:
            configuracion = self._configuracion(version)
        except (ConfiguracionIncompleta, ConfiguracionSat2Ilegible):
            self._descartar()
            raise
        self._descartar()
        self._http = self._crear_http(configuracion)
        self._cliente = ClienteSerializado(self._http, self._bloqueo)
        self._version = version
        if version != DEL_ENTORNO:
            registro.info("Se usa la configuración de SAT2 cargada por un administrador")
        return self._cliente


class OrigenFijo:
    """El modo simulado: siempre el mismo cliente, sin configuración que leer."""

    def __init__(self, cliente: ClienteSat2) -> None:
        self._cliente = cliente

    def cliente(self) -> ClienteSat2:
        return self._cliente


def _ahora() -> datetime:
    return datetime.now(UTC)


def tarea_con_origen(
    tarea: Callable[..., None],
    fabrica: Callable[[], Session],
    origen: OrigenSat2 | OrigenFijo,
    *argumentos: Any,
    registrar_ciclo: bool = False,
    reloj: Callable[[], datetime] = _ahora,
) -> None:
    """Corre la tarea con el cliente vigente. Sin configuración legible, no consulta SAT2.

    En el ciclo, además, deja la ejecución de cada estación activa en error, para que la pantalla de
    administración muestre que las credenciales no se pueden usar.
    """
    try:
        cliente = origen.cliente()
    except (ConfiguracionIncompleta, ConfiguracionSat2Ilegible) as error:
        registro.error("Sin configuración de SAT2 utilizable: %s", error)
        if registrar_ciclo:
            ahora = reloj()
            with fabrica() as sesion:
                for estacion_id in list(sesion.scalars(select(Estacion.id).where(Estacion.activa))):
                    sesion.add(
                        EjecucionIngesta(
                            estacion_id=estacion_id,
                            tipo="CICLO",
                            iniciada_en=ahora,
                            finalizada_en=ahora,
                            resultado="ERROR",
                            detalle=str(error),
                        )
                    )
                sesion.commit()
        return
    tarea(fabrica, cliente, *argumentos)
