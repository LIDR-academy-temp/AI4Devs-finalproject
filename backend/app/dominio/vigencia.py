"""Regla R2: una medición vieja no se presenta como vigente.

Se aplica al leer porque una recomendación envejece sin que ocurra ningún evento: si el
worker se detiene, nadie podría marcarla como vencida (D2 del diseño).
"""

from datetime import datetime, timedelta

ANTIGUEDAD_MAXIMA = timedelta(minutes=30)

ESTADO_VIGENTE = "VIGENTE"
ESTADO_DESACTUALIZADO = "DESACTUALIZADO"
ESTADO_SIN_DATOS = "SIN_DATOS"


def antiguedad_segundos(medido_en: datetime, ahora: datetime) -> int:
    return max(0, int((ahora - medido_en).total_seconds()))


def esta_vigente(medido_en: datetime, ahora: datetime) -> bool:
    return ahora - medido_en <= ANTIGUEDAD_MAXIMA


def estado_de_los_datos(medido_en: datetime | None, ahora: datetime) -> str:
    if medido_en is None:
        return ESTADO_SIN_DATOS
    return ESTADO_VIGENTE if esta_vigente(medido_en, ahora) else ESTADO_DESACTUALIZADO
