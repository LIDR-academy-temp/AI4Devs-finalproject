# Tickets de trabajo — ATS personal

> Tickets técnicos derivados de [`docs/user-stories.md`](./user-stories.md). Una historia genera varios tickets. Cada ticket sigue la definition of done de `CLAUDE.md`. La implementación de cada historia se hace como un cambio de OpenSpec que agrupa sus tickets.

- **Estado:** borrador v0.1
- **Fecha:** 2026-11-04
- **Tipos:** `infra`, `db`, `backend`, `ai`, `frontend`, `test`

---

## Resumen

| Id | Título | Tipo | Historia | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- |
| T-01 | Monorepo con API y SPA | infra | Skeleton | 1 h | — |
| T-02 | Base de datos local y usuario único | db | Skeleton | 1 h | T-01 |
| T-03 | Autenticación por sesión e i18n base | backend, frontend | Skeleton | 1.5 h | T-02 |
| T-04 | Cola de trabajos y cliente de IA | backend, ai | Skeleton | 1.5 h | T-02 |
| T-05 | Contenedor, CI y despliegue | infra, test | Skeleton | 1.5 h | T-03 |
| T-06 | Tabla de currículums | db | HU2 | 0.5 h | T-02 |
| T-07 | API y extracción del currículum | backend, ai | HU2 | 2 h | T-04, T-06 |
| T-08 | Pantalla del currículum | frontend | HU2 | 1.5 h | T-07 |
| T-09 | Tablas de ofertas y empresas objetivo | db | HU1 | 0.5 h | T-02 |
| T-10 | API y extracción de ofertas | backend, ai | HU1 | 2 h | T-04, T-09 |
| T-11 | Pantallas para agregar y listar ofertas | frontend | HU1 | 1.5 h | T-10 |
| T-12 | Empresas objetivo e importación desde Greenhouse | backend | HU1 | 1.5 h | T-09, T-04 |
| T-13 | Pantalla de empresas objetivo | frontend | HU1 | 0.5 h | T-12 |
| T-14 | Tablas de preferencias, filtros y análisis | db | HU3 | 0.5 h | T-09 |
| T-15 | Preferencias y filtros duros | backend | HU3 | 1.5 h | T-14 |
| T-16 | Puntaje de encaje con IA | backend, ai | HU3 | 2 h | T-07, T-15 |
| T-17 | Golden set y evals del puntaje | ai, test | HU3 | 1 h | T-16 |
| T-18 | Pantallas de preferencias y detalle del puntaje | frontend | HU3 | 1 h | T-16 |
| T-19 | Candidaturas y su historial | db, backend | HU4 | 1.5 h | T-09 |
| T-20 | Tablero Kanban accesible | frontend | HU4 | 2 h | T-19 |
| T-21 | Prueba E2E del flujo principal y documentación final | test | Todas | 2 h | T-05, T-20 |
| T-22 | Clasificación de correos y alertas | backend, ai | HU5 | 1.5 h | T-19 |
| T-23 | Correos y alertas en la interfaz | frontend | HU5 | 1.5 h | T-22 |
| T-24 | Traducción al español y selector de idioma | frontend, backend | HU6 | 2 h | T-03 |

**Totales:** must-have (T-01 a T-21) ≈ 28 h; should-have (T-22 a T-24) ≈ 5 h.

---

## Walking skeleton

### T-01 — Monorepo con API y SPA

- **Tipo:** infra · **Estimación:** 1 h · **Requisitos:** ADR-0001

**Tareas**
- Crear el workspace pnpm (`pnpm-workspace.yaml`) con `apps/api` y `apps/web`.
- `apps/api`: AdonisJS v7 con el kit API, Node.js 24, TypeScript estricto.
- `apps/web`: React 19 + Vite + TypeScript, TanStack Query.
- ESLint, Prettier y scripts raíz: `dev`, `lint`, `typecheck`, `test`, `build`.
- Configurar Tuyau para generar el cliente tipado que usa `apps/web`.

**Criterios de aceptación**
- `pnpm install`, `pnpm lint`, `pnpm typecheck` y `pnpm build` terminan sin errores.
- `pnpm dev` levanta la API y la SPA; la SPA llama a `GET /api/v1/health` con el cliente Tuyau y muestra la respuesta.

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

- **Tipo:** backend, frontend · **Estimación:** 1.5 h · **Requisitos:** RNF-01, RF-50

**Tareas**
- Endpoints `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` con el guard de sesión de AdonisJS.
- Middleware de autenticación en todas las rutas `/api/v1/*` salvo el login.
- Protección CSRF (Shield) y limitador de intentos en el login.
- Formato de respuesta `{ data, error, meta }` y manejador global de errores.
- SPA: pantalla de login, rutas protegidas y cierre de sesión.
- Configurar react-i18next con `en` como idioma principal; ningún texto escrito directamente en los componentes.

**Criterios de aceptación**
- Una petición sin sesión a una ruta protegida responde `401` con el formato de error.
- Credenciales incorrectas responden `401`; tras varios intentos, `429`.
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
- Las pruebas usan el doble de prueba; ninguna llama a la API real.

### T-05 — Contenedor, CI y despliegue

- **Tipo:** infra, test · **Estimación:** 1.5 h · **Requisitos:** RNF-12, ADR-0001

**Tareas**
- `Dockerfile` multi-etapa: build de `apps/web` y `apps/api`; la API sirve `apps/web/dist` y devuelve `index.html` para rutas fuera de `/api/`.
- Migraciones al iniciar el contenedor.
- GitHub Actions: lint, typecheck, pruebas con PostgreSQL de servicio y build.
- Servicio en Railway con PostgreSQL y variables de entorno.
- Playwright configurado en `e2e/` con una prueba de humo: login y cierre de sesión.

**Criterios de aceptación**
- La URL pública de Railway muestra la pantalla de login y permite entrar con el usuario único.
- CI en verde en el PR del walking skeleton.

---

## HU2 — Currículum

### T-06 — Tabla de currículums

- **Tipo:** db · **Estimación:** 0.5 h · **Requisitos:** RF-10, RF-14

**Tareas**
- Migración `resumes` según `docs/architecture.md` (sección 3).
- Índice único parcial: un solo currículum con `is_active = true` por usuario.
- Modelo Lucid `Resume`.

**Criterios de aceptación**
- Insertar un segundo currículum activo para el mismo usuario falla a nivel de base de datos.

### T-07 — API y extracción del currículum

- **Tipo:** backend, ai · **Estimación:** 2 h · **Requisitos:** RF-10 a RF-14, ADR-0004

**Tareas**
- `POST /resumes` (multipart): acepta PDF o Markdown, máximo 5 MB, verificando el tipo real del archivo; crea una nueva versión y encola `extract_resume`.
- Trabajo `extract_resume`: si es PDF, una llamada convierte a Markdown y extrae el perfil; si es Markdown, solo extrae el perfil.
- Esquema `resume_profile` y prompt `extract_resume` v1 versionados.
- `GET /resumes/active` y `PATCH /resumes/{id}` (corregir Markdown o perfil).
- Al activar una versión nueva, marcar `match_analyses.is_stale = true` de las versiones anteriores.

**Criterios de aceptación**
- Archivo de otro tipo o mayor a 5 MB: `422` con mensaje claro.
- PDF sin texto legible: el trabajo termina en `failed` con el código `UNREADABLE_PDF`.
- Pruebas funcionales con el doble de prueba del cliente de IA.

### T-08 — Pantalla del currículum

- **Tipo:** frontend · **Estimación:** 1.5 h · **Requisitos:** RF-10 a RF-13

**Tareas**
- Carga del archivo con progreso del trabajo (polling a `/jobs/{id}`).
- Vista y edición del perfil (habilidades, experiencia, años, seniority, formación, idiomas) y del Markdown.
- Mensajes de error para archivo inválido y PDF ilegible, con la opción de pegar el texto.

**Criterios de aceptación**
- Cumple los escenarios de HU2 en `docs/user-stories.md`.
- Todos los textos en los archivos de i18n.

---

## HU1 — Ofertas

### T-09 — Tablas de ofertas y empresas objetivo

- **Tipo:** db · **Estimación:** 0.5 h · **Requisitos:** RF-05, RF-09

**Tareas**
- Migraciones `target_companies` y `job_postings` según `docs/architecture.md`.
- Índices únicos: (`user_id`, `source`, `external_id`) y (`user_id`, `source_url`) cuando no son nulos.
- Modelos Lucid `TargetCompany` y `JobPosting`.

**Criterios de aceptación**
- Insertar dos ofertas con la misma fuente e identificador externo falla a nivel de base de datos.

### T-10 — API y extracción de ofertas

- **Tipo:** backend, ai · **Estimación:** 2 h · **Requisitos:** RF-01 a RF-03, RF-05 a RF-07

**Tareas**
- `POST /job-postings/extractions`: recibe el texto y la URL opcional; encola `extract_job_posting`.
- Esquema `job_posting_fields` y prompt `extract_job_posting` v1; los campos ausentes vuelven como `null`, nunca inventados.
- `POST /job-postings` (guardar revisada), `GET /job-postings` (paginado, filtro de estado, orden por puntaje o fecha), `GET` / `PATCH /job-postings/{id}`, `POST /job-postings/{id}/archive`.
- Calcular `content_hash` de la oferta.

**Criterios de aceptación**
- Guardar una oferta duplicada responde `409`.
- Pruebas unitarias del parseo de la respuesta y funcionales de los endpoints.

### T-11 — Pantallas para agregar y listar ofertas

- **Tipo:** frontend · **Estimación:** 1.5 h · **Requisitos:** RF-01, RF-03, RF-06, RF-07

**Tareas**
- Formulario para pegar el texto, progreso de la extracción y formulario de revisión con los campos extraídos (los desconocidos marcados como tales).
- Lista de ofertas con título, empresa, resultado del filtro y puntaje; orden por puntaje o fecha; archivar.

**Criterios de aceptación**
- Cumple los escenarios de HU1 sobre pegar, revisar, guardar y listar.

### T-12 — Empresas objetivo e importación desde Greenhouse

- **Tipo:** backend · **Estimación:** 1.5 h · **Requisitos:** RF-04, RF-05, RF-09, ADR-0002

**Tareas**
- CRUD `/target-companies` con validación de `ats_provider` y `board_token`.
- Interfaz `JobSourceAdapter` y `GreenhouseAdapter` (`boards-api.greenhouse.io/v1/boards/{board_token}/jobs`).
- Conversión local de HTML a Markdown de las descripciones.
- Trabajo `sync_target_company`: trae, normaliza, omite duplicados, guarda, aplica filtros y actualiza `last_synced_at`.
- `POST /target-companies/{id}/sync` devuelve `202` con `jobId`.

**Criterios de aceptación**
- Pruebas del adaptador con respuestas grabadas de Greenhouse; ninguna llamada real en CI.
- Importar dos veces no duplica ofertas.
- `board_token` inexistente: el trabajo termina en `failed` con un mensaje claro.

### T-13 — Pantalla de empresas objetivo

- **Tipo:** frontend · **Estimación:** 0.5 h · **Requisitos:** RF-04, RF-09

**Tareas**
- Lista, alta, edición y baja de empresas objetivo.
- Botón de importar (solo para Greenhouse con `board_token`) con progreso y resultado (ofertas nuevas y omitidas).

**Criterios de aceptación**
- Cumple los escenarios de HU1 sobre empresas objetivo e importación.

---

## HU3 — Filtros duros y puntaje

### T-14 — Tablas de preferencias, filtros y análisis

- **Tipo:** db · **Estimación:** 0.5 h · **Requisitos:** RF-20, RF-21, RF-25, RF-26

**Tareas**
- Migraciones `job_preferences`, `filter_results` y `match_analyses` según `docs/architecture.md`.
- Índice único en `match_analyses.input_hash`.

**Criterios de aceptación**
- Las migraciones se aplican y revierten sin errores.

### T-15 — Preferencias y filtros duros

- **Tipo:** backend · **Estimación:** 1.5 h · **Requisitos:** RF-20 a RF-23

**Tareas**
- `GET` / `PUT /preferences` con validación.
- Servicio puro `evaluateHardFilters(posting, preferences)` que devuelve `pass` / `fail` / `unknown` y el motivo por criterio (modalidad, ubicación, salario, seniority).
- Aplicar los filtros al guardar o importar una oferta y al cambiar las preferencias.
- Encolar `score_match` solo si el resultado es `pass` o `unknown`.

**Criterios de aceptación**
- Pruebas unitarias para cada criterio y combinación (incluido el dato ausente que da `unknown`), con cobertura ≥ 90 % del servicio.

### T-16 — Puntaje de encaje con IA

- **Tipo:** backend, ai · **Estimación:** 2 h · **Requisitos:** RF-23 a RF-28, RNF-06, RNF-07, RNF-09

**Tareas**
- Esquema `match_analysis` (`score`, `label`, `strengths`, `gaps`, `evidence` con fragmentos citados) y prompt `score_match` v1.
- Trabajo `score_match`: calcula `input_hash`; si existe un análisis con ese hash, lo reutiliza; si no, llama a Claude y guarda modelo, versión del prompt y uso de tokens.
- Prefijo estable (prompt de sistema y perfil) marcado para la caché de prompts.
- `POST /job-postings/{id}/match` (incluye ofertas descartadas, a pedido).
- Un reintento ante respuesta inválida; después, `failed` con mensaje claro.

**Criterios de aceptación**
- Pruebas con el doble de prueba: análisis nuevo, reutilización por hash, respuesta inválida y reintento.

### T-17 — Golden set y evals del puntaje

- **Tipo:** ai, test · **Estimación:** 1 h · **Requisitos:** RNF-08, OBJ-2

**Tareas**
- `apps/api/evals/golden-set/`: al menos 10 ofertas reales con la etiqueta esperada asignada a mano.
- Script `pnpm --filter api evals` que calcula el puntaje con el modelo configurado y reporta el porcentaje de acuerdo con la etiqueta esperada.
- Documentar el resultado con los modelos de desarrollo y de producción.

**Criterios de aceptación**
- El reporte muestra el acuerdo por oferta y el total; meta ≥ 80 % con el modelo de producción.

### T-18 — Pantallas de preferencias y detalle del puntaje

- **Tipo:** frontend · **Estimación:** 1 h · **Requisitos:** RF-20, RF-24, RF-27

**Tareas**
- Formulario de preferencias (modalidades en orden, ubicaciones, salario mínimo, seniorities).
- Detalle de la oferta: resultado del filtro por criterio, puntaje, etiqueta, fortalezas, brechas y evidencia; botón para recalcular.

**Criterios de aceptación**
- Cumple los escenarios de HU3 en `docs/user-stories.md`.

---

## HU4 — Pipeline de candidaturas

### T-19 — Candidaturas y su historial

- **Tipo:** db, backend · **Estimación:** 1.5 h · **Requisitos:** RF-30 a RF-35

**Tareas**
- Migraciones `applications` (única por oferta) y `application_events`.
- Servicio de transiciones de estado: `rejected` y `withdrawn` son finales; cualquier estado activo puede pasar a ellos.
- Cada cambio de estado inserta un evento y actualiza `last_activity_at` en la misma transacción.
- Endpoints `GET` / `POST /applications`, `GET /applications/{id}`, `PATCH /applications/{id}/status`, `POST /applications/{id}/notes`.

**Criterios de aceptación**
- Pruebas unitarias de todas las transiciones válidas e inválidas (transición inválida: `422`).
- Pruebas funcionales de los endpoints.

### T-20 — Tablero Kanban accesible

- **Tipo:** frontend · **Estimación:** 2 h · **Requisitos:** RF-30 a RF-35, RNF-13

**Tareas**
- Tablero con columnas por estado activo y acceso a las candidaturas cerradas.
- Mover candidaturas arrastrando y también con el teclado (selector de estado).
- Detalle de la candidatura con oferta, puntaje, estado e historial; agregar notas.
- Botón "crear candidatura" en el detalle de la oferta.

**Criterios de aceptación**
- Cumple los escenarios de HU4, incluido el uso solo con teclado.

---

## Cierre del MVP

### T-21 — Prueba E2E del flujo principal y documentación final

- **Tipo:** test · **Estimación:** 2 h · **Requisitos:** RNF-10, RNF-12, OBJ-4

**Tareas**
- Prueba Playwright: login → pegar oferta → revisar y guardar → ver filtro y puntaje → crear candidatura → moverla a "Applied".
- La prueba corre con `AI_DRIVER=fake` para no depender de la API real.
- Actualizar `readme.md` con la URL de despliegue, credenciales de prueba y pasos de verificación; actualizar `prompts.md`.

**Criterios de aceptación**
- La prueba E2E pasa en CI y contra el entorno local.
- `readme.md` cumple el contenido obligatorio de la entrega final.

---

## Should-have

### T-22 — Clasificación de correos y alertas

- **Tipo:** backend, ai · **Estimación:** 1.5 h · **Requisitos:** RF-40 a RF-43

**Tareas**
- `POST /applications/{id}/emails` y trabajo `classify_email` (esquema y prompt v1): clasificación, fecha relevante, siguiente paso y estado sugerido.
- La sugerencia no cambia el estado; se aplica solo con `PATCH /applications/{id}/status`.
- Cálculo de candidaturas sin actividad según `follow_up_days` de las preferencias.

**Criterios de aceptación**
- Pruebas con el doble de prueba para cada clasificación.

### T-23 — Correos y alertas en la interfaz

- **Tipo:** frontend · **Estimación:** 1.5 h · **Requisitos:** RF-40 a RF-43

**Tareas**
- Formulario para pegar un correo en la candidatura; mostrar la clasificación y la sugerencia con botones de confirmar o descartar.
- Marca de seguimiento en el tablero y campo de días en preferencias.

**Criterios de aceptación**
- Cumple los escenarios de HU5.

### T-24 — Traducción al español y selector de idioma

- **Tipo:** frontend, backend · **Estimación:** 2 h · **Requisitos:** RF-51, RF-52

**Tareas**
- Archivo `locales/es` completo.
- Selector de idioma; guardar `users.locale` con `PATCH /auth/me` y aplicarlo al iniciar sesión.
- Opcional (could-have): generar los análisis de la IA en el idioma elegido.

**Criterios de aceptación**
- Cumple los escenarios de HU6; ninguna cadena sin traducir en español.
