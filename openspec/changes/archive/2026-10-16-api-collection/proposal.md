# Proposal — api-collection

Issue: #29 · Transversal · Colección de la API con Bruno: pruebas manuales y pnpm test:api · Milestone "Entrega 2 - 23 oct" · Sin epic. La guía "recon-tool-v2 doc 10" no está en el repo; este change sigue los puntos dados al pedirlo.

## Why

Hoy la API solo se ejercita con `app.inject` en Vitest y con la UI: no hay una forma rápida, versionada y compartible de lanzar peticiones reales contra el backend levantado (`pnpm dev`) ni de comprobar de un vistazo que auth, catálogo y health siguen respondiendo tras un cambio. Tramo 1 está cerrado (auth + catálogo + health), así que es el momento de fijar la colección antes de que Tramo 2 añada imports y la deuda crezca. Bruno guarda las peticiones como texto plano (`.bru`) dentro del repo, sin cuenta ni nube, y su CLI permite ejecutarla como suite de humo.

## What Changes

- **`@usebruno/cli` como devDependency de la raíz** (`pnpm add -D -w @usebruno/cli`).
- **Colección `api-collection/`** generada **una sola vez** con `bru import openapi` desde `docs/openapi.yaml`; a partir de ahí se mantiene a mano (no se reimporta, para no pisar tests y scripts). Se reorganiza en tres carpetas:
  - `00-auth/` — login, me, refresh, logout (feliz + negativo).
  - `10-smoke/` — una petición feliz y una negativa por endpoint de catálogo y health.
  - `20-flows/` — recorridos encadenados: sesión completa (login → refresh → refresh rotado rechazado → logout → refresh tras logout rechazado) y bajada por el catálogo (merchants → providers → accounts → account → channels).
- **Entorno `local`** con `baseUrl = http://localhost:3000`; credenciales (`SEED_USER`, `SEED_VIEWER_USER`, `SEED_PASSWORD`) en `api-collection/.env`, ignorado por git, con `api-collection/.env.example` versionado.
- **Login automático como `analyst`**: es el usuario principal porque los flujos del tramo 2 exigen `settlement.process`. La colección obtiene el token sola (login con `userName`; el post-response guarda `accessToken`/`refreshToken` en variables de ejecución) y todas las peticiones protegidas usan **auth heredada** de la colección (`Bearer {{accessToken}}`).
- **Segundo login como `viewer`** (`viewerToken`), solo para los casos negativos de alcance (`404`) y de permiso (`403`). Hoy ningún endpoint exige permiso, así que el `403` llegará con el tramo 2. `analyst` ve los dos merchants del seed, por eso el `404` fuera de alcance solo se puede probar con `viewer`.
- **Scripts** en `package.json` de la raíz: `test:api` (colección completa) y `test:api:smoke` (solo `10-smoke`). Los informes que genere la CLI van a `reports/`, que se ignora en git.
- **Reglas para agentes**: sección en `CLAUDE.md` y `AGENTS.md` ("todo endpoint nuevo o cambiado añade su petición feliz y su negativa en la colección; nunca reimportar"); en `.claude/settings.json`, `Bash(pnpm test:api*)` y `Edit(api-collection/**)` en `allow` y `Read(api-collection/.env)` en `deny`.
- **Fuera de alcance**: CI (Entrega 3), endpoints que aún no existen (imports, validaciones, settlement), y el caso `503` de health (exige tirar la base; queda cubierto por `app.test.ts`).

## Capabilities

### New Capabilities

- `api-collection`: colección ejecutable de la API para desarrollo — estructura y fuente, entorno y credenciales locales, autenticación automática, cobertura mínima por endpoint (feliz + negativo) y scripts de ejecución. Es tooling, pero tiene contrato verificable (qué ejecuta `pnpm test:api`, cuándo falla, qué nunca se versiona), por eso lleva spec propia en lugar de `skip_specs`.

### Modified Capabilities

_Ninguna._ La colección consume los contratos de `auth` y `accounts` tal como están en sus specs; no cambia ningún requisito de producto. Las aserciones se derivan de esos escenarios y del seed (`backend/prisma/synthetic.ts`).

## Impact

- **Nuevo**: `api-collection/` (`bruno.json`, `collection.bru`, `environments/local.bru`, `.env.example`, carpetas `00-auth`, `10-smoke`, `20-flows`).
- **Modificado**: `package.json` y `pnpm-lock.yaml` (devDependency y scripts), `.gitignore` (se añade `reports/`; `api-collection/.env` ya lo cubre la regla `.env`, y ambos se comprueban con `git check-ignore`), `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `biome.json` si Biome intenta formatear `api-collection/`.
- **Sin cambios** en backend, frontend, esquema de base de datos ni OpenAPI.
- **Requisito para ejecutar**: base levantada y sembrada (`pnpm db:up`, `pnpm db:seed`) y backend en `pnpm dev`.
