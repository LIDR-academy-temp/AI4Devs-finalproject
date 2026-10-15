# Proposal — catalog-read

Issue: #2 · T1 · Endpoints de catálogo en solo lectura (merchants, providers, accounts, channels) · Historia HU0 · Tramo 1 · Depende de #1 (`auth-login`, archivado).

## Why

El módulo `auth` ya resuelve en cada petición quién llama y qué merchants ve (`request.auth.merchantIds`), pero ningún endpoint usa todavía ese alcance: no hay forma de listar merchants, proveedores, cuentas ni canales, que es lo primero que necesitan New Reconciliation (merchant → proveedor → cuenta), Account Detail y Channel Assignment (README §1.3). Este change crea el módulo `catalog` con las lecturas de README §4.4 (filas Catálogo) y fija, de una vez para todos los módulos, la regla de §4: un recurso de un merchant fuera del alcance responde `404`, nunca `403`.

## Secciones del README que implementa

- **§1.2 Catálogo de merchants, proveedores, cuentas y canales**: jerarquía de solo lectura que viene de los gateways; la cuenta como única entidad propia; canal *not assigned yet* (con transacciones y sin cuenta); cuenta principal = la última que procesó un settlement con el canal; "un merchant no ve los proveedores de otro merchant".
- **§3.2 Catálogo**: `Gateway → Merchant → Provider → Channel` (parámetros del canal: `settlementTermDays`, `rollingReservePct`, `rollingReserveDays`), `Account` (política de reserva, tope, conjunto de reglas, `isActive`), `AccountChannel` (`isPrimary`, `assignedAt`, `assignedInBatchId`), `UserMerchant` como origen del alcance.
- **§4 Convenciones**: alcance por merchant en cada petición, `404` para lo no visible, dinero y porcentajes como strings decimales, enteros para catálogos y UUID para cuentas.
- **§4.4 Inventario, filas Catálogo y Sistema**: `GET /merchants`, `GET /merchants/{id}/providers`, `GET /providers/{id}`, `GET /providers/{id}/channels`, `GET /providers/{id}/accounts`, `GET /accounts/{id}`, `GET /accounts/{id}/channels`, `GET /channels?unassigned=true`, `GET /channels/{id}/accounts`, `GET /health`.

## What Changes

- **Módulo `catalog`** con estructura hexagonal `backend/src/modules/catalog/{domain,application,infrastructure,http}` y nueve rutas `GET` bajo `/api/v1`, todas autenticadas con el plugin de `auth` y filtradas por `request.auth.merchantIds`:
  - `GET /merchants` · `GET /merchants/{id}/providers` — jerarquía visible.
  - `GET /providers/{id}` (con merchant, cuentas y canales, parámetros incluidos) · `GET /providers/{id}/channels` · `GET /providers/{id}/accounts`.
  - `GET /accounts/{id}` (detalle con proveedor y merchant) · `GET /accounts/{id}/channels` (canales asociados, principal e históricos, con la cuenta principal actual de cada canal).
  - `GET /channels?unassigned=true` (canales con transacciones y sin fila en `AccountChannel`) · `GET /channels/{id}/accounts` (cuentas asociadas al canal y cuál es la principal).
- **Regla de alcance aplicada en la consulta, no después**: el filtro por merchant forma parte del `WHERE` de cada repositorio; un recurso que no sale de la consulta responde `404 not_found`, indistinguible de uno inexistente. Error de dominio `NotFoundError` nuevo, mapeado a `404` en el manejador de errores uniforme.
- **`packages/shared`**: esquemas Zod de respuesta del catálogo (`MerchantSummary`, `ProviderSummary`, `ProviderDetail`, `ChannelSummary`, `AccountSummary`, `AccountDetail`, `AccountChannelItem`, `ChannelAccountItem`, `ChannelsQuery`); importes y porcentajes como `Money` / `Percentage` (strings).
- **`ROLES` y la lista de permisos pasan a `packages/shared`** (`roles.ts`, `PERMISSION_CODES` en `permissions.ts`): `prisma/seed.ts`, `prisma/synthetic.ts` (`USERS.role` tipado) y los tests de `auth` (`permissions.test.ts`, `auth.int.test.ts`, dobles en memoria) importan de ahí y dejan de duplicar la lista de siete códigos.
- **OpenAPI**: las nueve rutas aparecen en `/docs/json` con `bearerAuth` y etiqueta `catalog`.
- **`GET /health`**: ya implementado y testeado en `auth-login` (`backend/src/routes/health.ts`); no se toca. El criterio 4 del issue queda cubierto por `health.int.test.ts` y `app.test.ts`.

## Capabilities

### New Capabilities

_Ninguna._ Las lecturas de la jerarquía y de las cuentas se añaden a `accounts`, cuyo ámbito ya es README §3.2 "Catálogo" (Account, AccountChannel y los canales); crear una capability `catalog` separada partiría en dos la misma sección del README. Si en la revisión se prefiere separar, se divide antes de `apply`.

### Modified Capabilities

- `accounts`: se añaden los requisitos de lectura (jerarquía visible de merchants y proveedores, detalle de proveedor, canales de un proveedor, cuentas de un proveedor, detalle de cuenta, canales sin cuenta, canales de una cuenta, cuentas de un canal, lecturas autenticadas sin permiso específico). Se modifican **Cuenta** y **Alcance por merchant** para que cada requisito tenga al menos un escenario (regla de `openspec/config.yaml`); **Alcance por merchant** incorpora además la regla `404`, no `403`. **Canal nuevo y cuenta principal** no cambia (ya tiene escenario).

## Escenarios de aceptación (del issue #2)

1. **Alcance de un solo merchant** — *Dado* `viewer` (merchant 1), *cuando* llama a `GET /merchants`, *entonces* ve solo `Merchant A` y, en `GET /merchants/1/providers`, `Provider A` y `Provider B`; `GET /accounts/{id}` de `ProviderC-USD` (merchant 2) y `GET /providers/201` responden `404`, no `403`.
2. **Canales sin cuenta** — *Dado* el seed, *cuando* llama a `GET /channels?unassigned=true`, *entonces* aparecen exactamente `RAM-07` (1007) y `RAM-13` (1013).
3. **Canales de una cuenta** — *Dado* `GET /accounts/{id}/channels` de `ProviderA-USD`, *entonces* `RAM-01` y `RAM-02` indican `isPrimary = true` y `primaryAccount = ProviderA-USD`; un canal con historial en dos cuentas muestra `isPrimary = false` en la histórica y la principal actual en `primaryAccount`.
4. **Salud** — `GET /health` responde `{ status, db }` (ya cubierto).

La versión normativa, con los conteos fijos del seed, está en `specs/accounts/spec.md`.

## Archivos que se crean o modifican

Nuevos:

```
backend/src/modules/catalog/domain/scope.ts                      Scope { merchantIds } y scopeOf(auth)
backend/src/shared/errors.ts                                     NotFoundError (code not_found)
backend/src/modules/catalog/application/ports.ts                 CatalogRepository (consultas con alcance)
backend/src/modules/catalog/application/catalog-service.ts       casos de uso de lectura; 404 cuando la consulta no devuelve
backend/src/modules/catalog/application/__fakes__/in-memory.ts   InMemoryCatalogRepository con el mundo del seed
backend/src/modules/catalog/infrastructure/prisma-catalog-repository.ts
backend/src/modules/catalog/http/catalog-routes.ts               nueve rutas GET con esquemas de @recon/shared
backend/src/modules/catalog/catalog-module.ts                    composición (Prisma + rutas), depende de 'prisma' y 'auth'
backend/src/modules/catalog/**/*.test.ts                         unitarios (dominio, servicio, rutas)
backend/src/infrastructure/decimal.ts                            Decimal → Money / Percentage (strings)
backend/test/integration/catalog.int.test.ts                     nueve rutas contra el seed, conteos fijos
packages/shared/src/catalog.ts                                   esquemas Zod de respuesta y query
packages/shared/src/roles.ts                                     ROLES (nombre + permisos) y RoleName
packages/shared/src/catalog.test.ts · roles.test.ts
```

Modificados: `backend/src/app.ts` (registra `catalogModule`; `BuildAppOptions.catalogService`), `backend/src/plugins/error-handler.ts` (`NotFoundError` → `404`), `backend/src/modules/auth/http/test-support.ts` (acepta `catalogService`), `backend/src/modules/auth/application/__fakes__/in-memory.ts` y `backend/src/modules/auth/domain/permissions.test.ts` (importan `ROLES` / `PERMISSION_CODES` de `@recon/shared`), `backend/test/integration/auth.int.test.ts` (`PERMISSION_CODES`), `backend/prisma/synthetic.ts` (sin `ROLES`; `USERS.role: RoleName`), `backend/prisma/seed.ts` (importa `ROLES` de `@recon/shared`), `packages/shared/src/permissions.ts` (`PERMISSION_CODES`), `packages/shared/src/index.ts` (re-exports), `openspec/specs/accounts/spec.md` (Purpose ampliado; el resto al archivar).

## Fuera de alcance

`POST /providers/{id}/accounts` y `PATCH /accounts/{id}` (tramo 5), fees (`/fees`, `/accounts/{id}/fees`), conjuntos de reglas de pareo, `GET /channels/{id}/unsettled`, `GET /providers/{id}/pending-payments`, dashboard, pantallas del frontend, filtros de búsqueda o paginación (el catálogo cabe en una respuesta: decenas de filas), cambios de esquema o migraciones.

## Impact

- **API**: nueve rutas `GET` nuevas bajo `/api/v1`; ninguna ruta existente cambia. Aparece el código de error `404 not_found` para recursos (hasta ahora solo lo emitía el handler de ruta desconocida).
- **Base de datos**: sin migraciones; solo lecturas. Las consultas usan los índices existentes (`Provider.merchantId`, `Channel.providerId`, `Account.providerId`, `AccountChannel.channelId`, `Transaction(channelId, transactionDate)`).
- **`packages/shared`**: el seed del backend pasa a depender del paquete compartido (ya es dependencia `workspace:*` del backend). `data/samples/plan.ts` no importa `ROLES` y no cambia.
- **Resto de módulos**: a partir de aquí reutilizan `NotFoundError` y el patrón "alcance en la consulta" (`scopeOf(request.auth)`) para imports, settlements y fees.
- **CI**: sin variables ni jobs nuevos; el job `integration` ejecuta la suite nueva contra el seed.
