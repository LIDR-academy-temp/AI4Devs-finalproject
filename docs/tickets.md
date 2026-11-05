# Tickets de trabajo — AI Job Match

> Tickets derivados de [`docs/user-stories.md`](./user-stories.md). Una historia genera varios tickets. Cada ticket sigue la definition of done de `CLAUDE.md`. La implementación de cada historia se hace como un cambio de OpenSpec que agrupa sus tickets.

- **Estado:** borrador v0.4 (incorpora la revisión adversarial de la arquitectura y las revisiones de consistencia)
- **Fecha:** 2026-11-04
- **Tipos:** `infra`, `db`, `backend`, `ai`, `frontend`, `test`, `producto` (tareas que no son código)

---

## Resumen

| Id | Título | Tipo | Épica / historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| T-31 | Medir la línea base de OBJ-1 | producto | E3 / HU7 | M | 0.25 h | — |
| T-01 | Monorepo con API y SPA | infra | E5 / Skeleton | M | 1 h | — |
| T-02 | Base de datos local y usuario único | db | E5 / Skeleton | M | 1 h | T-01 |
| T-03 | Autenticación por sesión e i18n base | backend, frontend | E5 / Skeleton | M | 1.25 h | T-02 |
| T-04 | Cola de trabajos y cliente de IA | backend, ai | E5 / Skeleton | M | 1.5 h | T-02 |
| T-05 | Contenedor, CI y despliegue | infra, test | E5 / Skeleton | M | 1.5 h | T-03 |
| T-33 | Control de gasto de IA | backend, frontend, ai | E5 / Plataforma | M | 1.5 h | T-04 |
| T-06 | Tabla de currículums | db | E2 / HU4 | M | 0.5 h | T-02 |
| T-07 | API y extracción del currículum en Markdown | backend, ai | E2 / HU4 | M | 1.25 h | T-04, T-06, T-33 |
| T-08 | Pantalla del currículum | frontend | E2 / HU4 | M | 1 h | T-07 |
| T-09 | Tablas de ofertas, empresas objetivo y búsquedas | db | E1 / HU1, HU2, HU3 | M | 0.5 h | T-02 |
| T-10 | API y extracción de ofertas, y decisión | backend, ai | E1, E3 / HU1, HU7 | M | 2.25 h | T-04, T-09, T-33 |
| T-11 | Pantallas de ofertas y decisión | frontend | E1, E3 / HU1, HU7 | M | 1.75 h | T-10 |
| T-12 | Empresas objetivo, interfaz de adaptadores y Greenhouse | backend | E1 / HU2 | M | 1.75 h | T-09, T-04, T-15 |
| T-13 | Pantalla de empresas objetivo | frontend | E1 / HU2 | M | 0.5 h | T-12 |
| T-25 | Adaptador de Ashby | backend | E1 / HU2 | M | 1 h | T-12 |
| T-26 | Adaptador de Lever | backend | E1 / HU2 | S | 1 h | T-12 |
| T-27 | Spike del agregador de ofertas | backend | E1 / HU3 | M | 0.5 h | T-12 |
| T-28 | Búsquedas guardadas y adaptador del agregador | backend | E1 / HU3 | M | 1.5 h | T-27 |
| T-29 | Pantalla de búsquedas guardadas | frontend | E1 / HU3 | M | 0.5 h | T-28 |
| T-14 | Tablas de preferencias, filtros y análisis | db | E3 / HU5, HU6 | M | 0.5 h | T-09 |
| T-15 | Preferencias y filtros duros | backend | E3 / HU5 | M | 2 h | T-14 |
| T-32 | Etiquetar los golden sets | ai, test | E3 / HU6 | M | 0.5 h | — |
| T-16 | Puntaje de encaje con IA | backend, ai | E3 / HU6 | M | 2 h | T-07, T-15, T-32, T-33 |
| T-17 | Script de evals | ai, test | E3 / HU6 | M | 1.25 h | T-10, T-16, T-32, T-33 |
| T-18 | Pantallas de preferencias, detalle y puntaje a pedido | frontend | E3 / HU5, HU6 | M | 1.25 h | T-16 |
| T-19 | Candidaturas y su historial | db, backend | E4 / HU8 | M | 1.5 h | T-10 |
| T-20 | Tablero de candidaturas accesible | frontend | E4 / HU8 | M | 1.5 h | T-19 |
| T-35 | Observabilidad y métricas | backend | E5 / Plataforma | M | 0.75 h | T-04, T-33 |
| T-34 | Instancia de demostración | infra | E5 / Plataforma | M | 1 h | T-05, T-33 |
| T-21 | Prueba E2E, accesibilidad y documentación final | test | Todas | M | 2.25 h | T-05, T-20, T-34 |
| T-30 | Carga del currículum en PDF | backend, frontend, ai | E2 / HU4 | S | 1 h | T-07, T-33 |
| T-36 | Respaldo y restauración de la base de datos | infra | E5 / Plataforma | S | 0.5 h | T-05 |
| T-22 | Clasificación de correos y alertas | backend, ai | E4 / HU9 | S | 1.5 h | T-19, T-33 |
| T-23 | Correos y alertas en la interfaz | frontend | E4 / HU9 | S | 1.5 h | T-22 |
| T-24 | Traducción al español y selector de idioma | frontend, backend | E5 / HU10 | S | 2 h | T-03 |

**Totales:** must-have ≈ 35.5 h (tope: 36 h); should-have ≈ 7.5 h. Could-have sin ticket: arrastrar en el tablero (RF-33a), caché de prompts, limitador de intentos en el login y RF-08.

**Orden de recorte si falta tiempo:** T-26 (Lever) ya es should-have; después, T-29 (pantalla de búsquedas) se reemplaza por una búsqueda fija configurada por variable de entorno. Si el spike T-27 descarta el agregador, T-28 se reemplaza por un adaptador de SmartRecruiters (1 h).

---

## Antes del desarrollo

### T-31 — Medir la línea base de OBJ-1

- **Tipo:** producto · **Estimación:** 0.25 h · **Requisitos:** OBJ-1

**Tareas**
- Con 5 ofertas reales, medir el tiempo desde que se abre la oferta hasta decidir si aplicar, con el proceso actual (sin el sistema).
- Registrar la mediana en `docs/prd.md` (sección 2) y en `docs/vision.md` (sección 3), en lugar del supuesto de 15 min.

**Criterios de aceptación**
- Línea base medida y documentada antes del walking skeleton.

---

## E5 — Plataforma: walking skeleton y control de gasto

### T-01 — Monorepo con API y SPA

- **Tipo:** infra · **Estimación:** 1 h · **Requisitos:** ADR-0001

**Tareas**
- Crear el workspace pnpm (`pnpm-workspace.yaml`) con `apps/api` y `apps/web`.
- `apps/api`: AdonisJS v7 con el kit API, Node.js 24, TypeScript estricto.
- `apps/web`: React 19 + Vite + TypeScript, TanStack Query.
- ESLint, Prettier y scripts raíz: `dev`, `lint`, `typecheck`, `test`, `build`.
- Configurar Tuyau para generar el cliente tipado que usa `apps/web`.
- Hook de Claude Code (`.claude/settings.json`) que ejecute lint y pruebas después de cada edición.

**Criterios de aceptación**
- `pnpm install`, `pnpm lint`, `pnpm typecheck` y `pnpm build` terminan sin errores.
- `pnpm dev` levanta la API y la SPA; la SPA llama a `GET /api/v1/health` con el cliente Tuyau y muestra la respuesta.
- Si Tuyau no se integra con la SPA separada, se aplica el plan B de ADR-0001 (cliente `fetch` tipado a mano) y se registra en el historial del ADR.

### T-02 — Base de datos local y usuario único

- **Tipo:** db · **Estimación:** 1 h · **Requisitos:** RNF-01, RNF-02

**Tareas**
- `docker-compose.yml` con PostgreSQL para desarrollo y pruebas.
- Configurar Lucid y las variables de entorno; crear `.env.example`.
- Migración `users` (`email`, `password_hash`, `locale`).
- Seed del usuario único con correo y contraseña tomados de variables de entorno.

**Criterios de aceptación**
- `node ace migration:run` y el seed se ejecutan sin errores en una base vacía.
- Ningún secreto en el repositorio.

### T-03 — Autenticación por sesión e i18n base

- **Tipo:** backend, frontend · **Estimación:** 1.25 h · **Requisitos:** RNF-01, RF-50

**Tareas**
- Endpoints `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` con el guard de sesión de AdonisJS.
- Middleware de autenticación en todas las rutas `/api/v1/*` salvo el login y `/health`.
- Protección CSRF (Shield).
- Formato de respuesta `{ data, error, meta }` y manejador global de errores.
- SPA: pantalla de login, rutas protegidas y cierre de sesión.
- Configurar react-i18next con `en` como idioma principal; ningún texto escrito directamente en los componentes.
- Could-have: limitador de intentos en el login.

**Criterios de aceptación**
- Una petición sin sesión a una ruta protegida responde `401` con el formato de error.
- Credenciales incorrectas responden `401`.
- Pruebas funcionales de login, logout y acceso sin sesión.

### T-04 — Cola de trabajos y cliente de IA

- **Tipo:** backend, ai · **Estimación:** 1.5 h · **Requisitos:** ADR-0003, ADR-0004, ADR-0005, RNF-09, RNF-10

**Tareas**
- Spike: elegir la librería de cola sobre PostgreSQL y verificar su compatibilidad con AdonisJS v7; actualizar ADR-0005.
- Worker dentro del proceso de la API; reintentos con espera exponencial.
- Endpoint `GET /api/v1/jobs/{id}` con estado (`queued`, `running`, `completed`, `failed`) y resultado.
- Módulo `app/ai/`: cliente de Claude inyectable, modelos por variables de entorno (`CLAUDE_MODEL_*`), respuesta estructurada con validación de esquema, revisión de `stop_reason`, registro de uso de tokens.
- Doble de prueba del cliente de IA con respuestas fijas, activable por configuración (`AI_DRIVER=fake`) para pruebas y E2E.

**Criterios de aceptación**
- Un trabajo de prueba se encola, se ejecuta y su estado se consulta por la API.
- La librería de la cola está verificada con AdonisJS v7; si no es compatible, se aplica el plan B de ADR-0005 (tabla propia con `SKIP LOCKED`).
- Las pruebas usan el doble de prueba; ninguna llama a la API real.

### T-05 — Contenedor, CI y despliegue

- **Tipo:** infra, test · **Estimación:** 1.5 h · **Requisitos:** RNF-12, ADR-0001

**Tareas**
- `Dockerfile` multi-etapa: build de `apps/web` y `apps/api`; la API sirve `apps/web/dist` y devuelve `index.html` para rutas fuera de `/api/`.
- Migraciones al iniciar el contenedor.
- GitHub Actions: lint, typecheck, pruebas con PostgreSQL de servicio y build.
- Servicio en Railway con PostgreSQL y variables de entorno, sin suspensión por inactividad (ADR-0005).
- Playwright configurado en `e2e/` con una prueba de humo: login y cierre de sesión.

**Criterios de aceptación**
- La URL de Railway de la instancia personal muestra la pantalla de login y permite entrar con el usuario único (la URL pública para el evaluador es la de demostración, T-34).
- CI en verde en el PR del walking skeleton.


### T-33 — Control de gasto de IA

- **Tipo:** backend, frontend, ai · **Estimación:** 1.5 h · **Requisitos:** RNF-07, ADR-0008

**Tareas**
- Migración `ai_usage` y tabla de precios por modelo versionada en el repositorio.
- Registrar cada llamada del cliente de IA (tarea, modelo, tokens, costo estimado).
- Antes de cada llamada, comparar el gasto del día y del mes con `AI_DAILY_BUDGET_USD` y `AI_MONTHLY_BUDGET_USD`; si se superaría, terminar el trabajo en `failed` con `AI_BUDGET_EXCEEDED`.
- `GET /ai-usage/summary` e indicador de gasto en la SPA.

**Criterios de aceptación**
- Con el tope alcanzado, ningún trabajo llama al doble de prueba del cliente de IA y la interfaz muestra un mensaje claro.
- Pruebas unitarias del cálculo de costo y del control de topes.

---

## E2 — Perfil profesional (HU4)

### T-06 — Tabla de currículums

- **Tipo:** db · **Estimación:** 0.5 h · **Requisitos:** RF-10, RF-14

**Tareas**
- Migración `resumes` según `docs/architecture.md` (sección 3).
- Índice único parcial: un solo currículum con `is_active = true` por usuario.
- Modelo Lucid `Resume`.

**Criterios de aceptación**
- Insertar un segundo currículum activo para el mismo usuario falla a nivel de base de datos.

### T-07 — API y extracción del currículum en Markdown

- **Tipo:** backend, ai · **Estimación:** 1.25 h · **Requisitos:** RF-10, RF-12 a RF-14, ADR-0004

**Tareas**
- `POST /resumes` (multipart): acepta Markdown, máximo 5 MB, verificando el tipo real del archivo; crea una nueva versión y encola `extract_resume`.
- Trabajo `extract_resume`: extrae el perfil estructurado desde el Markdown.
- Esquema `resume_profile` y prompt `extract_resume` v1 versionados.
- `GET /resumes/active` y `PATCH /resumes/{id}` (corregir Markdown o perfil).
- Al activar una versión nueva, marcar `match_analyses.is_stale = true` e informar cuántas ofertas quedaron desactualizadas (RF-14). El recálculo a pedido usa `POST /job-postings/match` (T-16) y su pantalla está en T-18.

**Criterios de aceptación**
- Archivo de otro tipo o mayor a 5 MB: `422` con mensaje claro.
- Un currículum nuevo no dispara recálculos automáticos.
- Pruebas funcionales con el doble de prueba del cliente de IA.

### T-08 — Pantalla del currículum

- **Tipo:** frontend · **Estimación:** 1 h · **Requisitos:** RF-10, RF-12 a RF-14

**Tareas**
- Carga del archivo con progreso del trabajo (polling a `/jobs/{id}`).
- Vista y edición del perfil (habilidades, experiencia, años, seniority, formación, idiomas) y del Markdown.
- Aviso de puntajes desactualizados con el número de ofertas (el botón de recalcular llega con T-18).

**Criterios de aceptación**
- Cumple los escenarios must-have de HU4 en `docs/user-stories.md`.
- Todos los textos en los archivos de i18n.

---

## E1 — Ingreso de ofertas (HU1, HU2, HU3)

### T-09 — Tablas de ofertas, empresas objetivo y búsquedas

- **Tipo:** db · **Estimación:** 0.5 h · **Requisitos:** RF-05, RF-07, RF-04a, RF-09, RNF-14

**Tareas**
- Migraciones `target_companies`, `job_searches` y `job_postings` según `docs/architecture.md`, incluidas `decision`, `skip_reason`, `first_viewed_at` y `decided_at`.
- Índices únicos: (`user_id`, `source`, `external_id`), (`user_id`, `source_url`) y (`user_id`, `dedupe_key`) cuando no son nulos.
- Modelos Lucid `TargetCompany`, `JobSearch` y `JobPosting`.

**Criterios de aceptación**
- Insertar dos ofertas con la misma fuente e identificador externo falla a nivel de base de datos.

### T-10 — API y extracción de ofertas, y decisión

- **Tipo:** backend, ai · **Estimación:** 2.25 h · **Requisitos:** RF-01 a RF-03, RF-05 a RF-07, RF-30, RNF-14

**Tareas**
- `POST /job-postings/extractions`: recibe el texto y la URL opcional; encola `extract_job_posting`.
- Esquema `job_posting_fields` y prompt `extract_job_posting` v1; los campos ausentes vuelven como `null`.
- `POST /job-postings` (guardar, con o sin revisión), `GET /job-postings` (paginado, filtro de estado, orden por puntaje o fecha), `GET` / `PATCH /job-postings/{id}`.
- `GET /job-postings/{id}` fija `first_viewed_at` la primera vez.
- `POST /job-postings/{id}/decision`: `apply` crea la candidatura en `saved` (en la misma transacción); `skip` archiva con motivo opcional; ambos guardan `decided_at`.
- Calcular `content_hash`, la URL canónica y `dedupe_key` de la oferta (ADR-0006).
- La decisión `apply` llama al servicio `createApplicationFromPosting` de E4; no escribe directo en sus tablas.

**Criterios de aceptación**
- Guardar una oferta duplicada responde `409`.
- Una segunda decisión `apply` sobre la misma oferta no crea otra candidatura.
- Pruebas unitarias del parseo de la respuesta y funcionales de los endpoints.

### T-11 — Pantallas de ofertas y decisión

- **Tipo:** frontend · **Estimación:** 1.75 h · **Requisitos:** RF-01, RF-03, RF-06, RF-07

**Tareas**
- Formulario para pegar el texto, progreso de la extracción y opción de guardar directo o revisar los campos (los desconocidos marcados como tales).
- Edición de campos desde el detalle de la oferta.
- Lista de ofertas con título, empresa, origen, resultado del filtro, puntaje y decisión; orden por puntaje o fecha.
- Botones "aplicar" y "descartar" (con motivo opcional) en el detalle de la oferta.

**Criterios de aceptación**
- Cumple los escenarios de HU1 y HU7.

### T-12 — Empresas objetivo, interfaz de adaptadores y Greenhouse

- **Tipo:** backend · **Estimación:** 1.75 h · **Requisitos:** RF-04, RF-04b, RF-05, RF-09, ADR-0002, ADR-0006

**Tareas**
- CRUD `/target-companies` con validación de `ats_provider` y `board_token`.
- Interfaz `JobSourceAdapter` con los modos por job board y por búsqueda; `GreenhouseAdapter` (`boards-api.greenhouse.io/v1/boards/{board_token}/jobs`).
- Conversión local de HTML a Markdown de las descripciones.
- Normalización compartida por todos los adaptadores: URL canónica y `dedupe_key` (empresa, título y ubicación principal) para detectar duplicados entre fuentes.
- Trabajo `sync_target_company`: trae, normaliza, omite duplicados, aplica el tope de ofertas nuevas (RF-04b), guarda, aplica filtros y actualiza `last_synced_at`; devuelve el resumen (agregadas, duplicadas, omitidas por el tope).
- `POST /target-companies/{id}/sync` devuelve `202` con `jobId`.

**Criterios de aceptación**
- Pruebas del adaptador con respuestas grabadas de Greenhouse; ninguna llamada real en CI.
- Importar dos veces no duplica ofertas; con 140 ofertas nuevas y tope 50, se agregan 50.
- Una oferta ya pegada a mano no se duplica al importarla desde su job board.
- Las ofertas importadas no se puntúan automáticamente.
- `board_token` inexistente: el trabajo termina en `failed` con un mensaje claro.

### T-13 — Pantalla de empresas objetivo

- **Tipo:** frontend · **Estimación:** 0.5 h · **Requisitos:** RF-04, RF-04b, RF-09

**Tareas**
- Lista, alta, edición y baja de empresas objetivo.
- Botón de importar (para Greenhouse, Ashby o Lever con `board_token`) con progreso y resumen (agregadas, duplicadas, omitidas por el tope).

**Criterios de aceptación**
- Cumple los escenarios de HU2.

### T-25 — Adaptador de Ashby

- **Tipo:** backend · **Estimación:** 1 h · **Requisitos:** RF-04, ADR-0006

**Tareas**
- `AshbyAdapter` sobre el job board público de Ashby; verificar el endpoint y su formato en la documentación oficial.
- Normalización al formato común y conversión de la descripción a Markdown.

**Criterios de aceptación**
- Pruebas con respuestas grabadas del job board de OpenAI; ninguna llamada real en CI.

### T-26 — Adaptador de Lever (should-have)

- **Tipo:** backend · **Estimación:** 1 h · **Requisitos:** RF-04, ADR-0006

**Tareas**
- `LeverAdapter` sobre la API pública de postings de Lever; verificar el endpoint y su formato en la documentación oficial.
- Normalización al formato común y conversión de la descripción a Markdown.

**Criterios de aceptación**
- Pruebas con respuestas grabadas; ninguna llamada real en CI.

### T-27 — Spike del agregador de ofertas

- **Tipo:** backend · **Estimación:** 0.5 h · **Requisitos:** RF-04a, ADR-0006

**Tareas**
- Probar JSearch (primer candidato) con 3 búsquedas reales: "software engineer" en Seattle, en remoto y con el nombre de una empresa grande.
- Revisar cuota gratuita, términos de uso y si los resultados incluyen ofertas de las empresas grandes de la lista.
- Registrar el resultado en ADR-0006.

**Criterios de aceptación**
- Decisión documentada: proveedor elegido, o reemplazo por el adaptador de SmartRecruiters.

### T-28 — Búsquedas guardadas y adaptador del agregador

- **Tipo:** backend · **Estimación:** 1.5 h · **Requisitos:** RF-04a, RF-04b, RF-05

**Tareas**
- CRUD `/job-searches` y `POST /job-searches/{id}/sync` (`202` con `jobId`).
- `AggregatorAdapter` en modo búsqueda, con la clave del proveedor en variable de entorno.
- Trabajo `sync_job_search` con el mismo flujo que `sync_target_company` (normalizar, omitir duplicados, tope, filtros); las ofertas encontradas no se puntúan automáticamente (ADR-0008).
- Respetar la cuota del proveedor: si se agota, el trabajo termina en `failed` con un mensaje claro.

**Criterios de aceptación**
- Pruebas con respuestas grabadas; ninguna llamada real en CI.

### T-29 — Pantalla de búsquedas guardadas

- **Tipo:** frontend · **Estimación:** 0.5 h · **Requisitos:** RF-04a

**Tareas**
- Lista, alta, edición y baja de búsquedas; botón de ejecutar con progreso y resumen.

**Criterios de aceptación**
- Cumple los escenarios de HU3.

---

## E3 — Evaluación de ofertas (HU5, HU6, HU7)

### T-14 — Tablas de preferencias, filtros y análisis

- **Tipo:** db · **Estimación:** 0.5 h · **Requisitos:** RF-20, RF-21, RF-25, RF-26

**Tareas**
- Migraciones `job_preferences` (incluidas las palabras de rol y el tope por sincronización), `filter_results` y `match_analyses` según `docs/architecture.md`.
- Índice único en `match_analyses.input_hash`.

**Criterios de aceptación**
- Las migraciones se aplican y revierten sin errores.

### T-15 — Preferencias y filtros duros

- **Tipo:** backend · **Estimación:** 2 h · **Requisitos:** RF-20 a RF-23, `docs/prd.md` sección 6.1

**Tareas**
- `GET` / `PUT /preferences` con validación.
- Servicio puro `evaluateHardFilters(posting, preferences)` en `app/filters/` con los criterios de rol, modalidad, ubicación, salario y seniority, según las reglas de la sección 6.1 del PRD.
- Normalización de ubicaciones (ciudad y estado de EE. UU.) y anualización del salario (hora × 2080, mes × 12).
- Tabla de mapeo de seniority versionada en el repositorio (incluye niveles como L5, E5, SDE II, IC4).
- Aplicar los filtros al guardar o importar una oferta y al cambiar las preferencias.
- Encolar `score_match` solo para ofertas pegadas (`source = manual`) con resultado `pass` o `unknown`; las importadas se puntúan a pedido (ADR-0008).

**Criterios de aceptación**
- Pruebas unitarias por tabla de casos para cada criterio (incluidos remoto fuera de EE. UU., salario por hora, varias ubicaciones y seniority sin mapeo), con cobertura ≥ 90 % del servicio.

### T-16 — Puntaje de encaje con IA

- **Tipo:** backend, ai · **Estimación:** 2 h · **Requisitos:** RF-23 a RF-28, RNF-06, RNF-07, RNF-09

**Tareas**
- Esquema `match_analysis` (`score`, `strengths`, `gaps`, `evidence`) y prompt `score_match` v1; la etiqueta se deriva del puntaje con los umbrales de RF-24.
- Verificar cada fragmento de evidencia contra la oferta y el currículum (coincidencia literal ignorando mayúsculas y espacios) y descartar los que no aparecen (RF-24a).
- Trabajo `score_match`: calcula `input_hash` (oferta, currículum, prompt, modelo); si existe, reutiliza el análisis; si no, llama a Claude y guarda modelo, versión del prompt, uso de tokens y duración.
- Ajuste por modalidad (RF-28, should-have) calculado al leer, fuera de la caché.
- Sin currículum activo, el trabajo no llama a la IA y termina con el código `NO_ACTIVE_RESUME`.
- `POST /job-postings/{id}/match` (incluye ofertas descartadas, a pedido) y `POST /job-postings/match` para varias ofertas, con `dryRun` que devuelve el costo estimado.
- Un reintento ante respuesta inválida; después, `failed` con mensaje claro.

**Criterios de aceptación**
- Pruebas con el doble de prueba: análisis nuevo, reutilización por hash, evidencia inventada descartada, umbrales de etiqueta, respuesta inválida y reintento.

### T-32 — Etiquetar los golden sets

- **Tipo:** ai, test · **Estimación:** 0.5 h · **Requisitos:** RNF-08, RF-02, OBJ-2

**Tareas**
- Golden set de puntaje en `apps/api/evals/match/`: al menos 20 ofertas reales etiquetadas a mano, separadas en ajuste (10) y prueba (10).
- Golden set de extracción en `apps/api/evals/extraction/`: al menos 10 ofertas con los campos esperados.
- Se hace antes de implementar T-16, para que las etiquetas no se vean influidas por las respuestas de la IA.

**Criterios de aceptación**
- Ambos golden sets versionados en el repositorio antes de iniciar T-16.

### T-17 — Script de evals

- **Tipo:** ai, test · **Estimación:** 1.25 h · **Requisitos:** RNF-08, RF-02, OBJ-2

**Tareas**
- Script `pnpm --filter api evals` que reporta el acuerdo del puntaje en el conjunto de prueba (tolerancia ±1 nivel) y la precisión por campo de la extracción, incluidos salarios inventados.
- Guardar cada resultado en `apps/api/evals/results/<prompt>-<versión>.json` y agregar un chequeo de CI que falle si un prompt cambia de versión sin su archivo de resultados.
- Documentar los resultados con los modelos de desarrollo y de producción.

**Criterios de aceptación**
- Con el modelo de producción: acuerdo ≥ 80 % en el conjunto de prueba; extracción ≥ 90 % de campos correctos y 0 salarios inventados.
- El prompt se ajusta solo con el conjunto de ajuste.

### T-18 — Pantallas de preferencias, detalle y puntaje a pedido

- **Tipo:** frontend · **Estimación:** 1.25 h · **Requisitos:** RF-14, RF-20, RF-23, RF-24, RF-27

**Tareas**
- Formulario de preferencias (palabras de rol de inclusión y exclusión, modalidades en orden, ubicaciones, salario mínimo, seniorities, tope por sincronización).
- Detalle de la oferta: resultado del filtro por criterio, puntaje, etiqueta, fortalezas, brechas y evidencia; botón para recalcular.
- Selección múltiple en la lista y botón "puntuar seleccionadas", que muestra el costo estimado antes de confirmar (ADR-0008); el mismo flujo recalcula los puntajes desactualizados por un currículum nuevo (RF-14).

**Criterios de aceptación**
- Cumple los escenarios de HU5 y HU6 en `docs/user-stories.md`, y el recálculo del escenario "Reemplazar el currículum" de HU4.

---

## E4 — Seguimiento de candidaturas (HU8)

### T-19 — Candidaturas y su historial

- **Tipo:** db, backend · **Estimación:** 1.5 h · **Requisitos:** RF-30 a RF-35

**Tareas**
- Migraciones `applications` (única por oferta) y `application_events`.
- Servicio de transiciones de estado: `rejected` y `withdrawn` son finales; cualquier estado activo puede pasar a ellos.
- Cada cambio de estado inserta un evento y actualiza `last_activity_at` en la misma transacción.
- Endpoints `GET /applications`, `GET /applications/{id}`, `PATCH /applications/{id}/status`, `POST /applications/{id}/notes`. La creación ocurre con la decisión `apply` (T-10).

**Criterios de aceptación**
- Pruebas unitarias de todas las transiciones válidas e inválidas (transición inválida: `422`).
- Pruebas funcionales de los endpoints.

### T-20 — Tablero de candidaturas accesible

- **Tipo:** frontend · **Estimación:** 1.5 h · **Requisitos:** RF-31 a RF-35, RNF-13

**Tareas**
- Tablero con columnas por estado activo y acceso a las candidaturas cerradas.
- Selector de estado en cada tarjeta, usable con teclado.
- Detalle de la candidatura con oferta, puntaje, estado e historial; agregar notas (should-have).
- Could-have: arrastrar tarjetas entre columnas (RF-33a).

**Criterios de aceptación**
- Cumple los escenarios de HU8, incluido el uso solo con teclado.

---

## Cierre del MVP

### T-35 — Observabilidad y métricas

- **Tipo:** backend · **Estimación:** 0.75 h · **Requisitos:** RNF-06, RNF-14, RNF-15

**Tareas**
- Logs estructurados en JSON con `jobId`, tipo de trabajo, duración y resultado, sin contenido completo del currículum ni de los correos.
- Comando `node ace metrics`: OBJ-1 (mediana del tiempo a la decisión), OBJ-5 (porcentaje de ofertas automáticas), percentil 90 de la duración por tipo de trabajo y gasto de IA del día y del mes.

**Criterios de aceptación**
- Prueba del comando con datos de ejemplo.

### T-34 — Instancia de demostración

- **Tipo:** infra · **Estimación:** 1 h · **Requisitos:** RNF-01, RNF-12, ADR-0007

**Tareas**
- Seed `node ace db:seed --demo`: usuario de demostración, currículum de ejemplo en Markdown, preferencias, una empresa objetivo con job board público y unas 10 ofertas sintéticas.
- Segundo servicio en Railway con la misma imagen, su propio PostgreSQL y topes de IA bajos.
- Credenciales y URL de la demostración en `readme.md`; la instancia personal queda privada.

**Criterios de aceptación**
- El flujo principal funciona en la demostración sin datos reales.
- Las credenciales del `readme.md` no dan acceso a la instancia personal.

### T-21 — Prueba E2E, accesibilidad y documentación final

- **Tipo:** test · **Estimación:** 2.25 h · **Requisitos:** RNF-10, RNF-12, RNF-13, OBJ-4

**Tareas**
- Prueba Playwright: login → cargar currículum en Markdown → pegar oferta → guardar → ver filtro y puntaje → decisión "aplicar" → mover la candidatura a "Applied".
- La prueba corre con `AI_DRIVER=fake` para no depender de la API real.
- `axe-core` en las pantallas de ofertas, detalle y tablero.
- Actualizar `readme.md` con la URL y las credenciales de la instancia de demostración (T-34) y los pasos de verificación; actualizar `prompts.md`.

**Criterios de aceptación**
- La prueba E2E pasa en CI y en local, sin violaciones de accesibilidad `serious` o `critical`.
- `readme.md` cumple el contenido obligatorio de la entrega final.

---

## Should-have de E2 (HU4)

### T-30 — Carga del currículum en PDF

- **Tipo:** backend, frontend, ai · **Estimación:** 1 h · **Requisitos:** RF-11, ADR-0004

**Tareas**
- Aceptar PDF en `POST /resumes`; el trabajo `extract_resume` convierte el PDF a Markdown y extrae el perfil en una sola llamada.
- PDF sin texto legible: el trabajo termina en `failed` con el código `UNREADABLE_PDF`; la SPA ofrece pegar el texto.

**Criterios de aceptación**
- Cumple los escenarios should-have de HU4.

---

## Should-have (HU9, HU10)

### T-22 — Clasificación de correos y alertas

- **Tipo:** backend, ai · **Estimación:** 1.5 h · **Requisitos:** RF-40 a RF-43

**Tareas**
- `POST /applications/{id}/emails` y trabajo `classify_email` (esquema y prompt v1): clasificación, fecha relevante, siguiente paso y estado sugerido.
- La sugerencia no cambia el estado; se aplica solo con `PATCH /applications/{id}/status`.
- Cálculo de candidaturas sin actividad (cambio de estado, nota o correo) según `follow_up_days`.

**Criterios de aceptación**
- Pruebas con el doble de prueba para cada clasificación.

### T-23 — Correos y alertas en la interfaz

- **Tipo:** frontend · **Estimación:** 1.5 h · **Requisitos:** RF-40 a RF-43

**Tareas**
- Formulario para pegar un correo en la candidatura; mostrar la clasificación y la sugerencia con botones de confirmar o descartar.
- Marca de seguimiento en el tablero y campo de días en preferencias.

**Criterios de aceptación**
- Cumple los escenarios de HU9.

### T-24 — Traducción al español y selector de idioma

- **Tipo:** frontend, backend · **Estimación:** 2 h · **Requisitos:** RF-51, RF-52

**Tareas**
- Archivo `locales/es` completo.
- Selector de idioma; guardar `users.locale` con `PATCH /auth/me` y aplicarlo al iniciar sesión.
- Opcional (could-have): generar los análisis de la IA en el idioma elegido.

**Criterios de aceptación**
- Cumple los escenarios de HU10; ninguna cadena sin traducir en español.

---

## Should-have de E5 (Plataforma)

### T-36 — Respaldo y restauración de la base de datos

- **Tipo:** infra · **Estimación:** 0.5 h · **Requisitos:** RNF-16

**Tareas**
- Activar los respaldos de PostgreSQL en Railway o programar un `pg_dump` de la instancia personal.
- Restaurar un respaldo en una base de datos local y documentar el procedimiento.

**Criterios de aceptación**
- Restauración probada al menos una vez y documentada.

