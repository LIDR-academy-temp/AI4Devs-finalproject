"""Acceso a SAT2. La sesión se gestiona aquí y nunca sale de este módulo."""

import time
from collections.abc import Callable
from datetime import date
from typing import Any, Protocol

import httpx

from app.ingesta.configuracion import ConfiguracionSat2

# El token dura 300 s; se renueva antes para no vencer a mitad de una carga.
RENOVAR_TOKEN_A_LOS_SEGUNDOS = 270
ESTADOS_DE_AUTORIZACION = {401, 403}


class ErrorSat2(Exception):
    """Falla de la fuente. Sus mensajes no incluyen cuerpos, tokens ni claves."""


class ErrorCredenciales(ErrorSat2):
    """SAT2 rechazó el usuario o la clave."""


class ErrorAutorizacion(ErrorSat2):
    """SAT2 rechazó la consulta por autorización, incluso tras reautenticar."""


class ClienteSat2(Protocol):
    """Contrato común del cliente real y del simulado."""

    def recuperar_equipos(self) -> list[dict[str, Any]]: ...

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]: ...

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]: ...


class ClienteSat2Http:
    def __init__(
        self,
        configuracion: ConfiguracionSat2,
        transporte: httpx.BaseTransport | None = None,
        reloj: Callable[[], float] = time.monotonic,
        timeout_segundos: float = 120.0,
        observar: Callable[[str, Any], None] | None = None,
    ) -> None:
        self._configuracion = configuracion
        self._reloj = reloj
        self._http = httpx.Client(
            base_url=configuracion.url_base,
            transport=transporte,
            timeout=timeout_segundos,
        )
        self._token: str | None = None
        self._id_cliente: int | None = None
        self._token_obtenido_en = 0.0
        # Solo para capturar respuestas de referencia (herramientas/capturar_sat2.py).
        self._observar = observar

    def __repr__(self) -> str:
        return "ClienteSat2Http()"

    def cerrar(self) -> None:
        self._http.close()

    def recuperar_equipos(self) -> list[dict[str, Any]]:
        respuesta = self._consultar(
            "RecuperarEquipos", lambda: {"idCliente": self._id_cliente}
        )
        return self._exigir_lista(respuesta)

    def recuperar_instantaneos(self, id_equipo: int) -> dict[str, Any]:
        respuesta = self._consultar(
            "RecuperarInstantaneosDeEquipo", lambda: {"idEquipo": str(id_equipo)}
        )
        if not isinstance(respuesta, dict):
            raise ErrorSat2("Respuesta de instantáneos no interpretable")
        return respuesta

    def recuperar_historicos(
        self, id_equipo: int, id_sensor: int, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        respuesta = self._consultar(
            "RecuperarHistoricosDeEquipoPorSensor",
            lambda: {
                "idEquipo": str(id_equipo),
                "idSensor": str(id_sensor),
                "fechaDesde": desde.isoformat(),
                "fechaHasta": hasta.isoformat(),
            },
        )
        return self._exigir_lista(respuesta)

    def _autenticar(self) -> None:
        self._token = None
        respuesta = self._post(
            "AutenticarUsuario",
            {
                "nombreDeUsuario": self._configuracion.usuario,
                "clave": self._configuracion.clave,
            },
        )
        if respuesta.status_code != 200:
            raise ErrorSat2(f"Autenticación con estado {respuesta.status_code}")
        datos = self._decodificar(respuesta)
        self._registrar("AutenticarUsuario", datos)
        if not isinstance(datos, dict) or not datos.get("autenticado"):
            raise ErrorCredenciales("SAT2 rechazó las credenciales")
        self._token = datos.get("token")
        self._id_cliente = datos.get("idCliente")
        self._token_obtenido_en = self._reloj()

    def _asegurar_sesion(self) -> None:
        vencido = (
            self._reloj() - self._token_obtenido_en >= RENOVAR_TOKEN_A_LOS_SEGUNDOS
        )
        if self._token is None or vencido:
            self._autenticar()

    def _consultar(self, metodo: str, armar_cuerpo: Callable[[], dict[str, Any]]) -> Any:
        self._asegurar_sesion()
        respuesta = self._post(metodo, {**armar_cuerpo(), "token": self._token})
        if respuesta.status_code in ESTADOS_DE_AUTORIZACION:
            self._autenticar()
            respuesta = self._post(metodo, {**armar_cuerpo(), "token": self._token})
            if respuesta.status_code in ESTADOS_DE_AUTORIZACION:
                raise ErrorAutorizacion(f"{metodo}: autorización rechazada")
        if respuesta.status_code != 200:
            raise ErrorSat2(f"{metodo}: estado {respuesta.status_code}")
        datos = self._decodificar(respuesta)
        self._registrar(metodo, datos)
        return datos

    def _registrar(self, metodo: str, datos: Any) -> None:
        if self._observar is not None:
            self._observar(metodo, datos)

    def _post(self, metodo: str, cuerpo: dict[str, Any]) -> httpx.Response:
        try:
            return self._http.post(f"/{metodo}", json=cuerpo)
        except httpx.HTTPError as error:
            raise ErrorSat2(f"{metodo}: {type(error).__name__}") from None

    @staticmethod
    def _decodificar(respuesta: httpx.Response) -> Any:
        try:
            return respuesta.json()
        except ValueError:
            raise ErrorSat2("Respuesta no interpretable") from None

    @staticmethod
    def _exigir_lista(respuesta: Any) -> list[dict[str, Any]]:
        if not isinstance(respuesta, list):
            raise ErrorSat2("Se esperaba una lista en la respuesta")
        return respuesta
