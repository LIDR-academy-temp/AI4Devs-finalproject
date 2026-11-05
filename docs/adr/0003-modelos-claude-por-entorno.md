# ADR-0003: Modelos de Claude por entorno y por tarea

- **Estado:** aceptada
- **Fecha:** 2026-11-04

## Contexto

La IA cumple tres tareas: extraer datos (ofertas y currículum), calcular el puntaje de encaje y clasificar correos (should-have). La meta de costo es menos de 10 USD al mes (RNF-07). Precios por millón de tokens (entrada / salida), según la documentación de Claude API al 2026-10-06: `claude-opus-5-5` 4 / 20 USD, `claude-sonnet-5-5` 2 / 10 USD, `claude-haiku-5-5` 0.10 / 0.50 USD.

## Decisión

El modelo de cada tarea se configura por variable de entorno:

| Variable | Desarrollo y pruebas | Producción |
| --- | --- | --- |
| `CLAUDE_MODEL_EXTRACTION` | `claude-haiku-5-5` | `claude-opus-5-5` (esfuerzo `low`) |
| `CLAUDE_MODEL_MATCH` | `claude-sonnet-5-5` | `claude-opus-5-5` (esfuerzo `medium`) |
| `CLAUDE_MODEL_EMAIL` | `claude-haiku-5-5` | `claude-opus-5-5` (esfuerzo `low`) |

- Cada análisis guarda el modelo usado y el consumo de tokens, para comparar costo y calidad.
- Las llamadas revisan `stop_reason` (incluido `refusal`) antes de leer la respuesta.

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Opus 5.5 en todos los entornos | Costo innecesario durante el desarrollo. |
| Modelo económico también en producción | Posible pérdida de calidad en el puntaje; se puede adoptar más adelante si el golden set lo respalda. |

## Consecuencias

- Positivas: desarrollo barato; producción con la mejor calidad; cambiar de modelo no requiere tocar código.
- Negativas: los resultados de desarrollo no anticipan exactamente los de producción. El golden set (RNF-08) se ejecuta también con los modelos de producción antes de cada entrega.
- Estimación inicial (por medir): unos 0.10 USD por oferta con Opus 5.5 en producción, cerca de 10 USD al mes para 100 ofertas.
