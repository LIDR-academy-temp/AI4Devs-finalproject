# Tasks — auth-login

Orden test-first: en cada grupo con lógica, el test se escribe y se ve fallar (rojo) antes del código; una vez en verde se rompe el código a propósito para comprobar que el test lo detecta, y se restaura. Rama: `feat/auth-login`.

## 1. Dependencias y configuración de tests

- [ ] 1.1 Añadir a `backend` `@fastify/jwt`, `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-plugin`, `fastify-type-provider-zod` (versión con soporte Zod 4) y `@recon/shared` (`workspace:*`); verificar con `pnpm install` y `pnpm typecheck` en verde
- [ ] 1.2 Crear `backend/vitest.config.ts` con proyectos `unit` (`src/**/*.test.ts`) e `integration` (`test/integration/**/*.int.test.ts`); hacer que `pnpm test` ejecute solo `unit`; verificar con `pnpm --filter @recon/backend test` (pasa sin tests) y `vitest --project integration --passWithNoTests`
- [ ] 1.3 Activar `suspicious/noConsole: error` en `biome.json` para `backend/src` (excluyendo `src/generated`); verificar que `pnpm lint` falla con un `console.log` temporal y pasa al quitarlo

## 2. Esquemas compartidos

- [ ] 2.1 Test (rojo) en `packages/shared/src/auth.test.ts`: `LoginRequest` rechaza `userName`/`password` vacíos o ausentes; `MeResponse` acepta el `me` de `viewer` y rechaza un `permissions` con un código fuera de `PermissionCode`; `MerchantScope` solo admite `assigned`/`all`
- [ ] 2.2 Implementar `packages/shared/src/auth.ts` (`LoginRequest`, `TokenPair`, `RefreshRequest`, `MeResponse`, `ErrorResponse`, `MerchantScope`) y re-exportar desde `index.ts`; verificar test 2.1 en verde y `pnpm typecheck`

## 3. Entorno y arranque mínimo del servidor

- [ ] 3.1 Test (rojo) `src/config/env.test.ts`: sin `JWT_SECRET` o con < 32 caracteres `loadEnv` lanza un error que menciona `JWT_SECRET` y no contiene el valor; con valores válidos aplica defaults de `PORT`, `HOST`, `LOG_LEVEL` (spec "Secreto de firma obligatorio")
- [ ] 3.2 Implementar `src/config/env.ts` (Zod) y `src/infrastructure/db.ts` (`mssqlConfigFromEnv`, mismas `DB_*` y opciones que `seed.ts`); verificar test 3.1 en verde
- [ ] 3.3 Test (rojo) `src/plugins/error-handler.test.ts` con una app Fastify mínima: errores de validación → `400 validation_error` con `details`; `UnauthorizedError` → `401 unauthorized`; `ForbiddenError` → `403 forbidden`; `InvalidCredentialsError`/`InvalidTokenError` → `401` con su código; error genérico → `500 internal_error` sin stack
- [ ] 3.4 Implementar `modules/auth/domain/errors.ts` y `plugins/error-handler.ts`; verificar test 3.3 en verde
- [ ] 3.5 Implementar `plugins/prisma.ts` (decora `app.prisma`, `$disconnect` en `onClose`, acepta cliente inyectado), `routes/health.ts`, `app.ts` (`buildApp`: logger con `redact`, type provider Zod, swagger + `/docs`, prefijo `/api/v1`) y `server.ts`; cambiar script `dev` a `tsx watch src/server.ts`; verificar con test unitario `app.test.ts` que `GET /api/v1/health` con un Prisma falso responde `200 {status:"ok",db:"ok"}` y `503` cuando `$queryRaw` falla, y que `GET /docs/json` devuelve un OpenAPI 3 con la ruta de health
- [ ] 3.6 Test de integración `test/integration/health.int.test.ts`: `buildApp` real contra SQL Server responde `200` en `/api/v1/health`; verificar en local con `pnpm db:up` y `vitest --project integration`

## 4. Esquema de base de datos (requiere confirmación humana)

- [ ] 4.1 **Parar y pedir confirmación.** Editar `schema.prisma`: modelo `RefreshToken` (D5) y `AuditLog.userId Int?`; generar `prisma/migrations/0003_auth/migration.sql` con `prisma migrate dev --create-only` contra la base local; presentar el SQL para revisión y no aplicarlo sin aprobación
- [ ] 4.2 Tras la aprobación: aplicar con `pnpm db:migrate`, ajustar `seed.ts` para vaciar `RefreshToken` antes de `User` y regenerar el cliente; verificar que `pnpm db:seed` corre dos veces seguidas sin error y `pnpm typecheck` pasa

## 5. Dominio y servicio de aplicación de auth

- [ ] 5.1 Test (rojo) `domain/permissions.test.ts`: `hasPermission` true/false según el set del rol; los permisos sembrados de `viewer` no incluyen `settlement.process` y los de `admin` incluyen los siete
- [ ] 5.2 Implementar `domain/permissions.ts` (`AuthContext`, `hasPermission`); verificar 5.1 en verde
- [ ] 5.3 Definir `application/ports.ts` (`UserRepository`, `RefreshTokenStore`, `AuditLogger`, `PasswordHasher`, `TokenSigner`, `Clock`) y dobles en memoria en `application/__fakes__/`; verificar `pnpm typecheck`
- [ ] 5.4 Test (rojo) `application/auth-service.test.ts` — login: credenciales correctas devuelven par y auditan `auth.login.success`; contraseña mala, usuario inactivo e inexistente lanzan `InvalidCredentialsError` y auditan `auth.login.failure` con `reason` `bad_password`/`inactive`/`unknown_user` y `userId` null en el inexistente; el hasher se invoca también para inexistente e inactivo (D7); la contraseña no aparece en ningún registro de auditoría; un fallo del `AuditLogger` no cambia el resultado
- [ ] 5.5 Test (rojo) en el mismo archivo — refresh/logout: refresh válido rota (revoca el `jti` usado, guarda el nuevo); reutilizar un refresh rotado, uno revocado, uno caducado (con `Clock` falso), uno de usuario inactivo o un access token lanza `InvalidTokenError`; logout revoca y es idempotente (sin error con token revocado, caducado o basura)
- [ ] 5.6 Test (rojo) en el mismo archivo — `me`: con scope `assigned` devuelve solo los merchants de `UserMerchant` (vacío si no hay, nunca todos); con scope `all` devuelve todos
- [ ] 5.7 Implementar `application/auth-service.ts` (login, refresh, logout, me); verificar 5.4–5.6 en verde y romper a propósito la comparación de `typ` para ver fallar el caso "access token usado como refresh"

## 6. Adaptadores de infraestructura

- [ ] 6.1 Test (rojo) `infrastructure/jwt-token-signer.test.ts`: access caduca a 900 s y refresh a 7 días con `jti` UUID; `verify(token, 'refresh')` rechaza un access y viceversa; rechaza firma con otro secreto y token caducado; el payload no contiene rol ni permisos
- [ ] 6.2 Implementar `jwt-token-signer.ts` y `argon2-password-hasher.ts` (incluido el hash ficticio precalculado); verificar 6.1 en verde
- [ ] 6.3 Implementar `prisma-user-repository.ts` (`findByUserName`, `findAuthContext` con rol, permisos y merchants según scope en una consulta), `prisma-refresh-token-store.ts` (`UPDATE … WHERE revokedAt IS NULL` y comprobación de filas afectadas en la rotación) y `prisma-audit-logger.ts`; se verifican en el grupo 8 contra SQL Server

## 7. Capa HTTP: plugin de permisos y rutas

- [ ] 7.1 Test (rojo) `http/auth-plugin.test.ts` con `buildApp` y servicio/repositorio falsos y una ruta de prueba `GET /__test/protected` con `requirePermission('settlement.process')` y un handler espía: sin cabecera → 401 `unauthorized` y espía no llamado; token mal firmado, caducado o refresh → 401; usuario inactivo → 401; `viewer` → 403 `forbidden` y espía no llamado; `analyst` → 200 y espía llamado una vez
- [ ] 7.2 Implementar `http/auth-plugin.ts` (`authenticate`, `requirePermission(code: PermissionCode)`, tipado de `request.auth`); verificar 7.1 en verde y romper a propósito el orden `authenticate`→`check` para ver fallar el caso 401/403
- [ ] 7.3 Test (rojo) `http/auth-routes.test.ts` con `inject`: login 200 con forma `TokenPair`; 400 `validation_error` con cuerpo incompleto; los tres 401 de credenciales tienen cuerpos idénticos (`expect(a.body).toBe(b.body)`); refresh 200/401; logout 204 dos veces; `me` 200 con forma `MeResponse` y 401 sin token; el logger capturado no contiene la contraseña ni el token
- [ ] 7.4 Implementar `http/auth-routes.ts` y registrar el módulo en `app.ts` bajo `/api/v1/auth`; verificar 7.3 en verde y que `/docs/json` lista las cuatro rutas con `bearerAuth` en `/auth/me`

## 8. Integración contra SQL Server y CI

- [ ] 8.1 Escribir `test/integration/auth.int.test.ts` sobre la base sembrada (con `upsert` de `inactive_test` en `beforeAll` y limpieza de sus filas de `User`, `AuditLog` y `RefreshToken` en `afterAll`) que cubra los cuatro criterios del issue: (1) `analyst` login → `me` con rol y permisos; (2) contraseña mala e `inactive_test` → 401 con el mismo cuerpo; (3) ruta de prueba con `requirePermission` sin token → 401 y con `viewer` → 403; (4) refresh devuelve par nuevo, el anterior ya no sirve, y tras logout el último tampoco; además, filas `auth.login.success`/`failure` en `AuditLog` (una con `userId NULL` para `ghost`) sin la contraseña en `detailJson`; verificar en local con `vitest --project integration`
- [ ] 8.2 Añadir `JWT_SECRET` a `.env.example` (valor de ejemplo marcado como no secreto) y al job `integration` de `.github/workflows/ci.yml`; quitar `continue-on-error`; verificar con `pnpm lint && pnpm typecheck && pnpm test` en local y CI verde en el PR
- [ ] 8.3 Prueba manual: `pnpm dev`, `curl` a `/api/v1/health`, login con `admin`, `me` con el token, abrir `/docs`; anotar el resultado en el PR

## Workflow follow-up

- `/opsx:verify` para contrastar implementación y artifacts.
- PR desde `feat/auth-login` hacia `feature/entrega-2-MVP` con la plantilla, citando §2.5, §3.2, §4 y §4.4, issue #1.
- `/opsx:archive` tras el merge: crea `openspec/specs/auth/spec.md`.
