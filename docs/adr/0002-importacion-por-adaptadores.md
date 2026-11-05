# ADR-0002: Importación de ofertas mediante adaptadores por plataforma de empleo

- **Estado:** aceptada (actualizada el 2026-11-04 tras la revisión adversarial)
- **Fecha:** 2026-11-04

## Contexto

Las empresas objetivo grandes (Meta, Apple, Amazon, Netflix, Google, Microsoft, Nvidia, Walmart, ServiceNow, PayPal/Venmo, eBay) usan portales propios o Workday, sin API pública oficial. OpenAI usa Ashby y Anthropic usa Greenhouse, ambas con API pública. Muchas empresas medianas usan Greenhouse, Lever, Ashby o SmartRecruiters. Se verificó que la Greenhouse Job Board API responde sin clave (`boards-api.greenhouse.io/v1/boards/{board_token}/jobs`). El scraping de portales está excluido en la visión.

## Decisión

- Interfaz común `JobSourceAdapter` que recibe una empresa objetivo y devuelve ofertas normalizadas (identificador externo, URL, título, ubicación, descripción en Markdown, fecha).
- El MVP implementa solo `GreenhouseAdapter`.
- La entidad `TargetCompany` guarda la plataforma (`ats_provider`) y el identificador del job board (`board_token`).
- Las ofertas de empresas sin API se agregan pegando el texto.
- El HTML de las descripciones se convierte a Markdown antes de guardarlo y de enviarlo a la IA (ver ADR-0004).

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Adzuna API | Sus términos prohíben contactar a las empresas que publican; no se confirmó buena cobertura de las empresas objetivo. |
| Scraping de portales o endpoint no documentado de Workday | Va contra los términos de uso o depende de interfaces no oficiales; se rompe con facilidad. |

## Consecuencias

- Positivas: agregar Ashby, Lever o SmartRecruiters (v1.1) es implementar un adaptador nuevo sin tocar el resto.
- Negativas: en el MVP, la importación solo cubre las empresas en Greenhouse; las grandes dependen del texto pegado y, en v1.1, de las alertas por correo.

## Actualización (2026-11-04)

La revisión adversarial del PRD (`docs/prd-review.md`, hallazgo C3) y el usuario confirmaron que la recolección automática es tan importante como pegar ofertas. Cambios:

- La interfaz `JobSourceAdapter` tiene dos modos:
  - **Por job board** de una empresa objetivo: `GreenhouseAdapter`, `AshbyAdapter` y `LeverAdapter` en el MVP.
  - **Por búsqueda** guardada (`JobSearch`: palabras clave y ubicación): `AggregatorAdapter`, para llegar a las empresas grandes sin API propia.
- El proveedor del agregador se elige con un spike (cobertura de las empresas objetivo, cuota gratuita y términos de uso). JSearch es el primer candidato; SerpApi se evita por el litigio con Google (diciembre de 2025). Si ningún proveedor es viable, se implementa `SmartRecruitersAdapter` en su lugar.
- Cada sincronización respeta un tope de ofertas nuevas (por defecto 50) y aplica los filtros duros, incluido el de roles, antes de cualquier llamada a la IA.
