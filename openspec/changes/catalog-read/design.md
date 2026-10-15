# Design — catalog-read

> **Nota de nomenclatura.** El módulo de backend se llama `catalog` (`backend/src/modules/catalog`, como lista CLAUDE.md) y su capability de OpenSpec es `accounts` (`openspec/specs/accounts/spec.md`). Los dos nombres son deliberados: el módulo agrupa el código de la jerarquía de solo lectura y de las cuentas; la spec sigue la sección README §3.2 "Catálogo", que ya vivía bajo `accounts`. Las escrituras de cuentas (tramo 5) irán al mismo módulo y a la misma capability.

## Context

- `auth-login` dejó el esqueleto que este módulo copia: `buildApp()` con type provider Zod, plugins `fastify-plugin` con `name`/`dependencies`, `plugins/error-handler.ts` que mapea errores de dominio por `instanceof`, y el plugin `auth` que decora `app.authenticate`, `app.requirePermission(code)` y `request.auth: AuthContext`.
- `AuthContext.merchantIds` ya es la lista de merchants visibles: todos los `merchantId` de la base para `merchantScope = "all"`, las filas de `UserMerchant` para `"assigned"` (`[]` si no tiene). Se recalcula en cada petición.
- Esquema (sin cambios): `Merchant.isActive`, `Provider.merchantId`, `Channel.providerId` + parámetros `Decimal(9,6)`, `Account` con `Decimal(19,4)` nullable y `matchingRuleSetId` nullable, `AccountChannel` PK `(accountId, channelId)` con índice único filtrado `UX_AccountChannel_primary (channelId) WHERE isPrimary = 1`, `Transaction.channelId` indexado.
- Seed: ninguna cuenta inactiva, ningún canal con historial en dos cuentas, ningún usuario sin merchants. Lo que el seed no tiene se cubre con dobles en memoria o con filas temporales en el test de integración (patrón de `inactive_test` en `auth.int.test.ts`).
- `ROLES` vive en `backend/prisma/synthetic.ts` y lo importan `seed.ts` y `modules/auth/domain/permissions.test.ts`; la lista de los siete códigos está duplicada a mano en ese test y en `auth.int.test.ts`. `PermissionCode` (enum Zod) ya está en `packages/shared`.
- `GET /api/v1/health` existe y está testeado; `app.test.ts` ya comprueba que `/docs/json` lo lista.
- Motivación y alcance: `proposal.md`. Requisitos y escenarios: `specs/accounts/spec.md`.

## Goals / Non-Goals

**Goals:**
- Un patrón de "alcance en la consulta" que los módulos siguientes (imports, settlements, fees) copien sin pensar: una sola forma de obtener el `Scope`, una sola forma de responder `404`.
- Dominio y aplicación de `catalog` sin Fastify ni Prisma, testeables con un repositorio en memoria que reproduce el mundo del seed.
- Tests de integración con conteos fijos del seed como oráculo (issue #2, Definición de hecho).

**Non-Goals:**
- Paginación, búsqueda o filtros más allá de `unassigned` (el catálogo tiene decenas de filas).
- Escrituras sobre `Account` o `AccountChannel` (tramo 5 y módulo `settlement`).
- Cachear el catálogo o el alcance.

## Decisions

### D1. Módulo `catalog`, capability `accounts`
El código vive en `backend/src/modules/catalog` (CLAUDE.md lista `catalog` entre los módulos del MVP); los requisitos, en la capability `accounts` (README §3.2 "Catálogo" cubre jerarquía, Account y AccountChannel juntos). Las escrituras de cuentas del tramo 5 extenderán este mismo módulo y esta misma capability. *Alternativa*: capability `catalog` nueva; descartada en el proposal para no partir una sección del README en dos specs.

### D2. El alcance es parte de la consulta
`domain/scope.ts` define `Scope = { readonly merchantIds: readonly number[] }` y `scopeOf(auth: AuthContext): Scope`. Todos los métodos del puerto `CatalogRepository` reciben `scope` como primer argumento y lo traducen a `provider: { merchantId: { in: scope.merchantIds } }` (o `merchantId: { in }` en merchants) dentro del `where`. No hay comprobación de visibilidad separada: un recurso fuera del alcance simplemente no sale de la consulta y el servicio lanza `NotFoundError`. Con `merchantIds = []`, Prisma genera una condición siempre falsa y devuelve vacío (escenario "Usuario sin merchants asignados").
Se filtra siempre por la lista, también con `merchantScope = "all"`: una sola rama de código, y la lista ya viene resuelta por `auth`. *Alternativa*: cargar el recurso sin filtro y comparar `merchantId` después; descartada porque son dos caminos (olvidar uno abre una fuga) y porque obligaría a distinguir "no existe" de "no visible" en el código, justo lo que §4 prohíbe revelar.

### D3. `authenticate`, no `requirePermission`
README §4.4 deja vacía la columna Permiso de las filas Catálogo: cualquier rol autenticado lee el catálogo dentro de su alcance. Las rutas usan `preHandler: app.authenticate` (como `/auth/me`) y leen `request.auth`. `app.requirePermission` queda para las escrituras (`account.manage`, tramo 5). Se declara `security: [{ bearerAuth: [] }]` en cada ruta para el OpenAPI.

### D4. `NotFoundError` y cuerpo `404` uniforme
`modules/catalog/domain/errors.ts` exporta `NotFoundError` (`code = "not_found"`, `message = "<Entity> not found"`, p. ej. `Account not found`); el mensaje nombra el tipo de recurso, nunca si existe. `plugins/error-handler.ts` lo mapea a `404`, junto al `setNotFoundHandler` de rutas desconocidas que ya responde `not_found`. Es la primera clase de error reutilizable entre módulos: cuando un segundo módulo la necesite se sube a `backend/src/domain/errors.ts`; no se hace ahora para no mover código por adelantado.

### D5. Sub-recursos: padre primero, luego lista
Para `GET /merchants/{id}/providers`, `/providers/{id}/channels`, `/providers/{id}/accounts`, `/accounts/{id}/channels` y `/channels/{id}/accounts` el servicio hace `find<Padre>(scope, id)` (→ `404` si `null`) y después `list<Hijos>(scope, id)`. Dos consultas por petición, ambas con el alcance en el `where`; así un hijo de un padre no visible nunca se lista y una lista vacía no se confunde con `404`. *Alternativa*: una consulta con `include` y comprobar si el padre vino; equivalente en coste para el MVP y menos legible en el puerto.

### D6. Definición de "not assigned yet" en la consulta
`GET /channels?unassigned=true` → `channel.findMany({ where: { provider: { merchantId: { in } }, accountChannels: { none: {} }, transactions: { some: {} } } })` (README §3.2: canal con transacciones y sin fila en `AccountChannel`). `transactions: { some: {} }` se traduce a `EXISTS` sobre el índice `(channelId, transactionDate)`. El doble en memoria reproduce la regla con un conjunto de `channelId` con transacciones. Sin `unassigned` (o `false`) se devuelven todos los canales del alcance: evita un segundo endpoint y sirve a Channel Assignment. El parámetro se parsea con `z.stringbool()` de Zod 4 (`"true"`/`"false"`); si el transform a JSON Schema de `fastify-type-provider-zod` no lo soporta, se cae a `z.enum(['true','false']).transform(...)` (se comprueba en el test de `/docs/json`).

### D7. Formas de respuesta y tipos de dinero
Esquemas en `packages/shared/src/catalog.ts`:
- `MerchantSummary { merchantId, name, isActive }`; `ProviderSummary { providerId, merchantId, name, isActive }`.
- `ChannelSummary { channelId, gatewayId, providerId, name, isActive, settlementTermDays, rollingReservePct: Percentage, rollingReserveDays }`.
- `AccountSummary { accountId: uuid, providerId, name, chargebackReservePolicy: ChargebackReservePolicy, rollingReserveCapAmt: Money | null, matchingRuleSetId: int | null, isActive, createdAt: ISO datetime }`.
- `ProviderDetail = ProviderSummary & { merchant: MerchantRef, accounts: AccountSummary[], channels: ChannelSummary[] }` (README §4.4: "proveedor con sus cuentas y canales, parámetros del canal incluidos").
- `AccountDetail = AccountSummary & { provider: ProviderSummary, merchant: MerchantRef }`.
- `AccountChannelItem = ChannelSummary & { isPrimary, assignedAt, assignedInBatchId: uuid | null, primaryAccount: { accountId, name } | null }`.
- `ChannelAccountItem { accountId, name, providerId, isActive, isPrimary, assignedAt, assignedInBatchId }`.
- `ChannelsQuery { unassigned?: boolean }`.
`Decimal` de Prisma se convierte con `backend/src/infrastructure/decimal.ts`: `toMoney(d) = d.toFixed(4)`, `toPercentage(d) = d.toFixed(6)`, con variantes nullable; nunca `Number()`. `Date` → `toISOString()`. Se reutilizan `Money`, `Percentage`, `ChargebackReservePolicy` y `MerchantRef` ya definidos en `@recon/shared`.
Orden determinista para que los tests comparen listas: merchants/providers/channels por id, cuentas por `name`, canales de una cuenta y cuentas de un canal por `assignedAt` y después por id.

### D8. Filas inactivas
Merchants, proveedores, canales y cuentas inactivos se devuelven con su `isActive` (README §1.2: "los canales pueden quedar inactivos; no se borran"; las cuentas "se cierran, no se borran"). El frontend decide cómo mostrarlos. No se añade filtro `active=` hasta que una pantalla lo pida.

### D9. Puertos, adaptadores y composición
- `application/ports.ts`: `CatalogRepository` con `listMerchants`, `findMerchant`, `listProviders`, `findProvider` (detalle con merchant, cuentas y canales), `listProviderChannels`, `listProviderAccounts`, `findAccount` (con proveedor y merchant), `listAccountChannels` (con `primaryAccount` resuelto en la misma consulta vía `channel.accountChannels` filtrado por `isPrimary`), `listChannels(scope, { unassigned })`, `findChannel`, `listChannelAccounts`; todos reciben `Scope`.
- `application/__fakes__/in-memory.ts`: `InMemoryCatalogRepository` construido a partir de un fixture que copia `MERCHANTS`, `PROVIDERS`, `CHANNELS` y `ACCOUNTS` del seed (ids fijos, `accountId` UUID fijos de prueba), filas `AccountChannel` y un `Set` de canales con transacciones; sirve a los tests de servicio y de rutas.
- `application/catalog-service.ts`: un método por ruta; la única lógica es `scopeOf` + `404` (D5). Tests unitarios con el doble.
- `infrastructure/prisma-catalog-repository.ts`: consultas Prisma con `select` explícito y los mapeos de D7. Se verifica en integración.
- `catalog-module.ts`: `fp` con `dependencies: ['prisma', 'auth']`, construye `PrismaCatalogRepository(app.prisma)` + `CatalogService` salvo que `options.service` venga inyectado, y registra `catalogRoutes` bajo `/api/v1`. `app.ts` lo registra después de `authModule`; `BuildAppOptions.catalogService?` sigue el patrón de `authService`.
- `modules/auth/http/test-support.ts` (`buildTestApp`) gana la opción `catalogService` para que los tests de rutas de catálogo reutilicen la autenticación en memoria (`admin` scope `all`, `analyst` [1, 2], `viewer` [1], `unassigned` []) sin SQL Server. Cuando un tercer módulo lo necesite, `buildTestApp` se mueve a `backend/src/test-support/`.

### D10. `ROLES` y `PERMISSION_CODES` en `packages/shared`
- `packages/shared/src/permissions.ts` añade `export const PERMISSION_CODES = PermissionCode.options` (tupla readonly de los siete códigos).
- `packages/shared/src/roles.ts` define `ROLES` (`admin`, `analyst`, `payments`, `viewer` con sus permisos, `as const satisfies readonly { name: string; permissions: readonly PermissionCode[] }[]`) y `RoleName`. Un código mal escrito deja de compilar.
- `backend/prisma/synthetic.ts` elimina `ROLES`; `USERS` queda `as const satisfies readonly { role: RoleName; ... }[]`. `seed.ts` importa `ROLES` de `@recon/shared` (el backend ya depende del paquete y `tsx` resuelve `main: src/index.ts`; `tsconfig.json` del backend incluye `prisma/**`).
- `modules/auth/domain/permissions.test.ts` conserva los tests de `hasPermission` importando `ROLES` y `PERMISSION_CODES` de `@recon/shared`; el bloque "seeded role permissions" se traslada a `packages/shared/src/roles.test.ts`. `auth.int.test.ts` usa `PERMISSION_CODES` en lugar de su lista literal. `seedUsers()` del doble en memoria toma los permisos de `ROLES`.
*Alternativa*: dejar `ROLES` en `synthetic.ts` y solo exportar la lista de códigos; descartada por petición explícita (los roles son vocabulario del producto, no un parámetro del dataset).

### D11. Tests
- **Unitarios** (`pnpm test`, sin base): `domain/scope.test.ts` (`scopeOf` copia `merchantIds`, vacío ⇒ vacío); `application/catalog-service.test.ts` (cada ruta con `admin`/`viewer`/`unassigned` sobre el doble: listas, `404` fuera de alcance = `404` inexistente, unassigned, `primaryAccount` con historial en dos cuentas); `http/catalog-routes.test.ts` vía `buildTestApp` (`401` sin token, `200` para `viewer`, `400` con UUID mal formado, `unassigned=true/false`, formas validadas con los esquemas de `@recon/shared`); `app.test.ts` amplía la comprobación de `/docs/json` a las nueve rutas con `bearerAuth`; `packages/shared` testea `catalog.ts` (rechaza `rollingReserveCapAmt` numérico, acepta `"0.100000"`) y `roles.ts`.
- **Integración** (`backend/test/integration/catalog.int.test.ts`, SQL Server + seed): conteos fijos (2/3/9/5; `viewer`: 1/2/7/3; unassigned = {1007, 1013}); `404` de `viewer` sobre 201, `ProviderC-USD` y 2001 con cuerpo idéntico al de un id inexistente; `RAM-01`/`RAM-02` principales en `ProviderA-USD` con `assignedInBatchId` del último batch pagado; historial en dos cuentas insertando en `beforeAll` la fila `AccountChannel(ProviderA-EUR, 1001, isPrimary = false)` y borrándola en `afterAll` (no toca el índice único filtrado porque `isPrimary = false`); `GET /channels/1007/accounts` vacío. Los `accountId` se resuelven por nombre con Prisma, porque el seed los genera con el PRNG.
- TDD: cada grupo escribe el test, lo ve en rojo, implementa y rompe una vez a propósito (p. ej. quitar el filtro de `scope` en `findAccount` debe hacer fallar el `404` de `viewer`).

## Risks / Trade-offs

- [Dos consultas por sub-recurso] → Decenas de filas y una petición por pantalla; se mide antes de optimizar. El puerto permite fusionarlas sin tocar rutas ni tests de servicio.
- [`transactions: { some: {} }` sobre ~24 k transacciones] → `EXISTS` con índice por `channelId`; el plan es una búsqueda por canal (9 canales). Se comprueba el tiempo en el test de integración (`testTimeout` 30 s ya configurado).
- [`in: []` generado por Prisma para un usuario sin merchants] → Prisma lo convierte en `1 = 0`; se cubre en unitario con el doble y, en integración, con `viewer` sobre el merchant 2 (lista vacía de proveedores no visibles no aplica: responde 404 por D5) — el caso `[]` real queda en unitario porque el seed no tiene ese usuario.
- [Fila temporal `AccountChannel` en la base compartida de integración] → Clave `(accountId de ProviderA-EUR, 1001)` reservada para el test, `upsert` idempotente y borrado en `afterAll`; si un test anterior aborta, el `upsert` la deja en el mismo estado.
- [`z.stringbool()` no soportado por el transform a JSON Schema] → Fallback con `z.enum` + `transform` (D6); el test de `/docs/json` lo detecta en unitario.
- [Mover `ROLES` rompe el seed si `tsx` no resuelve `@recon/shared` desde `backend/prisma`] → Verificación explícita en tareas: `pnpm db:seed` dos veces seguidas en local y en el job `integration` de CI, que ya ejecuta el seed antes de los tests.
- [`NotFoundError` dentro de `catalog` y usado por el error handler global] → Mismo acoplamiento que ya existe con `auth/domain/errors.ts`; se sube a un módulo común cuando aparezca el segundo consumidor (D4).

## Migration Plan

Sin migraciones ni cambios de esquema. Despliegue = merge del PR; rollback = revertir el merge (las rutas nuevas no las consume nadie todavía).

## Open Questions

- Sigue abierta desde `auth-login`: volcar el OpenAPI generado a `docs/openapi.yaml` con un script. No afecta a este change (el issue pide que el OpenAPI *generado* incluya las rutas, y `/docs/json` las incluye).
