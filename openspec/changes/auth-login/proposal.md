# Proposal — auth-login

Issue: #1 · T1 · Login con JWT, `GET /auth/me` y plugin de permisos · Historia HU0 (acceso) · Tramo 1.

## Why

El tramo 0 dejó en la base roles, permisos y cuatro usuarios sintéticos (`admin`, `analyst`, `payments`, `viewer`) con contraseña Argon2, pero no existe aún un servidor HTTP ni forma de autenticarse. Todos los endpoints del MVP (README §4: `Authorization: Bearer <JWT>` salvo `POST /auth/login`) y el aislamiento por merchant (§2.5) dependen de que el backend sepa quién llama, con qué permisos y qué merchants ve. Sin esto ningún otro módulo puede proteger sus rutas.

## Secciones del README que implementa

- **§2.5 Seguridad**: "Perfiles y permisos" (códigos de permiso por acción), "Aislamiento por merchant" (alcance `assigned` / `all`; sin asignaciones no hay acceso global), "Autenticación y autorización" (Argon2, JWT de acceso de corta duración con refresh, permisos resueltos en el backend en cada petición), "Trazabilidad" (login en `AuditLog`).
- **§3.2 Acceso y auditoría**: `User` (`userName`, `passwordHash`, `roleId`, `merchantScope`, `isActive`), `Role`, `RolePermission`, `UserMerchant`, `AuditLog`.
- **§4 Convenciones comunes**: prefijo `/api/v1`, bearer token, cuerpo de error uniforme `{ code, message, details? }`, `401` sin sesión / `403` sin permiso, OpenAPI publicado en `/docs`.
- **§4.4 Inventario, filas Auth y Sistema**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /health`.

## What Changes

- **Arranque del backend** (hoy `backend/src` solo tiene el cliente Prisma generado): aplicación Fastify 5 construida por una factoría `buildApp()` (testeable con `inject`) y un `server.ts` que la escucha; logger de Fastify (pino) con redacción de `authorization`, `password` y tokens; plugin de Prisma con `@prisma/adapter-mssql` que reutiliza las mismas variables de conexión que `prisma.config.ts` y `seed.ts`; manejador de errores con el cuerpo uniforme; `GET /api/v1/health` con estado del servicio y de la base.
- **Módulo `auth`** con estructura hexagonal `backend/src/modules/auth/{domain,application,infrastructure,http}`:
  - `POST /api/v1/auth/login` → `accessToken` (15 min) y `refreshToken` (7 días) firmados con `JWT_SECRET`.
  - `POST /api/v1/auth/refresh` → rota el par: emite uno nuevo y revoca el refresh usado.
  - `POST /api/v1/auth/logout` → revoca el refresh; deja de servir.
  - `GET /api/v1/auth/me` → usuario, rol, permisos, `merchantScope` y merchants visibles.
  - Decorador reutilizable `requirePermission('<permissionCode>')` como `preHandler` de Fastify: `401` sin token o con token inválido, `403` si el rol no tiene el permiso; el handler no se ejecuta en ninguno de los dos casos.
  - Registro en `AuditLog` de `auth.login.success` y `auth.login.failure` (sin contraseña ni hash).
- **Esquema** (migración `0003_auth`, revisada antes de aplicar):
  - Tabla nueva `RefreshToken` (`tokenId` = `jti` del JWT, `userId`, `expiresAt`, `revokedAt`, `createdAt`) para que la revocación sobreviva reinicios.
  - `AuditLog.userId` pasa a admitir `NULL` para auditar intentos con un `userName` inexistente.
- **`packages/shared`**: esquemas Zod de request/response de auth (`LoginRequest`, `TokenPair`, `RefreshRequest`, `MeResponse`, `ErrorResponse`, `MerchantScope`).
- **OpenAPI** generado desde los esquemas Zod con `@fastify/swagger` y servido en `/docs`.
- **Configuración**: `JWT_SECRET` (obligatorio, mínimo 32 caracteres; el servidor no arranca sin él) en `.env.example` y en el job de integración de CI.

## Capabilities

### New Capabilities

- `auth`: autenticación de usuarios con JWT de acceso y refresh, cierre de sesión, consulta de la identidad y autorización por permiso de las rutas del API, más la auditoría de los intentos de login. Futuras capacidades de acceso (administración de usuarios, alcance por merchant en cada módulo) añadirán requisitos aquí.

### Modified Capabilities

_Ninguna._ `GET /health` y el arranque del servidor son infraestructura sin requisitos de producto propios; se cubren en design y tasks.

## Escenarios de aceptación (del issue #1)

1. **Login correcto** — *Dado* un usuario activo y su contraseña correcta, *cuando* llama a `POST /auth/login`, *entonces* recibe `accessToken` y `refreshToken`, y `GET /auth/me` con ese token devuelve su rol y permisos.
2. **Credenciales rechazadas** — *Dado* una contraseña incorrecta o un usuario inactivo, *cuando* llama a login, *entonces* recibe `401` con el mismo mensaje genérico en ambos casos.
3. **Ruta protegida** — *Dado* un endpoint protegido con `requirePermission`, *cuando* se llama sin token o con un rol sin ese permiso, *entonces* responde `401` / `403` sin ejecutar el handler.
4. **Refresh y logout** — *Dado* un refresh token válido, *cuando* llama a `POST /auth/refresh`, *entonces* obtiene un nuevo par; tras `logout` ese refresh deja de servir.

La versión normativa, con los casos límite, está en `specs/auth/spec.md`.

## Archivos que se crean o modifican

Nuevos:

```
backend/src/app.ts                                   buildApp(): plugins, rutas, error handler, swagger
backend/src/server.ts                                arranque: carga .env, buildApp().listen()
backend/src/config/env.ts                            lectura y validación Zod de variables de entorno
backend/src/infrastructure/db.ts                     mssqlConfigFromEnv(): mismas DB_* que prisma.config.ts y seed.ts
backend/src/plugins/prisma.ts                        PrismaClient + PrismaMssql decorado como app.prisma
backend/src/plugins/error-handler.ts                 cuerpo uniforme { code, message, details? }
backend/src/routes/health.ts                         GET /api/v1/health
backend/src/modules/auth/domain/permissions.ts       hasPermission(), tipos de AuthUser
backend/src/modules/auth/domain/errors.ts            InvalidCredentialsError, UnauthorizedError, ForbiddenError
backend/src/modules/auth/application/ports.ts        UserRepository, RefreshTokenStore, AuditLogger, PasswordHasher, TokenSigner, Clock
backend/src/modules/auth/application/auth-service.ts login, refresh, logout, me
backend/src/modules/auth/infrastructure/prisma-user-repository.ts
backend/src/modules/auth/infrastructure/prisma-refresh-token-store.ts
backend/src/modules/auth/infrastructure/prisma-audit-logger.ts
backend/src/modules/auth/infrastructure/argon2-password-hasher.ts
backend/src/modules/auth/infrastructure/jwt-token-signer.ts
backend/src/modules/auth/http/auth-plugin.ts         authenticate + requirePermission (decoradores Fastify)
backend/src/modules/auth/http/auth-routes.ts         /auth/login, /auth/refresh, /auth/logout, /auth/me
backend/src/modules/auth/**/*.test.ts                unitarios (servicio, firmador, plugin)
backend/test/integration/auth.int.test.ts            login/refresh/logout/me contra SQL Server
backend/test/integration/health.int.test.ts
backend/vitest.config.ts                             proyectos unit / integration
backend/prisma/migrations/0003_auth/migration.sql    RefreshToken + AuditLog.userId NULL
packages/shared/src/auth.ts                          esquemas Zod de auth
```

Modificados: `backend/prisma/schema.prisma`, `backend/prisma/seed.ts` (vaciar `RefreshToken` antes de `User`), `biome.json` (`noConsole` en `backend/src`), `backend/package.json` (dependencias y script `dev` → `src/server.ts`), `packages/shared/src/index.ts` (re-export), `.env.example` (`JWT_SECRET`), `.github/workflows/ci.yml` (`JWT_SECRET` y quitar `continue-on-error` del job de integración), `openspec/specs/auth/spec.md` (al archivar).

## Fuera de alcance

Pantalla y API de administración de usuarios (`/users`), recuperación de contraseña, MFA, bloqueo por intentos fallidos / rate limiting, pantalla de login del frontend, filtrado por merchant en los demás módulos (este change solo expone los merchants visibles en `/auth/me` y en la petición autenticada).

## Impact

- **API**: nace el prefijo `/api/v1` con 5 rutas; `/docs` publica el contrato.
- **Base de datos**: una migración con tabla nueva y un cambio de nulabilidad (no destructivo). Requiere confirmación antes de aplicarse (CLAUDE.md, paso 4).
- **Dependencias nuevas (backend)**: `@fastify/jwt`, `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-type-provider-zod`, `fastify-plugin`, `@recon/shared` (workspace).
- **CI**: el job de integración deja de ser opcional y necesita `JWT_SECRET`.
- **Resto de módulos**: a partir de aquí protegen sus rutas con `app.requirePermission(...)` y leen `request.user`.
