# ADR-0004: Integración de IA: Markdown canónico, respuestas estructuradas, prompts versionados y evals

- **Estado:** aceptada
- **Fecha:** 2026-11-04

## Contexto

El puntaje debe ser explicable, medible y barato. Claude API ofrece respuestas estructuradas (`output_config.format` / `messages.parse()`) y lectura nativa de PDF, pero un PDF cuesta más tokens que su texto, y las descripciones de las ofertas llegan en HTML. La función de citas de la API es incompatible con las respuestas estructuradas.

## Decisión

1. **Markdown como representación canónica.**
   - Currículum: el usuario puede subir Markdown directamente (costo cero de conversión). Si sube un PDF (should-have, RF-11), una sola llamada a Claude lo convierte a Markdown y extrae el perfil estructurado. Las llamadas siguientes usan el Markdown y el perfil, nunca el PDF.
   - Ofertas: el HTML de las plataformas se convierte a Markdown localmente, sin IA.
2. **Respuestas estructuradas** con esquemas versionados en `apps/api/app/ai/schemas/`. La salida se valida; si falla, un reintento y luego error claro (RNF-09).
3. **Evidencia como campos del esquema:** fragmentos citados de la oferta y del currículum dentro de la respuesta estructurada, no con la función de citas de la API.
4. **Prompts versionados** en `apps/api/app/ai/prompts/`, con un identificador de versión guardado en cada análisis.
5. **Seguridad del prompt:** el texto externo (ofertas, correos, currículum) va delimitado como dato; el prompt de sistema indica que no contiene instrucciones.
6. **Caché:** el prefijo estable (prompt de sistema y perfil) se marca para la caché de prompts de Claude cuando supera el tamaño mínimo; además, `input_hash` evita repetir análisis (RF-26).
7. **Evals:** golden set de al menos 10 ofertas evaluadas a mano en `apps/api/evals/`, con un script que mide el acuerdo con el puntaje (OBJ-2).

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Enviar el PDF en cada llamada | Más tokens por llamada sin beneficio después de la primera extracción. |
| Librería local de PDF a texto | Pierde estructura (columnas, tablas) y agrega una dependencia; la conversión con IA es única por versión del currículum. |
| Citas nativas de la API | Incompatibles con las respuestas estructuradas. |

## Consecuencias

- Positivas: menor costo por llamada; el usuario puede revisar y corregir el Markdown; resultados medibles y reproducibles.
- Negativas: la conversión de PDF a Markdown puede perder detalles; se mitiga con la revisión del usuario (RF-13).

## Historial de cambios

- 2026-11-04: aclaración de alcance. La carga del currículum en PDF pasó a should-have (RF-11) tras la revisión adversarial del PRD; en el MVP la entrada es Markdown. La decisión no cambia.
- 2026-11-04: la caché de prompts de Claude (punto 6) es could-have según el PRD v0.2 (RNF-07); la caché por `input_hash` sigue siendo obligatoria (hallazgo AM2 de `docs/architecture-review.md`). La decisión no cambia.
