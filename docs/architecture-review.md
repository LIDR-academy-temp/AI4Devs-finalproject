# Revisión adversarial de la arquitectura (G2)

> Revisión de `docs/architecture.md` y `docs/adr/` contra `docs/prd.md` v0.3, hecha con IA en el rol de arquitecto revisor adversarial (2026-11-04) con la plantilla `docs/prompts/adversarial-architecture.md`. La columna "Resolución" registra las decisiones del usuario (2026-11-04: instancia de demostración, puntaje a pedido, riesgo de estimación aceptado y el resto aplicado tal como se propuso). Todos los hallazgos están resueltos; la compuerta G2 queda cerrada.

## Crítico

| Id | Hallazgo | Evidencia | Corrección propuesta | Resolución |
| --- | --- | --- | --- | --- |
| AC1 | **Las credenciales del evaluador exponen tus datos personales.** El curso exige credenciales de prueba en `readme.md`, pero el sistema es de un solo usuario: el evaluador entraría a tu currículum, tus ofertas y tus candidaturas reales, y podría gastar tu presupuesto de IA. | RNF-01 (usuario único), RNF-12 (credenciales en `readme.md`), RNF-05 (privacidad) | Desplegar una **instancia de demostración** separada: la misma imagen, otra base de datos con datos sintéticos (currículum y ofertas de ejemplo) y un tope de IA bajo. Tu instancia personal queda privada. Nuevo ADR y ticket de semilla de datos de demostración. | Aceptada: instancia de demostración separada (ADR-0007, T-34, RNF-12). |
| AC2 | **No hay control de gasto de IA por día, y una sincronización puede romper el presupuesto.** Con el tope de 50 ofertas, una sincronización que deja pasar la mayoría encola ~50 puntajes; con Opus 5.5 (~0.10 USD c/u) son ~5 USD. Dos sincronizaciones agotan los 10 USD del mes. El "límite diario configurable" aparece en la tabla de seguridad, pero no en ningún ticket ni en el modelo de datos, y solo `match_analyses` registra consumo. | `docs/architecture.md` §2.6; RNF-07; T-16; ADR-0003 | (1) Tabla `ai_usage` con modelo, tokens y costo estimado de **cada** llamada (extracción, puntaje, correos). (2) Tope diario y mensual de costo, con mensaje claro al alcanzarlo. (3) Puntaje automático solo para ofertas pegadas; las importadas se puntúan al abrirlas o a pedido. Nuevo ticket y actualización de RNF-07. | Aceptada: ofertas importadas se puntúan a pedido; `ai_usage` y topes de 1 USD/día y 10 USD/mes (ADR-0008, T-33, RF-23, RNF-07). |

## Alto

| Id | Hallazgo | Evidencia | Corrección propuesta | Resolución |
| --- | --- | --- | --- | --- |
| AA1 | **La deduplicación entre fuentes no es posible con el modelo actual.** Los índices únicos son por (`source`, `external_id`) y por `source_url`. La misma oferta llega por Greenhouse y por el agregador con otra fuente, otro identificador y a menudo otra URL; HU3 exige deduplicar contra todas las fuentes. | `docs/architecture.md` §3; regla de HU3 | Columna `dedupe_key` = hash normalizado de (empresa, título, ubicación principal) con índice único por usuario; la URL canónica se normaliza (sin parámetros de seguimiento). Se documenta en la arquitectura y en T-09/T-12/T-28. | Aceptada: `dedupe_key` y URL canónica (RF-05, ADR-0006, T-09, T-10, T-12). |
| AA2 | **Suposiciones técnicas sin spike explícito.** Tuyau con una SPA separada en AdonisJS v7 (ADR-0001) y la librería de cola compatible con v7 (ADR-0005) solo figuran como "por confirmar". El endpoint público de Ashby (T-25) no se verificó. Si alguna falla, el walking skeleton se alarga. | ADR-0001, ADR-0005, `docs/architecture.md` §6 | Convertirlos en criterios de aceptación explícitos de T-01 (Tuyau), T-04 (cola) y T-25 (Ashby), con plan B escrito: cliente `fetch` tipado a mano si Tuyau no encaja; tabla propia con `SKIP LOCKED` si pg-boss no encaja. | Aceptada: criterios de aceptación con plan B en T-01 y T-04; verificación en T-25 (ADR-0001 y ADR-0005, historial). |
| AA3 | **No hay diseño de observabilidad.** RNF-06 (p90 en logs), RNF-07 (costo real) y OBJ-1/OBJ-5 dependen de logs y datos que la arquitectura no define: no hay logs estructurados, ni registro de errores, ni consulta para las métricas. | `docs/architecture.md` (no existe sección); RNF-06, RNF-07, RNF-14 | Sección de observabilidad: logger estructurado de AdonisJS con duración por trabajo, `ai_usage` (AC2) y un endpoint o comando que calcule OBJ-1, OBJ-5 y el costo mensual. | Aceptada: sección 2.8 de la arquitectura, RNF-15 y T-35. |

## Medio

| Id | Hallazgo | Evidencia | Corrección propuesta | Resolución |
| --- | --- | --- | --- | --- |
| AM1 | **Sin respaldo de datos.** El historial de candidaturas solo vive en PostgreSQL de Railway; perderlo es perder la razón del producto. | `docs/architecture.md` §2.5 | Documentar los respaldos de Railway (o un `pg_dump` programado) y probar una restauración una vez. | Aceptada como should-have: RNF-16 y T-36. |
| AM2 | **ADR-0004 contradice al PRD sobre la caché de prompts.** El ADR la decide (punto 6), pero el PRD v0.2 la bajó a could-have. | ADR-0004 §Decisión 6; RNF-07 | Entrada en "Historial de cambios" de ADR-0004: la caché de prompts es could-have; la decisión de fondo no cambia. | Aceptada: historial de cambios de ADR-0004. |
| AM3 | **Nada hace cumplir la regla "cambio de prompt = evals antes de mergear".** Las evals se ejecutan a mano y no hay rastro en el repositorio. | `CLAUDE.md` (IA); RNF-08 | Guardar cada resultado de evals en `apps/api/evals/results/<prompt>-<versión>.json`; un chequeo de CI falla si un prompt cambia de versión sin su archivo de resultados. | Aceptada: resultados de evals versionados y chequeo de CI (T-17). |
| AM4 | **La estimación del walking skeleton es optimista** para alguien que no domina AdonisJS: monorepo, Tuyau, Dockerfile multi-etapa, servir la SPA, cola, CI y Railway en 6.25 h. | T-01 a T-05; holgura de 4.5 h | Aceptar el riesgo y usar la holgura, o pasar el CI de GitHub Actions a la Entrega 2 tardía. Revisar las horas reales al terminar T-05. | Riesgo aceptado por el usuario; se revisan las horas reales al terminar T-05. |
| AM5 | **Worker dentro del proceso en Railway.** Si el servicio se suspende por inactividad o se redepliega, los trabajos en curso se interrumpen. | ADR-0005 | Desactivar la suspensión por inactividad del servicio y confiar en los reintentos de la cola; documentarlo en ADR-0005 (historial de cambios). | Aceptada: servicio sin suspensión y reintentos de la cola (historial de ADR-0005, T-05). |

## Bajo

| Id | Hallazgo | Corrección propuesta | Resolución |
| --- | --- | --- | --- |
| AB1 | El costo de Railway (aplicación + PostgreSQL, y la instancia de demostración de AC1) no está en el presupuesto; RNF-07 solo cubre la API de Claude. | Agregar el costo de infraestructura estimado a RNF-07 o a la visión. | Aceptada: costo de infraestructura estimado en RNF-07 (supuesto por verificar). |
| AB2 | La decisión `apply` (E3) crea la candidatura (E4): acoplamiento entre épicas. | Documentar que E3 llama a un servicio de E4 (`createApplicationFromPosting`), sin escribir directo en sus tablas. | Aceptada: servicio `createApplicationFromPosting` (arquitectura §2.4.1, T-10). |

## Preguntas 5 y 6 de la plantilla

- **Épicas y módulos (pregunta 5):** cada épica tiene módulos (`docs/architecture.md` §2.4.1). No hay módulos huérfanos; las evals pertenecen a E3 y la cola a E5. Único punto: AB2.
- **ADR contra PRD (pregunta 6):** solo AM2. ADR-0002 está correctamente reemplazado por ADR-0006.
