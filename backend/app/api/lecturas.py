"""Endpoints de lectura de la sección 4 del README."""

import os
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status
from pydantic import AwareDatetime, BaseModel
from sqlalchemy import desc, lateral, select, true
from sqlalchemy.orm import Session

from app.api.dependencias import Ahora, EstacionAutorizada, IdEnRuta, SesionBd
from app.api.errores import ErrorApi
from app.datos.modelos import EjecucionIngesta, Estacion, Observacion, Sensor
from app.datos.modelos import Recomendacion as Fila
from app.dominio.motor_tis import (
    AVISO_ORIENTATIVO,
    CALIDAD_FALTANTE,
    DATOS_INSUFICIENTES,
    MOTIVO_DATOS_DESACTUALIZADOS,
    MOTIVO_SIN_MEDICIONES,
    VERSION_METODO,
)
from app.dominio.normalizacion import ZONA_ARGENTINA
from app.dominio.vigencia import (
    ANTIGUEDAD_MAXIMA,
    antiguedad_segundos,
    esta_vigente,
    estado_de_los_datos,
)
from app.monitoreo.salud import salud_de_la_estacion

# Un mes de calendario: desde las 00:00 de un día hasta las 23:59 del mismo día del mes siguiente
# (weather-track-historicos-sin-huecos, D5).
RANGO_MAXIMO = timedelta(days=32)
# Diferencia admitida entre el reloj del navegador, que arma los rangos, y el del servidor.
TOLERANCIA_FUTURO = timedelta(minutes=5)
# Fuera de estos años no hay datos, y convertir fechas extremas a otra zona desborda.
FECHA_MINIMA = datetime(2000, 1, 1, tzinfo=UTC)
FECHA_MAXIMA = datetime(2100, 1, 1, tzinfo=UTC)

Calidad = Literal["OK", "FALTANTE", "SOSPECHOSO"]
MENSAJE_RANGO = (
    "La fecha final debe ser posterior a la inicial, hasta el mismo día del mes siguiente, "
    "sin fechas futuras ni anteriores a un año."
)


def primer_instante_permitido(ahora: datetime) -> datetime:
    """Las 00:00 de Argentina del mismo día del año anterior, como el calendario de la pantalla."""
    hoy = ahora.astimezone(ZONA_ARGENTINA).date()
    try:
        dia = hoy.replace(year=hoy.year - 1)
    except ValueError:  # 29 de febrero
        dia = date(hoy.year - 1, 2, 28)
    return datetime.combine(dia, time(0), tzinfo=ZONA_ARGENTINA).astimezone(UTC)

router = APIRouter(
    prefix="/api/v1/estaciones",
    tags=["lecturas"],
    responses={
        401: {"description": "Sesión ausente o vencida"},
        403: {"description": "El usuario no tiene acceso a esta estación"},
        404: {"description": "La estación o el sensor no existen"},
    },
)


class Motivo(BaseModel):
    codigo: str
    detalle: str


class Recomendacion(BaseModel):
    estacion_id: int
    estado: str
    indice: float | None
    delta_t_c: float | None
    inversion_detectada: bool | None
    motivos: list[Motivo]
    medido_en: datetime | None
    antiguedad_segundos: int | None
    version_metodo: str
    aviso: str


class LecturaSensor(BaseModel):
    sensor_id: int
    nombre: str
    magnitud: str
    altura_m: float | None
    valor: float | None
    unidad: str
    calidad: Calidad
    alarma: bool | None


class IntentoDeIngesta(BaseModel):
    en: datetime
    resultado: Literal["EXITO", "PARCIAL", "ERROR"]


class CondicionesActuales(BaseModel):
    estacion_id: int
    estacion_nombre: str
    activa: bool
    inactiva_desde: datetime | None
    medido_en: datetime | None
    antiguedad_segundos: int | None
    estado_datos: Literal["VIGENTE", "DESACTUALIZADO", "SIN_DATOS"]
    ultima_ingesta_exitosa_en: datetime | None
    ultima_ingesta_con_error: bool
    # Salud de la estación (weather-track-monitoreo, D7): se calcula al leer, como la regla R2.
    ultimo_intento: IntentoDeIngesta | None
    salud: Literal["EN_VIVO", "CON_DEMORAS", "CAIDO", "MODO_PRUEBA"]
    sensores: list[LecturaSensor]


class Punto(BaseModel):
    medido_en: datetime
    valor: float | None
    calidad: Calidad


class Resumen(BaseModel):
    maximo: float | None
    minimo: float | None
    promedio: float | None
    cantidad: int


class Historico(BaseModel):
    sensor_id: int
    unidad: str
    desde: datetime
    hasta: datetime
    resumen: Resumen
    puntos: list[Punto]


def _en_argentina(momento: datetime | None) -> datetime | None:
    return None if momento is None else momento.astimezone(ZONA_ARGENTINA)


def _numero(valor: Decimal | None) -> float | None:
    return None if valor is None else float(valor)


@router.get("/{estacionId}/recomendacion", operation_id="obtenerRecomendacion")
def obtener_recomendacion(
    estacion: EstacionAutorizada, sesion: SesionBd, ahora: Ahora
) -> Recomendacion:
    fila = sesion.scalar(
        select(Fila)
        .where(Fila.estacion_id == estacion.id)
        # El id desempata si una misma medición se calculó con dos versiones del método.
        .order_by(desc(Fila.medido_en), desc(Fila.id))
        .limit(1)
    )
    if fila is None:
        return Recomendacion(
            estacion_id=estacion.id,
            estado=DATOS_INSUFICIENTES,
            indice=None,
            delta_t_c=None,
            inversion_detectada=None,
            motivos=[
                Motivo(
                    codigo=MOTIVO_SIN_MEDICIONES,
                    detalle="La estación todavía no tiene mediciones.",
                )
            ],
            medido_en=None,
            antiguedad_segundos=None,
            version_metodo=VERSION_METODO,
            aviso=AVISO_ORIENTATIVO,
        )

    antiguedad = antiguedad_segundos(fila.medido_en, ahora)
    # R2: tampoco se informa si había inversión, porque esa condición pudo cambiar.
    if not esta_vigente(fila.medido_en, ahora):
        minutos_limite = int(ANTIGUEDAD_MAXIMA.total_seconds() // 60)
        return Recomendacion(
            estacion_id=estacion.id,
            estado=DATOS_INSUFICIENTES,
            indice=None,
            delta_t_c=None,
            inversion_detectada=None,
            motivos=[
                Motivo(
                    codigo=MOTIVO_DATOS_DESACTUALIZADOS,
                    detalle=(
                        f"La última medición tiene {antiguedad // 60} minutos, "
                        f"más que el máximo de {minutos_limite}."
                    ),
                )
            ],
            medido_en=_en_argentina(fila.medido_en),
            antiguedad_segundos=antiguedad,
            version_metodo=fila.version_metodo,
            aviso=AVISO_ORIENTATIVO,
        )

    return Recomendacion(
        estacion_id=estacion.id,
        estado=fila.estado,
        indice=_numero(fila.indice),
        delta_t_c=_numero(fila.delta_t_c),
        inversion_detectada=fila.inversion_detectada,
        motivos=[Motivo(**motivo) for motivo in fila.motivos],
        medido_en=_en_argentina(fila.medido_en),
        antiguedad_segundos=antiguedad,
        version_metodo=fila.version_metodo,
        aviso=AVISO_ORIENTATIVO,
    )


def _ultimas_lecturas(
    sesion: Session, estacion: Estacion
) -> list[tuple[Sensor, Observacion | None]]:
    # LATERAL con LIMIT 1 usa la clave primaria: no recorre todo el historial del sensor.
    ultima = lateral(
        select(Observacion)
        .where(Observacion.sensor_id == Sensor.id)
        .order_by(desc(Observacion.medido_en))
        .limit(1)
    ).alias("ultima")
    filas = sesion.execute(
        select(Sensor, ultima.c.medido_en, ultima.c.valor, ultima.c.calidad, ultima.c.alarma)
        .outerjoin(ultima, true())
        .where(Sensor.estacion_id == estacion.id)
        .order_by(Sensor.id)
    ).all()
    return [
        (
            fila[0],
            None
            if fila[1] is None
            else Observacion(medido_en=fila[1], valor=fila[2], calidad=fila[3], alarma=fila[4]),
        )
        for fila in filas
    ]


def _estado_de_ingesta(
    sesion: Session, estacion: Estacion
) -> tuple[datetime | None, bool, EjecucionIngesta | None]:
    ciclos = select(EjecucionIngesta).where(
        EjecucionIngesta.estacion_id == estacion.id,
        EjecucionIngesta.tipo == "CICLO",
        EjecucionIngesta.finalizada_en.is_not(None),
    )
    ultimo = sesion.scalar(ciclos.order_by(desc(EjecucionIngesta.id)).limit(1))
    exitoso = sesion.scalar(
        ciclos.where(EjecucionIngesta.resultado.in_(("EXITO", "PARCIAL")))
        .order_by(desc(EjecucionIngesta.id))
        .limit(1)
    )
    return (
        exitoso.finalizada_en if exitoso else None,
        ultimo is not None and ultimo.resultado == "ERROR",
        ultimo,
    )


@router.get("/{estacionId}/condiciones-actuales", operation_id="obtenerCondicionesActuales")
def obtener_condiciones_actuales(
    estacion: EstacionAutorizada, sesion: SesionBd, ahora: Ahora
) -> CondicionesActuales:
    lecturas = _ultimas_lecturas(sesion, estacion)
    mediciones = [o.medido_en for _, o in lecturas if o is not None]
    medido_en = max(mediciones) if mediciones else None
    ingesta_exitosa, con_error, ultimo = _estado_de_ingesta(sesion, estacion)
    return CondicionesActuales(
        estacion_id=estacion.id,
        estacion_nombre=estacion.nombre,
        activa=estacion.activa,
        inactiva_desde=_en_argentina(estacion.inactiva_desde),
        medido_en=_en_argentina(medido_en),
        antiguedad_segundos=None if medido_en is None else antiguedad_segundos(medido_en, ahora),
        estado_datos=estado_de_los_datos(medido_en, ahora),
        ultima_ingesta_exitosa_en=_en_argentina(ingesta_exitosa),
        ultima_ingesta_con_error=con_error,
        ultimo_intento=(
            IntentoDeIngesta(en=_en_argentina(ultimo.finalizada_en), resultado=ultimo.resultado)
            if ultimo
            else None
        ),
        salud=salud_de_la_estacion(
            ultimo.finalizada_en if ultimo else None,
            ultimo.resultado if ultimo else None,
            medido_en,
            ahora,
            os.environ.get("SAT2_MODO", "simulado"),
        ),
        sensores=[
            LecturaSensor(
                sensor_id=sensor.id,
                nombre=sensor.nombre,
                magnitud=sensor.magnitud,
                altura_m=_numero(sensor.altura_m),
                valor=None if observacion is None else _numero(observacion.valor),
                unidad=sensor.unidad,
                calidad=CALIDAD_FALTANTE if observacion is None else observacion.calidad,
                alarma=None if observacion is None else observacion.alarma,
            )
            for sensor, observacion in lecturas
        ],
    )


@router.get(
    "/{estacionId}/sensores/{sensorId}/historico",
    operation_id="obtenerHistorico",
    responses={
        422: {"description": "Rango de fechas inválido, mayor a 31 días, futuro o anterior a un año"}
    },
)
def obtener_historico(
    estacion: EstacionAutorizada,
    sensorId: IdEnRuta,
    desde: Annotated[AwareDatetime, Query()],
    hasta: Annotated[AwareDatetime, Query()],
    sesion: SesionBd,
    ahora: Ahora,
) -> Historico:
    sensor = sesion.scalar(
        select(Sensor).where(Sensor.id == sensorId, Sensor.estacion_id == estacion.id)
    )
    if sensor is None:
        raise ErrorApi(status.HTTP_404_NOT_FOUND, "NO_ENCONTRADO", "El sensor no existe.")
    if (
        desde < FECHA_MINIMA
        or hasta > FECHA_MAXIMA
        or hasta <= desde
        or hasta - desde > RANGO_MAXIMO
        or desde < primer_instante_permitido(ahora)
        or hasta > ahora + TOLERANCIA_FUTURO
    ):
        raise ErrorApi(status.HTTP_422_UNPROCESSABLE_CONTENT, "RANGO_INVALIDO", MENSAJE_RANGO)

    filas = sesion.execute(
        select(Observacion.medido_en, Observacion.valor, Observacion.calidad)
        .where(
            Observacion.sensor_id == sensor.id,
            Observacion.medido_en >= desde,
            Observacion.medido_en <= hasta,
        )
        .order_by(Observacion.medido_en)
    ).all()

    valores = [fila.valor for fila in filas if fila.calidad != CALIDAD_FALTANTE]
    return Historico(
        sensor_id=sensor.id,
        unidad=sensor.unidad,
        desde=_en_argentina(desde),
        hasta=_en_argentina(hasta),
        resumen=Resumen(
            maximo=_numero(max(valores)) if valores else None,
            minimo=_numero(min(valores)) if valores else None,
            promedio=round(float(sum(valores) / len(valores)), 2) if valores else None,
            cantidad=len(valores),
        ),
        puntos=[
            Punto(
                medido_en=_en_argentina(fila.medido_en),
                valor=_numero(fila.valor),
                calidad=fila.calidad,
            )
            for fila in filas
        ],
    )
