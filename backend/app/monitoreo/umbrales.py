"""Umbrales de los controles de salud, en un único lugar (D2 de weather-track-monitoreo)."""

from datetime import timedelta

from app.dominio.vigencia import ANTIGUEDAD_MAXIMA

# El mismo de la regla R2: más viejo que esto, la decisión ya queda en «datos insuficientes».
DATOS_VIEJOS_DESPUES_DE = ANTIGUEDAD_MAXIMA
CICLOS_FALLIDOS_SEGUIDOS = 3
DISCO_LIBRE_MINIMO = 0.10
INGRESOS_FALLIDOS_MAXIMOS = 20
VENTANA_INGRESOS = timedelta(minutes=15)
# Dos ciclos de 10 minutos sin actividad: el worker está detenido o trabado.
WORKER_SIN_ACTIVIDAD_DESPUES_DE = timedelta(minutes=20)
