# ADR-0006: Fuentes automáticas de ofertas: dos modos de adaptador y agregador por búsqueda

- **Estado:** aceptada
- **Fecha:** 2026-11-04
- **Reemplaza parcialmente a:** [ADR-0002](./0002-importacion-por-adaptadores.md) (adaptadores del MVP y alcance de la importación)

## Contexto

ADR-0002 dejó en el MVP un solo adaptador (Greenhouse), que de la lista de empresas objetivo solo cubre a Anthropic. La revisión adversarial del PRD (`docs/prd-review.md`, hallazgo C3) señaló que el dolor "encontrar ofertas" quedaba casi sin resolver, y el usuario confirmó que la recolección automática es tan importante como pegar ofertas a mano. El presupuesto se amplió a un tope de 36 horas.

Datos relevantes:

- OpenAI publica en Ashby y Anthropic en Greenhouse, ambas con API pública de job board.
- Ninguna empresa objetivo conocida usa Lever; sirve solo para empresas medianas aún no definidas.
- Las empresas grandes de la lista (Meta, Apple, Amazon, Netflix, Google, Microsoft, Nvidia, Walmart, ServiceNow, PayPal/Venmo, eBay) no tienen API pública. Los agregadores basados en Google for Jobs indexan sus portales.
- SerpApi (Google Jobs) ofrece unas 250 búsquedas gratuitas al mes, pero Google lo demandó en diciembre de 2025. JSearch tiene plan gratuito, sin cuota confirmada en una fuente oficial.

## Decisión

- La interfaz `JobSourceAdapter` tiene dos modos:
  - **Por job board** de una empresa objetivo (`TargetCompany` + `board_token`): `GreenhouseAdapter` y `AshbyAdapter` en el MVP; `LeverAdapter` como should-have.
  - **Por búsqueda** guardada (`JobSearch`: palabras clave y ubicación): `AggregatorAdapter`, para llegar a las empresas grandes sin API propia.
- El proveedor del agregador se elige con un spike (ticket T-27) que revisa la cobertura de las empresas objetivo, la cuota gratuita y los términos de uso. JSearch es el primer candidato; SerpApi se descarta por el litigio. Si ningún proveedor es viable, se implementa `SmartRecruitersAdapter` en su lugar.
- Cada sincronización agrega como máximo 50 ofertas nuevas (configurable) y aplica los filtros duros, incluido el de roles, antes de cualquier llamada a la IA.
- Si falta tiempo, se recorta primero Lever y después la pantalla de búsquedas guardadas (queda una búsqueda fija por variable de entorno). El agregador no se elimina, porque es la única vía automática hacia las empresas grandes.

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Mantener solo Greenhouse (ADR-0002) | No resuelve la recolección automática para la lista de empresas del usuario. |
| Alertas de empleo de los portales leídas desde Gmail | Cubre las 13 empresas grandes y es limpia en lo legal, pero cuesta 5-6 h (OAuth y formatos distintos) y consume todo el margen; queda en v1.1. |
| Solo adaptadores de job boards (Ashby, Lever, SmartRecruiters) | Bajo riesgo, pero no cubre a las empresas grandes. |
| Scraping de portales o endpoint no documentado de Workday | Va contra los términos de uso y se rompe con facilidad. |

## Consecuencias

- Positivas: recolección automática para empresas medianas (job boards) y para las grandes (agregador); OBJ-5 se vuelve alcanzable; agregar fuentes no toca el resto del sistema.
- Negativas: dependencia de un proveedor externo con cuota limitada; la cobertura real del agregador se conoce solo tras el spike; aumenta el alcance de E1 (≈ 9 h must-have).

## Historial de cambios

- 2026-11-04: deduplicación entre fuentes con `dedupe_key` (hash normalizado de empresa, título y ubicación principal) y URL canónica (hallazgo AA1 de `docs/architecture-review.md`). Las ofertas importadas se puntúan a pedido (ADR-0008). La decisión no cambia.
- 2026-11-05: registrada en el log de decisiones del PRD como D-07 (fuentes automáticas), D-09 (Lever should-have) y D-14 (deduplicación entre fuentes). La decisión no cambia.
