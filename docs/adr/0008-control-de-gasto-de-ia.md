# ADR-0008: Control de gasto de IA y puntaje a pedido para ofertas importadas

- **Estado:** aceptada
- **Fecha:** 2026-11-04

## Contexto

Una sincronización puede agregar hasta 50 ofertas (RF-04b). Si todas reciben puntaje automático con Opus 5.5 (~0.10 USD c/u, ADR-0003), una sola sincronización cuesta ~5 USD y dos agotan la meta mensual de 10 USD (RNF-07). La arquitectura mencionaba un límite diario sin diseño ni ticket, y solo `match_analyses` registraba consumo. Hallazgo AC2 de `docs/architecture-review.md`.

## Decisión

- **Puntaje a pedido para ofertas importadas.** Las ofertas pegadas que pasan los filtros (o dan `unknown`) se puntúan automáticamente. Las importadas (job boards y agregador) se puntúan solo a pedido del usuario, una o varias seleccionadas, mostrando antes el costo estimado.
- **Registro de cada llamada.** Tabla `ai_usage` con tarea, modelo, tokens de entrada y salida, costo estimado y fecha, para extracción, puntaje y correos.
- **Topes de gasto.** Antes de cada llamada se compara el gasto del día y del mes con `AI_DAILY_BUDGET_USD` (por defecto 1) y `AI_MONTHLY_BUDGET_USD` (por defecto 10). Si una llamada los superaría, el trabajo termina en `failed` con el código `AI_BUDGET_EXCEEDED` y un mensaje claro; no se llama a la IA.
- **Precios por configuración.** El costo se estima con una tabla de precios por modelo versionada en el repositorio.

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Puntaje automático de todo lo que pasa los filtros | Rompe el presupuesto con pocas sincronizaciones. |
| Puntaje al abrir la oferta | Cada apertura accidental cuesta dinero y agrega espera al abrir. |
| Message Batches API para importaciones | 50 % más barata, pero asíncrona de minutos a horas; queda como opción futura. |

## Consecuencias

- Positivas: costo acotado y visible; la instancia de demostración (ADR-0007) usa topes bajos sin cambiar código; RNF-07 se vuelve medible.
- Negativas: el usuario debe pedir el puntaje de las ofertas importadas; un paso más en el flujo de ofertas automáticas.
