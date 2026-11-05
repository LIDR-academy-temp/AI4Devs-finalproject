# ADR-0005: Cola de trabajos en PostgreSQL

- **Estado:** aceptada (librería por confirmar)
- **Fecha:** 2026-11-04

## Contexto

La extracción y el puntaje tardan hasta 20 segundos, y la importación de una empresa puede generar decenas de llamadas a la IA. No caben en una petición HTTP. La infraestructura debe ser mínima: un contenedor y PostgreSQL en Railway.

## Decisión

- Cola de trabajos persistida en PostgreSQL, sin Redis.
- Tipos de trabajo: `extract_resume`, `extract_job_posting`, `score_match`, `sync_target_company`, `sync_job_search` y `classify_email` (should-have).
- La API encola y responde `202` con un `jobId`; la SPA consulta `GET /api/v1/jobs/{id}` hasta que termina.
- En el MVP, el worker corre dentro del mismo proceso que la API; se puede mover a un proceso separado con la misma imagen.
- Reintentos con espera exponencial para errores transitorios (429, 5xx de Claude o de Greenhouse).
- La librería se elige en el walking skeleton entre una librería madura basada en PostgreSQL (por ejemplo, pg-boss) y una tabla propia con `SELECT … FOR UPDATE SKIP LOCKED`, verificando su compatibilidad con AdonisJS v7.

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Procesar en la petición HTTP | Tiempos de espera y mala experiencia; la importación no cabe. |
| Cola con Redis (BullMQ) | Un servicio más que pagar y operar. |
| Message Batches API de Claude | 50 % más barata, pero asíncrona de minutos a horas; queda como opción para importaciones grandes. |

## Consecuencias

- Positivas: sin infraestructura extra; trabajos persistentes que sobreviven a reinicios; estado visible para la UI.
- Negativas: el polling agrega peticiones; el worker en el mismo proceso compite por CPU con la API.
