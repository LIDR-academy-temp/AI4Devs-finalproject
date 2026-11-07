"""La guía de las especificaciones se genera desde OpenSpec y nunca queda vieja (living-documentation)."""

from pathlib import Path

import pytest

from herramientas import documentar_especificaciones as documentar
from herramientas.documentar_especificaciones import (
    COMANDO,
    EspecificacionMalFormada,
    generar_guia,
    leer_capacidades,
)

SPEC_RIEGO = """# riego Specification

## Purpose
Decide cuándo regar.

## Requirements

### Requirement: Riego con lluvia

El sistema MUST NOT recomendar riego si llovió en las últimas 24 horas.

#### Scenario: Lluvia reciente

- **WHEN** llovió hace 3 horas
- **THEN** no recomienda regar

#### Scenario: Sin lluvia

- **WHEN** no llovió en 2 días
- **THEN** recomienda regar

### Requirement: Registro

El sistema SHALL guardar cada recomendación.

- Con la fecha.
- Con el motivo.

#### Scenario: Recomendación nueva

- **WHEN** se calcula una recomendación
- **THEN** queda guardada
"""

SPEC_ALERTAS = """# alertas Specification

## Purpose
Avisa de heladas.

## Requirements

### Requirement: Aviso de helada

El sistema SHALL avisar si la temperatura baja de 0 °C.

#### Scenario: Helada

- **WHEN** la temperatura es -1 °C
- **THEN** avisa
"""


def escribir(ruta: Path, texto: str) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding="utf-8")


@pytest.fixture
def raiz(tmp_path: Path) -> Path:
    escribir(tmp_path / "openspec/specs/riego/spec.md", SPEC_RIEGO)
    escribir(tmp_path / "openspec/specs/alertas/spec.md", SPEC_ALERTAS)
    for cambio in ("2026-10-01-riego-inicial", "2026-10-20-riego-registro"):
        escribir(tmp_path / f"openspec/changes/archive/{cambio}/specs/riego/spec.md", "delta")
    # Un cambio activo no cuenta: todavía no modificó la especificación principal.
    escribir(tmp_path / "openspec/changes/riego-pendiente/specs/riego/spec.md", "delta")
    return tmp_path


def test_lee_las_capacidades_en_orden_alfabetico(raiz):
    capacidades = leer_capacidades(raiz)

    assert [c.nombre for c in capacidades] == ["alertas", "riego"]


def test_lee_proposito_requisitos_y_escenarios(raiz):
    riego = leer_capacidades(raiz)[1]

    assert riego.proposito == "Decide cuándo regar."
    assert [r.nombre for r in riego.requisitos] == ["Riego con lluvia", "Registro"]
    assert riego.requisitos[0].texto == (
        "El sistema MUST NOT recomendar riego si llovió en las últimas 24 horas."
    )
    assert riego.requisitos[1].texto == (
        "El sistema SHALL guardar cada recomendación.\n\n- Con la fecha.\n- Con el motivo."
    )
    assert riego.requisitos[0].escenarios == ["Lluvia reciente", "Sin lluvia"]
    assert riego.requisitos[1].escenarios == ["Recomendación nueva"]


def test_el_ultimo_cambio_es_el_archivado_mas_reciente(raiz):
    alertas, riego = leer_capacidades(raiz)

    assert riego.ultimo_cambio is not None
    assert riego.ultimo_cambio.nombre == "riego-registro"
    assert riego.ultimo_cambio.fecha == "2026-10-20"
    assert riego.ultimo_cambio.carpeta == "2026-10-20-riego-registro"
    assert alertas.ultimo_cambio is None


def test_la_guia_tiene_el_indice_con_totales(raiz):
    guia = generar_guia(raiz)

    assert "2 capacidades, 3 requisitos y 4 escenarios" in guia
    assert "| [alertas](#alertas) | Avisa de heladas. | 1 | 1 | Sin cambios archivados |" in guia
    assert (
        "| [riego](#riego) | Decide cuándo regar. | 2 | 3 | "
        "[riego-registro](../../openspec/changes/archive/2026-10-20-riego-registro/proposal.md), "
        "2026-10-20 |"
    ) in guia
    assert guia.index("[alertas](#alertas)") < guia.index("[riego](#riego)")


def test_la_guia_tiene_una_seccion_por_capacidad(raiz):
    guia = generar_guia(raiz)
    seccion = guia[guia.index("## riego") :]

    assert "Especificación: [openspec/specs/riego/spec.md](../../openspec/specs/riego/spec.md)" in (
        seccion
    )
    assert "### Riego con lluvia" in seccion
    assert "- Lluvia reciente\n- Sin lluvia" in seccion
    assert "### Registro" in seccion
    assert "- Con la fecha.\n- Con el motivo." in seccion


def test_la_guia_empieza_con_el_aviso_de_archivo_generado(raiz):
    primeras = "\n".join(generar_guia(raiz).splitlines()[:6])

    assert "se genera" in primeras
    assert "no se edita a mano" in primeras
    assert COMANDO in primeras


def test_dos_generaciones_seguidas_son_identicas(raiz):
    assert generar_guia(raiz) == generar_guia(raiz)


def test_la_guia_no_incluye_la_fecha_de_generacion(raiz):
    from datetime import date

    assert date.today().isoformat() not in generar_guia(raiz)


def test_cambiar_un_requisito_cambia_solo_su_texto(raiz):
    antes = generar_guia(raiz).splitlines()
    ruta = raiz / "openspec/specs/riego/spec.md"
    ruta.write_text(
        SPEC_RIEGO.replace("cada recomendación.", "cada recomendación calculada."),
        encoding="utf-8",
    )
    despues = generar_guia(raiz).splitlines()

    distintas = [(a, d) for a, d in zip(antes, despues, strict=True) if a != d]
    assert distintas == [
        (
            "El sistema SHALL guardar cada recomendación.",
            "El sistema SHALL guardar cada recomendación calculada.",
        )
    ]


def test_una_capacidad_nueva_aparece_con_su_cambio(raiz):
    escribir(raiz / "openspec/specs/granizo/spec.md", SPEC_ALERTAS.replace("alertas", "granizo"))
    escribir(raiz / "openspec/changes/archive/2026-11-01-granizo/specs/granizo/spec.md", "delta")

    granizo = next(c for c in leer_capacidades(raiz) if c.nombre == "granizo")
    guia = generar_guia(raiz)

    assert granizo.ultimo_cambio is not None
    assert granizo.ultimo_cambio.nombre == "granizo"
    assert "| [granizo](#granizo) |" in guia
    assert "3 capacidades" in guia


def test_una_especificacion_sin_proposito_se_rechaza(raiz):
    escribir(raiz / "openspec/specs/rota/spec.md", "# rota Specification\n\n## Requirements\n")

    with pytest.raises(EspecificacionMalFormada, match="rota"):
        leer_capacidades(raiz)


def test_un_requisito_sin_escenarios_se_rechaza(raiz):
    escribir(
        raiz / "openspec/specs/rota/spec.md",
        "# rota Specification\n\n## Purpose\nAlgo.\n\n## Requirements\n\n"
        "### Requirement: Suelto\n\nEl sistema SHALL algo.\n",
    )

    with pytest.raises(EspecificacionMalFormada, match="Suelto"):
        leer_capacidades(raiz)


def test_sin_opciones_escribe_la_guia(raiz):
    assert documentar.main([], raiz) == 0

    escrita = (raiz / "docs/especificaciones/README.md").read_text(encoding="utf-8")
    assert escrita == generar_guia(raiz)


def test_comprobar_no_escribe_y_falla_si_falta_la_guia(raiz, capsys):
    assert documentar.main(["--comprobar"], raiz) == 1

    assert not (raiz / "docs/especificaciones/README.md").exists()
    assert COMANDO in capsys.readouterr().err


def test_comprobar_falla_si_la_guia_esta_vieja(raiz, capsys):
    documentar.main([], raiz)
    ruta = raiz / "openspec/specs/alertas/spec.md"
    ruta.write_text(SPEC_ALERTAS.replace("0 °C", "2 °C"), encoding="utf-8")

    assert documentar.main(["--comprobar"], raiz) == 1
    assert COMANDO in capsys.readouterr().err


def test_comprobar_pasa_si_la_guia_esta_al_dia(raiz):
    documentar.main([], raiz)

    assert documentar.main(["--comprobar"], raiz) == 0


def test_la_guia_versionada_esta_al_dia():
    guardada = (documentar.RUTA_RAIZ / documentar.RUTA_GUIA).read_text(encoding="utf-8")
    assert guardada == generar_guia(documentar.RUTA_RAIZ), f"Ejecutar desde backend/: {COMANDO}"
