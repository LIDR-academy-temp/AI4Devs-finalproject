"""Conversión de los formatos de SAT2 y clasificación de la calidad del dato."""

from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from zoneinfo import ZoneInfo

from app.dominio.catalogo import unidad_admitida
from app.dominio.motor_tis import CALIDAD_FALTANTE, CALIDAD_OK, CALIDAD_SOSPECHOSO

ZONA_ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")
VALOR_CENTINELA = Decimal("-999.9")
DIFERENCIA_MAXIMA_HUMEDAD = Decimal("25")

_FORMATOS_DE_FECHA = (
    "%Y-%m-%d %H:%M",
    "%d/%m/%Y %H:%M:%S",
    "%Y-%m-%d%I:%M%p",
)

# D4 del diseño: lo que queda fuera es físicamente imposible.
RANGOS_FISICOS = {
    "TEMPERATURA": (Decimal("-50"), Decimal("60")),
    "HUMEDAD_RELATIVA": (Decimal("0"), Decimal("100")),
    "VIENTO_VELOCIDAD": (Decimal("0"), Decimal("250")),
    "RADIACION": (Decimal("0"), Decimal("1500")),
}


def parsear_numero(valor: Any) -> Decimal | None:
    """Acepta números y texto con coma decimal. Devuelve None si no es un número válido."""
    if valor is None or isinstance(valor, bool):
        return None
    texto = str(valor).strip()
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        numero = Decimal(texto)
    except InvalidOperation:
        return None
    return numero if numero.is_finite() else None


def parsear_fecha(texto: Any) -> datetime | None:
    """Interpreta una fecha sin zona como hora de Argentina y la devuelve en UTC."""
    if not isinstance(texto, str):
        return None
    for formato in _FORMATOS_DE_FECHA:
        try:
            local = datetime.strptime(texto.strip(), formato)
        except ValueError:
            continue
        return local.replace(tzinfo=ZONA_ARGENTINA).astimezone(UTC)
    return None


def clasificar_lectura(
    magnitud: str, valor_crudo: Any, unidad: str | None = None
) -> tuple[Decimal | None, str]:
    """Devuelve el valor normalizado y su calidad, antes de las reglas entre sensores.

    Un valor en una unidad que el índice no admite queda faltante: usarlo daría un
    cálculo equivocado sin que nadie lo note.
    """
    if unidad is not None and not unidad_admitida(magnitud, unidad):
        return None, CALIDAD_FALTANTE
    valor = parsear_numero(valor_crudo)
    if valor is None or valor == VALOR_CENTINELA:
        return None, CALIDAD_FALTANTE
    rango = RANGOS_FISICOS.get(magnitud)
    if rango and not rango[0] <= valor <= rango[1]:
        return None, CALIDAD_FALTANTE
    return valor, CALIDAD_OK


def humedad_incoherente(hr2m: Decimal | None, hr10m: Decimal | None) -> bool:
    if hr2m is None or hr10m is None:
        return False
    return abs(hr2m - hr10m) > DIFERENCIA_MAXIMA_HUMEDAD


__all__ = [
    "CALIDAD_SOSPECHOSO",
    "VALOR_CENTINELA",
    "ZONA_ARGENTINA",
    "clasificar_lectura",
    "humedad_incoherente",
    "parsear_fecha",
    "parsear_numero",
]
