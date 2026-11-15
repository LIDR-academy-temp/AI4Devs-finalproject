"""Casos de la sección 2.6 del README y escenarios de `application-recommendation`."""

import itertools
import socket
from decimal import Decimal as D

import pytest

from app.dominio import motor_tis
from app.dominio.motor_tis import (
    APTO,
    CALIDAD_FALTANTE,
    CALIDAD_SOSPECHOSO,
    DATOS_INSUFICIENTES,
    NO_APLICAR,
    PRECAUCION,
    RIESGO_DERIVA,
    Lectura,
    LecturasTis,
    estado_base,
    evaluar,
    factor_humedad,
    factor_radiacion,
    factor_temperatura,
    factor_viento,
)

T2M = D("20")


def lecturas(
    delta_t="-0.1",
    viento="9",
    radiacion="1056",
    hr2m="55",
    hr10m="60",
    reemplazos=None,
) -> LecturasTis:
    """Arma las seis lecturas a partir de ΔT, como la tabla del README."""
    datos = {
        "t2m": Lectura("Temp 2 m", T2M),
        "t10m": Lectura("Temp 10 m", T2M + D(delta_t)),
        "hr2m": Lectura("Hum 2 m", D(hr2m)),
        "hr10m": Lectura("Hum 10 m", D(hr10m)),
        "viento": Lectura("Viento", D(viento)),
        "radiacion": Lectura("Radiación", D(radiacion)),
    }
    return LecturasTis(**{**datos, **(reemplazos or {})})


def codigos(resultado) -> list[str]:
    return [motivo.codigo for motivo in resultado.motivos]


@pytest.mark.parametrize(
    ("delta_t", "viento", "radiacion", "hr2m", "hr10m", "indice", "estado"),
    [
        ("-0.1", "9", "1056", "55", "60", "7", APTO),
        ("0.9", "13", "300", "50", "55", "20", PRECAUCION),
        ("1.5", "9", "0", "60", "60", "50", RIESGO_DERIVA),
        ("3.0", "1", "0", "95", "95", "100", NO_APLICAR),
        ("0.5", "2", "600", "50", "50", "32.83", NO_APLICAR),
    ],
)
def test_casos_de_referencia(delta_t, viento, radiacion, hr2m, hr10m, indice, estado):
    resultado = evaluar(lecturas(delta_t, viento, radiacion, hr2m, hr10m))
    assert resultado.indice == D(indice)
    assert resultado.estado == estado


def test_caso_de_referencia_lectura_sospechosa():
    resultado = evaluar(
        lecturas(
            reemplazos={
                "hr2m": Lectura("Hum 2 m", D("0"), CALIDAD_SOSPECHOSO),
                "hr10m": Lectura("Hum 10 m", D("61"), CALIDAD_SOSPECHOSO),
            },
        )
    )
    assert resultado.indice == D("7")
    assert resultado.estado == PRECAUCION
    assert codigos(resultado) == ["DATO_SOSPECHOSO"]
    assert "Hum 2 m, Hum 10 m" in resultado.motivos[0].detalle


def test_caso_de_referencia_falta_t10m():
    resultado = evaluar(
        lecturas(reemplazos={"t10m": Lectura("Temp 10 m", None, CALIDAD_FALTANTE)})
    )
    assert resultado.estado == DATOS_INSUFICIENTES
    assert resultado.indice is None
    assert resultado.delta_t_c is None
    assert resultado.inversion_detectada is None
    assert codigos(resultado) == ["DATO_FALTANTE"]
    assert "Temp 10 m" in resultado.motivos[0].detalle


@pytest.mark.parametrize("campo", ["t2m", "t10m", "hr2m", "hr10m", "viento", "radiacion"])
def test_cualquier_lectura_faltante_impide_el_indice(campo):
    resultado = evaluar(
        lecturas(reemplazos={campo: Lectura("Sensor", None, CALIDAD_FALTANTE)})
    )
    assert resultado.estado == DATOS_INSUFICIENTES
    assert resultado.indice is None


def test_valor_nulo_cuenta_como_faltante_aunque_diga_ok():
    resultado = evaluar(lecturas(reemplazos={"viento": Lectura("Viento", None)}))
    assert resultado.estado == DATOS_INSUFICIENTES


def test_varias_lecturas_faltantes_se_nombran():
    resultado = evaluar(
        lecturas(
            reemplazos={
                "viento": Lectura("Viento", None, CALIDAD_FALTANTE),
                "radiacion": Lectura("Radiación", None, CALIDAD_FALTANTE),
            }
        )
    )
    assert "Viento, Radiación" in resultado.motivos[0].detalle


def test_si_falta_humedad_igual_informa_la_inversion():
    resultado = evaluar(
        lecturas(delta_t="1", reemplazos={"hr2m": Lectura("Hum 2 m", None, CALIDAD_FALTANTE)})
    )
    assert resultado.estado == DATOS_INSUFICIENTES
    assert resultado.delta_t_c == D("1.00")
    assert resultado.inversion_detectada is True


@pytest.mark.parametrize(
    ("delta_t", "factor"),
    [("-1", "0"), ("0", "0"), ("1.5", "50"), ("3", "100"), ("4", "100")],
)
def test_factor_temperatura(delta_t, factor):
    assert factor_temperatura(D(delta_t)) == D(factor)


def test_factor_temperatura_proporcional():
    assert factor_temperatura(D("0.9")) == D("30")


@pytest.mark.parametrize(
    ("viento", "factor"),
    [
        ("0", "100"),
        ("1", "100"),
        ("1.1", "90"),
        ("3", "90"),
        ("5", "70"),
        ("8", "40"),
        ("12", "20"),
        ("12.1", "0"),
    ],
)
def test_factor_viento(viento, factor):
    assert factor_viento(D(viento)) == D(factor)


@pytest.mark.parametrize(
    ("radiacion", "factor"),
    [
        ("-1", "100"),
        ("0", "100"),
        ("50", "90"),
        ("100", "75"),
        ("250", "50"),
        ("500", "20"),
        ("500.1", "0"),
    ],
)
def test_factor_radiacion(radiacion, factor):
    assert factor_radiacion(D(radiacion)) == D(factor)


@pytest.mark.parametrize(
    ("hr2m", "hr10m", "factor"),
    [
        ("90", "90", "100"),
        ("89", "90", "80"),
        ("80", "80", "80"),
        ("79", "80", "50"),
        ("60", "60", "50"),
        ("59", "60", "20"),
        ("0", "61", "20"),
    ],
)
def test_factor_humedad_usa_el_promedio(hr2m, hr10m, factor):
    assert factor_humedad(D(hr2m), D(hr10m)) == D(factor)


@pytest.mark.parametrize(
    ("indice", "estado"),
    [
        ("0", APTO),
        ("20", APTO),
        ("20.01", PRECAUCION),
        ("40", PRECAUCION),
        ("40.01", RIESGO_DERIVA),
        ("60", RIESGO_DERIVA),
        ("60.01", NO_APLICAR),
        ("100", NO_APLICAR),
    ],
)
def test_estado_base_con_limites_exactos(indice, estado):
    assert estado_base(D(indice)) == estado


def test_indice_exactamente_veinte_sin_inversion_es_apto():
    # Radiación 0 (100 × 0,15 = 15) + humedad 60 % (50 × 0,10 = 5) + viento 13 km/h (0) = 20.
    resultado = evaluar(lecturas("0", "13", "0", "60", "60"))
    assert resultado.indice == D("20")
    assert resultado.estado == APTO


def test_indice_apenas_mayor_que_veinte_no_es_apto():
    # Viento 12 km/h suma 5: con radiación 50 (13,5) y humedad baja (2) da 20,5.
    resultado = evaluar(lecturas("0", "12", "50", "50", "50"))
    assert resultado.indice == D("20.50")
    assert resultado.estado == PRECAUCION
    assert codigos(resultado) == ["INDICE_ELEVADO"]


def test_el_estado_se_decide_antes_de_redondear():
    assert estado_base(D("20.004")) == PRECAUCION
    assert motor_tis._redondear(D("20.004")) == D("20.00")


def test_inversion_con_indice_bajo_nunca_es_apta():
    resultado = evaluar(lecturas("0.9", "13", "300", "50", "55"))
    assert resultado.estado == PRECAUCION
    assert resultado.inversion_detectada is True
    assert resultado.delta_t_c == D("0.90")
    assert codigos(resultado) == ["INVERSION_DETECTADA"]
    assert "0,9 °C" in resultado.motivos[0].detalle


def test_inversion_con_indice_alto_conserva_el_estado_y_suma_motivos():
    resultado = evaluar(lecturas("3", "1", "0", "95", "95"))
    assert resultado.estado == NO_APLICAR
    assert codigos(resultado) == ["INVERSION_DETECTADA", "INDICE_ELEVADO"]


@pytest.mark.parametrize(
    ("viento", "estado"),
    [("0", NO_APLICAR), ("6.4", NO_APLICAR), ("6.5", PRECAUCION), ("9", PRECAUCION)],
)
def test_inversion_con_poco_viento_no_se_aplica(viento, estado):
    resultado = evaluar(lecturas("0.5", viento, "600", "50", "50"))
    assert resultado.estado == estado


def test_inversion_con_poco_viento_explica_el_motivo():
    resultado = evaluar(lecturas("0.5", "2", "600", "50", "50"))
    assert codigos(resultado) == ["INVERSION_DETECTADA", "INDICE_ELEVADO"]
    assert "viento de 2 km/h" in resultado.motivos[0].detalle
    assert "6,4 km/h" in resultado.motivos[0].detalle


def test_poco_viento_sin_inversion_no_activa_la_regla():
    resultado = evaluar(lecturas("-0.5", "2", "600", "50", "50"))
    assert resultado.estado == PRECAUCION
    assert resultado.inversion_detectada is False


def test_con_datos_faltantes_prevalece_datos_insuficientes():
    resultado = evaluar(
        lecturas("0.5", "2", reemplazos={"hr2m": Lectura("Hum 2 m", None, CALIDAD_FALTANTE)})
    )
    assert resultado.estado == DATOS_INSUFICIENTES
    assert resultado.inversion_detectada is True


def test_delta_t_cero_no_es_inversion():
    resultado = evaluar(lecturas("0"))
    assert resultado.inversion_detectada is False
    assert resultado.estado == APTO


def test_lectura_sospechosa_no_baja_un_estado_mas_grave():
    resultado = evaluar(
        lecturas(
            "3",
            "1",
            "0",
            "95",
            "95",
            reemplazos={"viento": Lectura("Viento", D("1"), CALIDAD_SOSPECHOSO)},
        )
    )
    assert resultado.estado == NO_APLICAR
    assert "DATO_SOSPECHOSO" in codigos(resultado)


def test_estado_apto_explica_que_no_hay_inversion():
    resultado = evaluar(lecturas())
    assert codigos(resultado) == ["SIN_INVERSION"]


def test_indice_alto_sin_inversion_explica_el_motivo():
    resultado = evaluar(lecturas("-1", "1", "0", "95", "95"))
    assert resultado.estado == RIESGO_DERIVA
    assert resultado.inversion_detectada is False
    assert codigos(resultado) == ["INDICE_ELEVADO"]


def test_informa_la_version_del_metodo():
    assert evaluar(lecturas()).version_metodo == "TIS-1.1"


def test_sin_red(monkeypatch):
    def prohibido(*args, **kwargs):
        raise AssertionError("El motor no debe acceder a la red")

    monkeypatch.setattr(socket, "socket", prohibido)
    assert evaluar(lecturas()).estado == APTO


def test_invariantes_en_toda_la_grilla_de_valores():
    """Las reglas que también protege la base deben cumplirse en cualquier combinación."""
    grilla = itertools.product(
        ("-2", "-0.1", "0", "0.001", "0.9", "1.5", "3", "5"),
        ("0", "1", "3", "5", "8", "12", "13", "40"),
        ("0", "50", "100", "250", "500", "1056"),
        (("10", "20"), ("60", "60"), ("80", "85"), ("95", "95")),
        ("OK", CALIDAD_SOSPECHOSO),
    )
    combinaciones = 0
    for delta_t, viento, radiacion, (hr2m, hr10m), calidad in grilla:
        resultado = evaluar(
            lecturas(
                delta_t,
                viento,
                radiacion,
                hr2m,
                hr10m,
                reemplazos={"hr10m": Lectura("Hum 10 m", D(hr10m), calidad)},
            )
        )
        combinaciones += 1
        assert resultado.motivos, "toda recomendación explica su motivo"
        assert D("0") <= resultado.indice <= D("100")
        if resultado.inversion_detectada or calidad == CALIDAD_SOSPECHOSO:
            assert resultado.estado != APTO
        if resultado.inversion_detectada and D(viento) <= D("6.4"):
            assert resultado.estado == NO_APLICAR
        if resultado.estado == APTO:
            assert resultado.inversion_detectada is False
            assert "SIN_INVERSION" in codigos(resultado)
        if resultado.indice > D("20.01"):
            assert "INDICE_ELEVADO" in codigos(resultado)
    assert combinaciones == 8 * 8 * 6 * 4 * 2
