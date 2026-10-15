# Design — auth-login

## Context

- `backend/src` solo contiene el cliente Prisma generado (`src/generated/prisma`). No hay servidor, ni `vitest.config`, ni tests. El script `dev` apunta a `src/main.ts`, que no existe.
- El esquema ya tiene `User`, `Role`, `RolePermission`, `UserMerchant`, `AuditLog` (migración `0001_init`). `AuditLog.userId` es `NOT NULL` con FK, y no hay dónde guardar refresh tokens.
- `prisma.config.ts` y `prisma/seed.ts` construyen la conexión a partir de `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `RECON_APP_PASSWORD` (el CLI usa además `DATABASE_URL` si existe). El seed crea un `PrismaMssql` con esas variables y `encrypt: true, trustServerCertificate: true`.
- El seed deja cuatro usuarios activos (`admin` scope `all`; `analyst`, `payments` merchants 1–2; `viewer` merchant 1) con `argon2.hash(SEED_PASSWORD)`. No hay usuario inactivo.
- CI: job `check` (lint, typecheck, `pnpm test`) sin base y job `integration` con SQL Server, migración y seed, que corre `vitest --project integration` hoy con `continue-on-error`.
- Motivación y alcance: ver `proposal.md`. Requisitos: ver `specs/auth/spec.md`.

## Goals / Non-Goals

**Goals:**
- Un esqueleto de servidor que el resto de módulos copie: `buildApp()` sin efectos secundarios, plugins con `fastify-plugin`, rutas con type provider Zod, errores uniformes.
- Dominio y aplicación de `auth` sin dependencias de Fastify ni Prisma, testeables con dobles en memoria.
- Un único punto (`app.requirePermission`) para proteger rutas.

**Non-Goals:**
- Filtrar por merchant en otros módulos (cada módulo usará `request.auth.merchantIds` cuando exista).
- Rate limiting, bloqueo de cuentas, detección de reutilización de refresh con revocación de familia.
- Cookies httpOnly: los tokens viajan en el cuerpo y en `Authorization`; el frontend decide dónde guardarlos.

## Decisions

### D1. Factoría `buildApp(options)` + `server.ts`
`app.ts` exporta `buildApp({ env, prisma? })` que registra plugins y rutas y devuelve la instancia sin escuchar. `server.ts` carga `.env` de la raíz (como `prisma.config.ts`), valida el entorno y llama a `listen`. Los tests usan `app.inject()`.
El script `dev` pasa a `tsx watch src/server.ts`. *Alternativa*: mantener `main.ts`; se descarta porque la petición nombra `server.ts` y no hay nada que conservar.

### D2. Entorno validado con Zod (`config/env.ts`)
`loadEnv(process.env)` devuelve un objeto tipado: `JWT_SECRET` (string ≥ 32), `PORT` (por defecto 3000), `HOST` (`0.0.0.0`), `LOG_LEVEL` (`info`), y las `DB_*`. Un fallo lanza un error que lista los nombres de variable inválidos, nunca sus valores. Esto cumple el requisito "Secreto de firma obligatorio".

### D3. Plugin de Prisma reutilizando la conexión del tramo 0
`plugins/prisma.ts` crea `new PrismaClient({ adapter: new PrismaMssql({...}) })` con las mismas variables y opciones que `seed.ts`, lo decora como `app.prisma` y lo desconecta en `onClose`. La construcción de la configuración del adaptador se extrae a una función `mssqlConfigFromEnv(env)` en `src/infrastructure/db.ts` que también podrá importar el seed (no se modifica el seed en este change).
`DATABASE_URL` no se usa en runtime: el adaptador mssql recibe un objeto de configuración, no una URL, y en CI las `DB_*` ya están definidas. *Alternativa*: parsear `DATABASE_URL`; se descarta por duplicar el formato JDBC-like de SQL Server sin necesidad.
`buildApp` acepta un `prisma` inyectado para que los tests de integración compartan cliente.

### D4. JWT con `@fastify/jwt`, verificación propia de tipo
Se usa `@fastify/jwt` (HS256, `JWT_SECRET`) a través del puerto `TokenSigner`, para que la aplicación no dependa de la librería. Claims:
- access: `{ sub: userId, typ: "access", jti: uuid }`, `exp` 15 min. El `jti` no se guarda ni se comprueba: solo hace único cada token (sin él, dos access emitidos en el mismo segundo serían idénticos y un refresh devolvería el mismo access).
- refresh: `{ sub: userId, typ: "refresh", jti: uuid }`, `exp` 7 días.
El verificador rechaza un token cuyo `typ` no sea el esperado; así un refresh no sirve como access ni al revés. Los tokens **no** llevan rol ni permisos: README §2.5 exige resolverlos en cada petición, y así un cambio de rol o una desactivación tienen efecto inmediato.
*Alternativa*: `jose` directamente; equivalente, pero `@fastify/jwt` ya integra `request.jwtVerify` y el manejo de cabecera.

### D5. Refresh tokens persistidos en `RefreshToken` con rotación
Tabla nueva (decidido con el usuario):

```
RefreshToken
  tokenId   UNIQUEIDENTIFIER PK   -- = jti
  userId    INT NOT NULL FK User
  expiresAt DATETIME2 NOT NULL
  revokedAt DATETIME2 NULL
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  INDEX (userId, revokedAt)
```

- login: inserta fila con el `jti` del refresh emitido.
- refresh: verifica firma y `typ`, busca la fila por `jti`; si falta, está revocada o caducada, o el usuario está inactivo → `invalid_token`. Si vale, en una transacción marca `revokedAt = now` (`UPDATE … WHERE tokenId = @jti AND revokedAt IS NULL`; si afecta 0 filas, otra petición ganó la carrera → `invalid_token`) e inserta el nuevo.
- logout: verifica firma ignorando `exp` cuando sea posible; si obtiene `jti`, hace el mismo `UPDATE`. Cualquier fallo responde `204` igualmente (idempotente).
Se guarda solo el `jti`, no el token: robar la tabla no da tokens usables.
*Alternativas*: `User.tokenVersion` (cierra todas las sesiones a la vez, sin rotación) y denylist en memoria (se pierde al reiniciar). Descartadas con el usuario.

### D6. `AuditLog.userId` nullable
Migración `ALTER COLUMN userId INT NULL` (la FK se conserva). Permite auditar intentos con `userName` inexistente (decidido con el usuario). Acciones: `auth.login.success`, `auth.login.failure`; `entityType = "User"`, `entityId = String(userId)` o el `userName` intentado cuando no hay usuario; `detailJson = { userName, reason?, ip }`. Refresh y logout no se auditan (volumen alto, poco valor; se pueden añadir sin cambiar el esquema).
La auditoría se escribe con `await` pero su fallo no cambia la respuesta de login: se registra con `log.error` y se continúa (un fallo de auditoría no debe convertir un 401 en 500 ni filtrar información).

### D7. Respuesta genérica y tiempo constante en login
El servicio devuelve un error de dominio `InvalidCredentialsError` con un `reason` interno (`bad_password` | `inactive` | `unknown_user`) que solo va a la auditoría; el handler HTTP lo mapea siempre al mismo cuerpo `401`. Para `unknown_user` se verifica la contraseña contra un hash Argon2 ficticio precalculado al arrancar, para igualar tiempos. Para `inactive` también se verifica la contraseña antes de rechazar.

### D8. Plugin de autorización (`http/auth-plugin.ts`)
Plugin con `fastify-plugin` que decora:
- `app.authenticate`: `preHandler` que verifica el access token, carga el usuario con rol, permisos y merchants (`UserRepository.findAuthContext(userId)`) y fija `request.auth: AuthContext = { userId, userName, role, permissions: Set<PermissionCode>, merchantScope, merchantIds }`. Si algo falla lanza `UnauthorizedError` (→ 401).
- `app.requirePermission(code: PermissionCode)`: devuelve un array de `preHandler` `[authenticate, check]` donde `check` usa la función de dominio pura `hasPermission(auth, code)` y lanza `ForbiddenError` (→ 403).
Uso: `app.post('/x', { preHandler: app.requirePermission('settlement.process') }, handler)`.
Se aplica `authenticate` por ruta, no con un hook global, para que las rutas públicas (`login`, `refresh`, `logout`, `health`, `docs`) no necesiten lista de exclusión. `/auth/me` usa `preHandler: app.authenticate`. El tipo del argumento es `PermissionCode` de `@recon/shared`, así un código inexistente no compila.
Para `merchantScope = "all"`, `merchantIds` se resuelve como todos los `merchantId` de la base; con `assigned`, las filas de `UserMerchant`. Coste: una consulta extra por petición; aceptable para el volumen del MVP (decenas de usuarios).

### D9. Errores uniformes
`plugins/error-handler.ts` traduce: errores de validación del type provider Zod → `400 validation_error` con `details`; `UnauthorizedError` → `401 unauthorized`; `InvalidCredentialsError` → `401 invalid_credentials`; `InvalidTokenError` → `401 invalid_token`; `ForbiddenError` → `403 forbidden`; resto → `500 internal_error` sin stack en el cuerpo. Los errores de dominio son clases simples en `modules/auth/domain/errors.ts`, sin dependencia de Fastify.

### D10. Esquemas en `packages/shared` y OpenAPI
`packages/shared/src/auth.ts` define `LoginRequest`, `TokenPair`, `RefreshRequest`, `MeResponse`, `ErrorResponse`, `MerchantScope = z.enum(['assigned','all'])`, reutilizando `PermissionCode`. El backend usa `fastify-type-provider-zod` (versión compatible con Zod 4 y Fastify 5) como validator/serializer y `jsonSchemaTransform` para `@fastify/swagger`; `@fastify/swagger-ui` sirve `/docs`. El `bearerAuth` se declara como security scheme. Volcar el YAML a `docs/openapi.yaml` queda fuera (ver Open Questions).

### D11. Prefijo y rutas
Todas las rutas bajo `/api/v1` (README §4), incluido `GET /api/v1/health`. `/docs` queda en la raíz. `health` hace `SELECT 1` vía Prisma y responde `200 { status: "ok", db: "ok" }` o `503 { status: "degraded", db: "error" }`.

### D12. Logger
Logger de Fastify (pino) con `redact: ['req.headers.authorization', '*.password', '*.accessToken', '*.refreshToken']`. Nivel por `LOG_LEVEL`; en tests `silent`. Biome no tiene regla `noConsole` activa por defecto: se añade `suspicious/noConsole: error` para `backend/src` (salvo `src/generated`).

### D13. Tests
- `backend/vitest.config.ts` con dos proyectos: `unit` (`src/**/*.test.ts`, sin base) e `integration` (`test/integration/**/*.int.test.ts`, requiere SQL Server y seed). `pnpm test` en el job `check` corre solo `unit`; el job `integration` corre `--project integration` y se quita `continue-on-error`.
- Unitarios con dobles en memoria de los puertos y un `Clock` falso para caducidad.
- Integración contra la base sembrada: `buildApp` real con `JWT_SECRET` de test. Para el usuario inactivo se crea un usuario `inactive_test` en `beforeAll` y se borra en `afterAll` (junto con sus filas de `AuditLog` y `RefreshToken`), en lugar de envolver en transacción, porque el flujo atraviesa varias peticiones HTTP con su propia conexión.

## Risks / Trade-offs

- [El hash ficticio no iguala perfectamente los tiempos] → Mismo coste Argon2 en ambos caminos; la diferencia residual (una consulta) es irrelevante para el MVP y no hay enumeración por mensaje.
- [Consulta a base en cada petición autenticada] → Una sola consulta con `include` de rol, permisos y merchants; cachear queda para cuando haya métricas.
- [`AuditLog` crece con intentos fallidos sin límite] → Sin rate limiting en este change; anotado como fuera de alcance. El índice `(userId, createdAt)` existente sirve para purgas futuras.
- [Fila `RefreshToken` por login sin limpieza] → Las caducadas se pueden purgar con un job posterior; el índice permite hacerlo barato.
- [Compatibilidad `fastify-type-provider-zod` con Zod 4] → Se fija la versión que declara soporte para Zod 4 y se comprueba en la tarea de dependencias con un test de humo de `/health`.
- [Usuario de test en la base compartida de integración] → Nombre reservado `inactive_test`, limpieza en `afterAll` y creación idempotente (`upsert`).

## Migration Plan

1. Editar `schema.prisma` (modelo `RefreshToken`, `AuditLog.userId Int?`) y generar `0003_auth` con `prisma migrate dev --create-only` contra la base local. **Revisión humana del SQL antes de aplicarlo** (CLAUDE.md paso 4).
2. Aplicar en local con `pnpm db:migrate`; `pnpm db:seed` sigue siendo idempotente (el seed debe vaciar `RefreshToken` antes de `User`; se ajusta el orden de borrado).
3. Rollback: la migración es aditiva; revertir es `DROP TABLE RefreshToken` y volver `AuditLog.userId` a `NOT NULL` tras borrar filas con `userId NULL`.

## Open Questions

- ¿Volcar el OpenAPI generado a `docs/openapi.yaml` en un script (`pnpm openapi:export`) o dejar `/docs` como única fuente? No cambia las rutas ni los tests; se puede decidir en el change de contrato OpenAPI.
