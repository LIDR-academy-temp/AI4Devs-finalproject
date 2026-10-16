# Tasks — api-collection

Issue #29. Rama: `chore/api-collection` (ya creada). PR hacia `feature/entrega-2-MVP` con "Closes #29". Sin cambios de backend, frontend, esquema ni OpenAPI. Referencias: `specs/api-collection/spec.md` (qué), `design.md` D1–D8 (cómo). Para ejecutar la colección hacen falta la base sembrada y el backend levantado; si no lo están, los ejecuta la persona con `! pnpm db:up`, `! pnpm db:seed` y `! pnpm dev` dentro de la sesión. Si la verificación de 1.4 (login automático) falla con la versión instalada de Bruno, parar y proponer el fallback de D3 antes de seguir.

## 1. Dependencia, importación única y login automático

- [x] 1.1 `pnpm add -D -w @usebruno/cli` con versión exacta (sin `^`); verificar `pnpm exec bru --version`
- [x] 1.2 Importar una sola vez: `pnpm exec bru import openapi --source docs/openapi.yaml --output . --collection-name api-collection` (ajustar flags a la versión instalada); verificar que se crea `api-collection/` con `bruno.json` y una petición por cada una de las 14 operaciones de `docs/openapi.yaml`
- [x] 1.3 `api-collection/environments/local.bru` con solo `baseUrl: http://localhost:3000`; todas las URLs como `{{baseUrl}}/api/v1/...`; `api-collection/.env.example` con `SEED_USER=analyst`, `SEED_VIEWER_USER=viewer`, `SEED_PASSWORD=Recon2026!` y el comentario en inglés de que `SEED_PASSWORD` debe coincidir con el del `.env` de la raíz (D2); `reports/` en `.gitignore`; verificar con `git check-ignore -v api-collection/.env reports/` que ambos salen ignorados y que `api-collection/.env.example` no
- [x] 1.4 `collection.bru`: `auth: bearer` con `{{accessToken}}` y pre-request que, sin `accessToken`, ejecuta `00-auth/Login`, y con la variable de petición `as = viewer` y sin `viewerToken`, ejecuta `00-auth/Login as viewer` (D3). `Login.bru`: body con `SEED_USER`/`SEED_PASSWORD`, `auth: none`, post-response `bru.setVar("accessToken"…)` y `bru.setVar("refreshToken"…)`, tests `200` y `accessToken` presente. `Login as viewer.bru`: igual con `SEED_VIEWER_USER`, guarda solo `viewerToken`. Verificar: una petición de catálogo heredada pasa con `cd api-collection && pnpm exec bru run <esa petición> --env local` **sin** ejecutar Login antes; una petición marcada `as = viewer` sale con el token de viewer y la siguiente heredada sigue como `analyst`; con `SEED_PASSWORD` incorrecta la ejecución termina con código ≠ 0
- [x] 1.5 Commit: `chore(api): colección Bruno importada desde OpenAPI con login automático`

## 2. Carpeta 00-auth

- [x] 2.1 Login negativo (`Login - wrong password`): `auth: none`, contraseña fija errónea, tests `401` y `code = invalid_credentials`
- [x] 2.2 Me: feliz (`auth: inherit`, `200`, `userName = analyst`, igual a `process.env.SEED_USER`) y negativo (`auth: none`, `401 unauthorized`)
- [x] 2.3 Refresh: feliz con su propio login como `SEED_USER` en pre-request (`flowRefreshToken`, D4) → `200` y tokens distintos; negativo pasando el `accessToken` compartido como `refreshToken` → `401 invalid_token`
- [x] 2.4 Logout: feliz con su propio par → `204`; repetido con el mismo refresh → `204` (idempotencia)
- [x] 2.5 Verificar `cd api-collection && pnpm exec bru run 00-auth --env local` en verde y que una petición protegida ejecutada después sigue en `200` (la sesión compartida no se invalidó); romper a propósito una aserción una vez, ver el rojo y restaurar
- [x] 2.6 Commit: `test(api): peticiones de auth con caso feliz y negativo`

## 3. Carpeta 10-smoke

- [x] 3.1 Health: `auth: none`, `200`, `status = ok`, `db = ok` (sin negativo, ver spec)
- [x] 3.2 Merchants y Channels (`?unassigned=true`): feliz con `analyst` (merchants `Merchant A` y `Merchant B`; unassigned devuelve los canales sin cuenta según el requisito "Canales sin cuenta" de `openspec/specs/accounts/spec.md`) y negativo `401` sin token
- [x] 3.3 Merchant providers, Provider, Provider channels, Provider accounts: felices con `analyst` (`merchantId = 1`, `providerId = 101`, y `GET /providers/201` → `200`); negativos `404 not_found` fuera de alcance con `as = viewer` (`/providers/201`, `/merchants/2/providers`), `400` (`/providers/abc/channels`) y `404` inexistente con `analyst` (`/providers/999/accounts`)
- [x] 3.4 Account, Account channels, Channel accounts: el `accountId` de `ProviderA-USD` se obtiene en pre-request de `GET /providers/101/accounts` (sin UUID literal, D5); negativos `400` (`/accounts/not-a-uuid`), `404` (UUID aleatorio en `/accounts/{id}/channels`) y `404` (`/channels/999999/accounts`); confirmar cada código esperado contra `openspec/specs/accounts/spec.md` antes de fijarlo
- [x] 3.5 Verificar `cd api-collection && pnpm exec bru run 10-smoke --env local` en verde **sin** pasar por `00-auth`; verificar con `grep -rn "eyJ" api-collection` que no hay tokens versionados
- [x] 3.6 Commit: `test(api): smoke de catálogo y health con caso feliz y negativo`

## 4. Carpeta 20-flows

- [x] 4.1 `20-flows/session`: login propio como `SEED_USER` → refresh `200` → refresh rotado `401 invalid_token` → logout `204` → refresh tras logout `401 invalid_token`, con `seq` para fijar el orden y variables `flow*`
- [x] 4.2 `20-flows/catalog` con `analyst`: merchants (`Merchant A` y `Merchant B`) → providers de 1 (`Provider A`, `Provider B`) → accounts de 101 (localizar `ProviderA-USD`) → detalle de cuenta `200` → canales de la cuenta `200`, pasando IDs con `bru.setVar`
- [x] 4.3 Verificar `cd api-collection && pnpm exec bru run 20-flows --env local` en verde
- [x] 4.4 Commit: `test(api): flujos de sesión y de catálogo encadenados`

## 5. Scripts, lint y reglas para agentes

- [ ] 5.1 `package.json` raíz: `test:api` y `test:api:smoke` (D6); verificar `pnpm test:api` y `pnpm test:api:smoke` en verde con el backend levantado y código ≠ 0 con el backend parado
- [ ] 5.2 Ejecutar `pnpm lint`; si Biome reporta algo en `api-collection/`, excluir la carpeta en `biome.json` (D7); verificar `pnpm lint` en verde y que `pnpm test` (Vitest) no recoge nada de `api-collection/`
- [ ] 5.3 Sección "Colección de la API" idéntica en `CLAUDE.md` y `AGENTS.md` (en español): endpoint nuevo o cambiado ⇒ petición feliz + negativa en la carpeta que toque (negativos de alcance y permiso con `as = viewer`); nunca reimportar desde OpenAPI; prerrequisitos (`db:up`, `db:seed`, `dev`) y `SEED_PASSWORD` igual al de la raíz; comandos `pnpm test:api` y `pnpm test:api:smoke` también en "Comandos"; verificar con `diff` que la sección coincide en ambos
- [ ] 5.4 `.claude/settings.json`: `Bash(pnpm test:api*)` y `Edit(api-collection/**)` en `allow`, `Read(api-collection/.env)` en `deny` (D8); verificar que el JSON es válido (`pnpm lint`); lo edita la persona si el hook o los permisos lo bloquean
- [ ] 5.5 Commit: `chore(api): scripts test:api y reglas de la colección para agentes`

## 6. Verificación integral

- [ ] 6.1 Desde el estado limpio de la rama: copiar `.env.example` a `.env`, `pnpm install`, `pnpm test:api` en verde; abrir la colección en la app de escritorio de Bruno con el entorno `local` y comprobar que una petición de `10-smoke` responde sin login manual
- [ ] 6.2 `openspec validate api-collection --strict` sin errores

## Workflow follow-up

- PR hacia `feature/entrega-2-MVP` con la plantilla y "Closes #29"; CI verde (la colección no corre en CI hasta Entrega 3). `main` no se toca.
- `/opsx:verify` y `/opsx:archive` tras la revisión.
