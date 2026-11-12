"""Semáforo de salud de una estación, calculado al leer (D7 de weather-track-monitoreo).

Usa los umbrales que ya existen: 20 minutos sin ciclos para dar el proceso por caído
(`umbrales.py`) y los 30 minutos de la regla R2 para el dato (`vigencia.py`).
"""

from datetime import datetime

from app.dominio.vigencia import esta_vigente
from app.monitoreo import umbrales

EN_VIVO = "EN_VIVO"
CON_DEMORAS = "CON_DEMORAS"
CAIDO = "CAIDO"
MODO_PRUEBA = "MODO_PRUEBA"


def salud_de_la_estacion(
    ultimo_ciclo_en: datetime | None,
    ultimo_ciclo_resultado: str | None,
    ultimo_dato_en: datetime | None,
    ahora: datetime,
    modo: str,
) -> str:
    if modo == "prueba":
        return MODO_PRUEBA
    if ultimo_ciclo_en is None or ahora - ultimo_ciclo_en > umbrales.WORKER_SIN_ACTIVIDAD_DESPUES_DE:
        return CAIDO
    if ultimo_ciclo_resultado == "ERROR" or ultimo_dato_en is None or not esta_vigente(ultimo_dato_en, ahora):
        return CON_DEMORAS
    return EN_VIVO
