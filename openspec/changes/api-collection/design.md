# Design — api-collection

## Context

Ver proposal.md (Why). Estado actual relevante:

- `docs/openapi.yaml` (OpenAPI 3.0.3, exportado con `pnpm openapi:export`) lista 14 rutas bajo `/api/v1`: 4 de auth (`login`, `refresh`, `logout`, `me`), 9 de catálogo y `health`. Esquema de seguridad `bearerAuth`.
- Backend en `PORT` 3000 por defecto (`backend/src/config/env.ts`). Health responde `{ status, db }`.
- Usuarios sembrados (`backend/prisma/synthetic.ts`): `admin` (all), `analyst` y `payments` (merchants 1 y 2), `viewer` (merchant 1). Contraseña común `SEED_PASSWORD`, por defecto `Recon2026!` (`backend/prisma/seed.ts`). UUID de cuentas deterministas pero no documentados como contrato.
- El seed tiene solo dos merchants (1 y 2). `analyst` los ve los dos, así que no hay ningún recurso fuera de su alcance; `viewer` solo ve el merchant 1.
- Ninguna ruta actual usa `requirePermission`: el catálogo solo pide autenticación. Los primeros `403` posibles llegan con el tramo 2.
- `.gitignore` ya ignora `.env` y `.env.*` en cualquier carpeta y re-incluye `.env.example`, así que `api-collection/.env` queda ignorado sin tocar nada. `reports/` no está ignorado.
- `.claude/settings.json` deniega `Read(.env)`; el patrón no cubre de forma explícita subcarpetas.
- Issue #29. La guía "doc 10" no está disponible; las decisiones siguientes salen de los puntos dados al pedir el change.

## Goals / Non-Goals

**Goals:**
- Una colección que corre igual desde la app de escritorio de Bruno y desde `bru run`, sin pasos manuales previos (login incluido).
- Que `10-smoke` sea autosuficiente para usarse como comprobación rápida tras cada cambio de backend.

**Non-Goals:**
- Sincronización automática OpenAPI → colección (se descarta a propósito: ver D1).
- Entornos distintos de `local` (staging, CI): llegarán con Entrega 3.
- Pruebas de rendimiento o de expiración del token de 15 minutos.

## Decisions

**D1 — Importar una vez y mantener a mano.** `bru import openapi --source docs/openapi.yaml --output . --collection-name api-collection` genera el esqueleto (una petición por operación, agrupadas por tag). Se mueve cada petición a su carpeta (`00-auth`, `10-smoke`), se duplican las que necesitan caso negativo y se borra lo sobrante. Reimportar sobrescribiría tests y scripts, por eso la regla "nunca reimportar". *Alternativa*: regenerar en cada cambio de OpenAPI y mantener los tests aparte → Bruno no separa tests de la petición en `.bru`, así que no es viable. *Alternativa*: escribir los `.bru` a mano desde cero → más trabajo y más fácil equivocarse en rutas; el import garantiza que método y ruta salen del contrato.

**D2 — Credenciales por `process.env` del `.env` de la colección.** Bruno carga `api-collection/.env` y expone sus claves como `{{process.env.SEED_USER}}`, `{{process.env.SEED_VIEWER_USER}}` y `{{process.env.SEED_PASSWORD}}`. El entorno `environments/local.bru` solo lleva `baseUrl` (no secreto, versionado). `.env.example` trae `SEED_USER=analyst`, `SEED_VIEWER_USER=viewer` y `SEED_PASSWORD=Recon2026!` (valores sintéticos, ya públicos en `seed.ts`), con un comentario en inglés: `SEED_PASSWORD` debe coincidir con el del `.env` de la raíz, porque es la contraseña con la que `pnpm db:seed` crea los usuarios. Los nombres de las claves son los mismos que en la raíz a propósito. *Alternativa*: variables secretas del entorno de Bruno → se guardan cifradas solo en la app de escritorio y `bru run` no las ve sin flags extra.

**D3 — Dos usuarios, login automático en el pre-request de la colección.** El usuario principal es `analyst`: los flujos del tramo 2 exigen `settlement.process` y no tiene sentido cambiar de usuario después. `viewer` solo se usa en los negativos: `404` fuera de alcance hoy, `403` por permiso cuando existan rutas con `requirePermission`. Mecanismo:
- `collection.bru` declara `auth: bearer` con `{{accessToken}}` y un pre-request que, si la petición no es anónima y no hay `accessToken` en variables de ejecución, lanza `00-auth/Login` (`bru.runRequest`). El post-response de `Login` guarda `accessToken` y `refreshToken` con `bru.setVar` (en memoria, nunca en disco).
- Si la petición declara que necesita a viewer (`bru.getRequestVar('as') === 'viewer'`, una variable de petición) y no hay `viewerToken`, el mismo pre-request lanza `00-auth/Login as viewer`, cuyo post-response guarda solo `viewerToken`. Esas peticiones declaran `auth: bearer` con `{{viewerToken}}` y no heredan.
- Las protegidas usan `auth: inherit`; las anónimas (`login`, `refresh`, `logout`, `health`) y los negativos `401` declaran `auth: none`.

*Alternativa*: depender del orden (`00-auth` primero) → rompe `pnpm test:api:smoke`, que solo ejecuta `10-smoke`. *Alternativa*: un `viewerToken` fijo en cada petición negativa → repite el login y lo dispersa. *Fallback* si `bru.runRequest` o las variables de petición no están disponibles en la versión instalada: `bru.sendRequest` con el cuerpo de login en el propio script, y marcar las peticiones de viewer por su nombre o carpeta.

**D4 — Los flujos de sesión usan su propio par.** Refresh y logout invalidan el refresh usado; si tocaran el par compartido de `analyst`, las peticiones siguientes fallarían. Las peticiones de `00-auth/refresh`, `00-auth/logout` y `20-flows/session` hacen su propio login como `SEED_USER` y guardan el par en variables con prefijo (`flowAccessToken`, `flowRefreshToken`). El access token compartido sigue siendo válido porque logout solo revoca el refresh (spec `auth`, "Cierre de sesión"). `viewerToken` no se usa en estos flujos.

**D5 — Aserciones mínimas y del contrato.** Cada petición comprueba `res.status` y, en errores, `res.body.code`; en felices, una o dos propiedades estables del seed (`userName = analyst`, `Merchant A` y `Merchant B`, `status = "ok"`). No se validan cuerpos completos ni UUID literales: los IDs de cuenta se obtienen por nombre (`ProviderA-USD`) de `GET /providers/101/accounts`. Negativos elegidos por ruta:
- `401` sin token en los listados sin parámetro (`/merchants`, `/channels`).
- `400` con ID mal formado (`/accounts/not-a-uuid`, `/providers/abc`).
- `404 not_found` para lo inexistente con `analyst` (`/merchants/999/providers`, UUID aleatorio).
- `404 not_found` fuera de alcance con `viewerToken` (`/providers/201`, `/merchants/2/providers`); la misma ruta con `analyst` responde `200` en su caso feliz.

**D6 — Scripts multiplataforma.** `bru run` necesita ejecutarse desde la raíz de la colección. En `package.json`:
- `"test:api": "cd api-collection && bru run --env local"`
- `"test:api:smoke": "cd api-collection && bru run 10-smoke --env local"`

`cd x && y` funciona en el shell que usa pnpm tanto en Windows (cmd) como en POSIX. `bru run` devuelve código distinto de cero si falla una aserción o una petición. Cualquier informe que genere la CLI (`--output`/`--reporter-*`, hoy no se usa; llegará con CI en Entrega 3) va a `reports/`, que se añade a `.gitignore` desde ya.

**D7 — Biome no toca la colección.** Los `.bru` no son JS/JSON, pero `bruno.json` sí. Si `pnpm lint` reporta algo en `api-collection/`, se excluye la carpeta en `biome.json` en lugar de reformatear archivos que gestiona Bruno.

**D8 — Reglas de agente.** Nueva sección "Colección de la API" en `CLAUDE.md` y `AGENTS.md` (texto idéntico) y una línea en "Comandos". En `.claude/settings.json`: `"Bash(pnpm test:api*)"` en `allow` (ya lo cubre `Bash(pnpm test*)`, pero se deja explícito como pide el issue) y `"Read(api-collection/.env)"` en `deny`. También `"Edit(api-collection/**)"` en `allow` para que el agente mantenga la colección sin pedir permiso en cada archivo.

## Risks / Trade-offs

- [La versión de `@usebruno/cli` cambia la API de scripts (`bru.runRequest`, `bru.setVar`) o la ruta del `.env`] → fijar la versión exacta en `package.json` y verificar D3 en la primera tarea antes de escribir el resto.
- [El import de OpenAPI genera nombres o estructura que no encajan con las carpetas] → es un paso único; se reorganiza a mano y se revisa en el PR.
- [La colección deriva del contrato con el tiempo] → mitigado por la regla en `CLAUDE.md`/`AGENTS.md` y por la revisión del PR; la detección automática queda para CI (Entrega 3).
- [`pnpm test:api` falla porque la base no está sembrada o el backend no está levantado] → el mensaje de fallo de `bru` lo deja claro; la sección de `CLAUDE.md` lista los prerrequisitos.
- [`SEED_PASSWORD` del `.env` de la colección distinto del de la raíz] → el login falla con `401 invalid_credentials` y la ejecución termina en rojo; el comentario de `.env.example` lo explica.
- [Login en cada ejecución genera filas de auditoría (`auth` "Auditoría de intentos de login")] → aceptable en local; es el comportamiento real.

## Migration Plan

No hay despliegue. Rollback: borrar `api-collection/`, quitar la devDependency y los scripts, y revertir las secciones de `CLAUDE.md`, `AGENTS.md` y `.claude/settings.json`.

