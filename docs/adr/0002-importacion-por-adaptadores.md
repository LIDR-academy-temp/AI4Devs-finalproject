# ADR-0002: Importación de ofertas mediante adaptadores por plataforma de empleo

- **Estado:** aceptada
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
