"""Motor de recomendación de aplicación (sección 1.2 del README).

Son funciones puras: no conocen la hora, la red ni la base de datos. La regla R2,
que depende de la antigüedad de la medición, se aplica al leer, en la API.

Se calcula con Decimal porque los límites son exactos: con float, ΔT = 0,9 °C da un
índice apenas mayor que 20 y cambiaría el estado base.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from enum import IntEnum

VERSION_METODO = "TIS-1.1"

CALIDAD_OK = "OK"
CALIDAD_FALTANTE = "FALTANTE"
CALIDAD_SOSPECHOSO = "SOSPECHOSO"

APTO = "APTO"
PRECAUCION = "PRECAUCION"
RIESGO_DERIVA = "RIESGO_DERIVA"
NO_APLICAR = "NO_APLICAR"
DATOS_INSUFICIENTES = "DATOS_INSUFICIENTES"

MOTIVO_SIN_INVERSION = "SIN_INVERSION"
MOTIVO_INDICE_ELEVADO = "INDICE_ELEVADO"
MOTIVO_INVERSION_DETECTADA = "INVERSION_DETECTADA"
MOTIVO_DATO_FALTANTE = "DATO_FALTANTE"
MOTIVO_DATO_SOSPECHOSO = "DATO_SOSPECHOSO"

PESO_TEMPERATURA = Decimal("0.50")
PESO_VIENTO = Decimal("0.25")
PESO_RADIACION = Decimal("0.15")
PESO_HUMEDAD = Decimal("0.10")

DELTA_T_MAXIMO = Decimal("3")
LIMITE_APTO = Decimal("20")
LIMITE_PRECAUCION = Decimal("40")
LIMITE_RIESGO_DERIVA = Decimal("60")

# R3b, en km/h como todo el sistema. Huang et al. (2019, tabla 2) solo admiten aplicar
# con una inversión muy leve si el viento supera ese valor, que publican como 4 mph.
# Ver docs/tis/contraste-bibliografico.md.
VIENTO_MINIMO_CON_INVERSION_KMH = Decimal("6.4")

# (valor máximo inclusivo, factor); por encima del último límite el factor es 0.
_ESCALA_VIENTO = (
    (Decimal("1"), Decimal("100")),
    (Decimal("3"), Decimal("90")),
    (Decimal("5"), Decimal("70")),
    (Decimal("8"), Decimal("40")),
    (Decimal("12"), Decimal("20")),
)
_ESCALA_RADIACION = (
    (Decimal("0"), Decimal("100")),
    (Decimal("50"), Decimal("90")),
    (Decimal("100"), Decimal("75")),
    (Decimal("250"), Decimal("50")),
    (Decimal("500"), Decimal("20")),
)


class _Severidad(IntEnum):
    APTO = 0
    PRECAUCION = 1
    RIESGO_DERIVA = 2
    NO_APLICAR = 3


@dataclass(frozen=True)
class Lectura:
    nombre: str
    valor: Decimal | None
    calidad: str = CALIDAD_OK

    @property
    def es_valida(self) -> bool:
        return self.valor is not None and self.calidad != CALIDAD_FALTANTE

    @property
    def es_sospechosa(self) -> bool:
        return self.calidad == CALIDAD_SOSPECHOSO


@dataclass(frozen=True)
class LecturasTis:
    t2m: Lectura
    t10m: Lectura
    hr2m: Lectura
    hr10m: Lectura
    viento: Lectura
    radiacion: Lectura

    def todas(self) -> tuple[Lectura, ...]:
        return (self.t2m, self.t10m, self.hr2m, self.hr10m, self.viento, self.radiacion)


@dataclass(frozen=True)
class Motivo:
    codigo: str
    detalle: str


@dataclass(frozen=True)
class ResultadoTis:
    estado: str
    indice: Decimal | None
    delta_t_c: Decimal | None
    inversion_detectada: bool | None
    motivos: tuple[Motivo, ...]
    version_metodo: str = VERSION_METODO


def _segun_escala(valor: Decimal, escala: tuple[tuple[Decimal, Decimal], ...]) -> Decimal:
    for maximo, factor in escala:
        if valor <= maximo:
            return factor
    return Decimal("0")


def factor_temperatura(delta_t: Decimal) -> Decimal:
    if delta_t <= 0:
        return Decimal("0")
    if delta_t >= DELTA_T_MAXIMO:
        return Decimal("100")
    return delta_t / DELTA_T_MAXIMO * 100


def factor_viento(viento_kmh: Decimal) -> Decimal:
    return _segun_escala(viento_kmh, _ESCALA_VIENTO)


def factor_radiacion(radiacion_wm2: Decimal) -> Decimal:
    return _segun_escala(radiacion_wm2, _ESCALA_RADIACION)


def factor_humedad(hr2m: Decimal, hr10m: Decimal) -> Decimal:
    promedio = (hr2m + hr10m) / 2
    if promedio >= 90:
        return Decimal("100")
    if promedio >= 80:
        return Decimal("80")
    if promedio >= 60:
        return Decimal("50")
    return Decimal("20")


def calcular_indice(
    delta_t: Decimal, viento: Decimal, radiacion: Decimal, hr2m: Decimal, hr10m: Decimal
) -> Decimal:
    return (
        PESO_TEMPERATURA * factor_temperatura(delta_t)
        + PESO_VIENTO * factor_viento(viento)
        + PESO_RADIACION * factor_radiacion(radiacion)
        + PESO_HUMEDAD * factor_humedad(hr2m, hr10m)
    )


def estado_base(indice: Decimal) -> str:
    if indice <= LIMITE_APTO:
        return APTO
    if indice <= LIMITE_PRECAUCION:
        return PRECAUCION
    if indice <= LIMITE_RIESGO_DERIVA:
        return RIESGO_DERIVA
    return NO_APLICAR


def _como_minimo_precaucion(estado: str) -> str:
    severidad = max(_Severidad[estado], _Severidad.PRECAUCION)
    return severidad.name


def _redondear(valor: Decimal) -> Decimal:
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _texto_decimal(valor: Decimal) -> str:
    return f"{_redondear(valor).normalize():f}".replace(".", ",")


def _nombres(lecturas: list[Lectura]) -> str:
    return ", ".join(lectura.nombre for lectura in lecturas)


def evaluar(lecturas: LecturasTis) -> ResultadoTis:
    delta_t = None
    inversion = None
    if lecturas.t2m.es_valida and lecturas.t10m.es_valida:
        delta_t = lecturas.t10m.valor - lecturas.t2m.valor
        inversion = delta_t > 0
    delta_redondeado = None if delta_t is None else _redondear(delta_t)

    # R1: sin las seis lecturas no se calcula el índice.
    faltantes = [lectura for lectura in lecturas.todas() if not lectura.es_valida]
    if faltantes:
        return ResultadoTis(
            estado=DATOS_INSUFICIENTES,
            indice=None,
            delta_t_c=delta_redondeado,
            inversion_detectada=inversion,
            motivos=(
                Motivo(MOTIVO_DATO_FALTANTE, f"Sin dato válido de: {_nombres(faltantes)}."),
            ),
        )

    indice = calcular_indice(
        delta_t,
        lecturas.viento.valor,
        lecturas.radiacion.valor,
        lecturas.hr2m.valor,
        lecturas.hr10m.valor,
    )
    # El estado se decide con el índice exacto: redondear primero podría volver apto
    # un valor apenas superior al límite.
    estado = estado_base(indice)
    motivos = []

    # R3: una inversión nunca es apta.
    if inversion:
        estado = _como_minimo_precaucion(estado)
        detalle = f"La temperatura a 10 m supera a la de 2 m en {_texto_decimal(delta_t)} °C."
        # R3b: con inversión y poco viento no hay mezcla de aire suficiente.
        if lecturas.viento.valor <= VIENTO_MINIMO_CON_INVERSION_KMH:
            estado = NO_APLICAR
            detalle += (
                f" El viento de {_texto_decimal(lecturas.viento.valor)} km/h no supera "
                f"el mínimo de {_texto_decimal(VIENTO_MINIMO_CON_INVERSION_KMH)} km/h."
            )
        motivos.append(Motivo(MOTIVO_INVERSION_DETECTADA, detalle))

    # R4: una lectura sospechosa nunca es apta.
    sospechosas = [lectura for lectura in lecturas.todas() if lectura.es_sospechosa]
    if sospechosas:
        estado = _como_minimo_precaucion(estado)
        motivos.append(
            Motivo(MOTIVO_DATO_SOSPECHOSO, f"Lecturas sospechosas: {_nombres(sospechosas)}.")
        )

    if indice > LIMITE_APTO:
        motivos.append(
            Motivo(
                MOTIVO_INDICE_ELEVADO,
                f"El índice TIS es {_texto_decimal(indice)}, mayor que {LIMITE_APTO}.",
            )
        )
    if estado == APTO:
        motivos.append(
            Motivo(
                MOTIVO_SIN_INVERSION,
                "La temperatura a 10 m no supera a la de 2 m y el índice es bajo.",
            )
        )

    return ResultadoTis(
        estado=estado,
        indice=_redondear(indice),
        delta_t_c=delta_redondeado,
        inversion_detectada=inversion,
        motivos=tuple(motivos),
    )
