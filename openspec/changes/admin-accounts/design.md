# Design — admin-accounts

Motivación y alcance en `proposal.md`; comportamiento en las delta specs (`accounts`, `fees`, `import`, `matching`).

## Context

- **Lecturas de cuentas y canales.** Viven en `backend/src/modules/catalog`: `CatalogRepository` aplica el alcance dentro de cada consulta y `null` se lee como "no encontrado". No existe módulo `accounts`, aunque `CLAUDE.md` lo prevé en el MVP.
- **El patrón de escritura a seguir es el de `admin-fees`** (`PrismaFeeAdminRepository`): una transacción por escritura con la fila de `Account` bloqueada con `UPDLOCK, HOLDLOCK` y filtrada por alcance, `retryOnDeadlock`, y el historial y la auditoría dentro de la misma transacción. Las rutas usan `app.requirePermission(...)` como `preHandler`, que comprueba el token y luego el permiso. El alcance llega después, en el servicio.
- **Base de datos.** `Account.name` tiene `UNIQUE` (`Account_name_key`). `CK_Account_chargebackReservePolicy` y `CK_Account_rollingReserveCapAmt (≥ 0)` existen. `FeeHistory.action` admite `copied`, pero el puerto `FeeHistoryWrite` de fees solo tipa `created | updated | closed`. No hay migración.
- **Imports.** `ImportService.createImport` llama a `requireAccount`, que lee `{ accountId, matchingRuleSetId }` del `findAccount` del repositorio de imports, dentro de `withStaged`, que limpia los archivos subidos si algo lanza. `requireAccount` también lo usa el listado de imports de la cuenta, que no debe cambiar.
- **New Reconciliation ya no lista cuentas cerradas.** `frontend/src/features/imports/NewReconciliationPage.tsx:24` usa `useAccountChoice({ includeClosed: false })`, y `account-choice.tsx:52` filtra por `isActive`. El `409 account_inactive` es la barrera del servidor detrás de esa pantalla, no un cambio de UI. Settlement List usa `includeClosed: true`. Las lecturas del API siguen devolviendo las cuentas cerradas con `isActive = false`. El filtro `includeClosed` de `useAccountChoice` no cambia: New Reconciliation sigue sin listarlas (`false`) y Settlement List sigue listándolas (`true`).
- **`@recon/shared`.** `Money` acepta negativos (`^-?\d{1,15}(\.\d{1,4})?$`), así que el tope `≥ 0` es una regla de dominio. `ChargebackReservePolicy` ya es un enum.
- **Tests de integración.** Corren en serie (`fileParallelism: false`, un fork). `catalog.int.test.ts` comprueba listas exactas de cuentas en las líneas 113–121, 225–240 y 275.

## Goals / Non-Goals

**Goals**

- Escrituras de cuenta atómicas: cuenta, copias de fees, `FeeHistory` y `AuditLog` en una sola transacción.
- La copia nunca ve un estado intermedio de los fees de la cuenta origen.
- Reglas de cuenta (diferencias, acción de auditoría, plan de copia) como funciones puras con TDD.
- Contrato publicado primero (grupo 1), con las rutas en `501`, para `web-admin-accounts`.

**Non-Goals**

- Ningún cambio en `AccountChannel` ni en la lógica de cuenta principal de `settlement`.
- Validación cruzada cuenta–canal del mismo proveedor (#24).
- Cambiar el orden autenticación → esquema (#72).
- Escrituras de conjuntos de reglas (`admin-matching`).

## Decisions

### D1. Módulo `accounts` nuevo para las escrituras; las lecturas siguen en `catalog`

- `backend/src/modules/accounts/{domain,application,infrastructure,http}` con `accounts-module.ts`, registrado en `app.ts` después de `catalog` y `fees`.
- La respuesta de crear y editar reutiliza `CatalogService.getAccount` (misma forma `AccountDetail`, mismo alcance), que se inyecta en el servicio.
- **Alternativa descartada:** meter las escrituras en `catalog`. Rompe su contrato de "solo lectura" (`catalog-routes.ts` lo dice en su comentario) y mezcla bloqueos y auditoría con consultas.

### D2. Contrato en `@recon/shared` (`catalog.ts`)

- **`AccountCreate`**, `strictObject`:
  - `name`: `z.string().trim().min(1).max(50)`.
  - `chargebackReservePolicy`.
  - `rollingReserveCapAmt`: `Money.nullable().optional()`.
  - `matchingRuleSetId`: entero positivo, `.nullable().optional()`.
  - `copyFeesFromAccountId`: `z.uuid().nullable().optional()`.
- **`AccountPatch`**, `strictObject`: los mismos campos opcionales salvo la copia, más `isActive` y `reason` (`trim`, 1–500). Un `refine` exige al menos un campo distinto de `reason`, como `FeeCorrection`.
- **Ampliaciones:**
  - `AccountDetail` gana `createdBy: UserRef` (`{ userId, userName }`, el de `auth.ts` que ya usan fees e imports) y `updatedAt`.
  - `AccountChannelItem` y `ChannelAccountItem` ganan `assignedInBatchNo: z.number().int().nullable()`.
  - Las filas de `GET /channels` pasan a `ChannelListItem = ChannelSummary.extend({ primaryAccount: AccountRef.nullable() })`. `ChannelSummary` sigue igual en `ProviderDetail` y en `GET /providers/{id}/channels`.
- **`MatchingRuleSetSummary`**: `{ ruleSetId, providerId, name, isActive, accounts: { accountId, name, isActive }[] }`.
- **Códigos de error**: `account_name_taken` y `account_inactive`, documentados en la `description` de las rutas, como hace fees.

### D3. Dominio puro (TDD)

- **`accounts/domain/account-rules.ts`**:
  - `normalizeCap(value)` → string de 4 decimales o `null`; lanza `AccountRuleError('rollingReserveCapAmt')` si es negativo.
  - `planAccountPatch(current, body)` → `{ changes: Record<campo, { before, after }>, action: 'account.update' | 'account.close' | 'account.reopen' }`. Un cambio de nombre solo en mayúsculas y minúsculas **sí** es un cambio. Un dinero igual con otra escala (`"1000"` frente a `"1000.0000"`) **no** lo es. Sin cambios devuelve `changes = {}`, y el servicio responde sin escribir.
  - La acción es `close` o `reopen` si `isActive` está entre los cambios, aunque haya otros campos (escenario "Cierre auditado con cambios").
- **`fees/domain/fee-copy.ts`**: `planCopy(sourceFees, today, newId)` toma los `FeeState` de la cuenta origen y devuelve `{ sourceFeeId, copy: FeeState }[]`:
  - filtra con `statusOf(fee, today) === 'active'`;
  - copia valores, variantes y `description`, con `startDate = endDate = null` y un `feeId` nuevo;
  - el orden es estable (`feeTypeId` y luego `feeId`), para la auditoría y los tests.

  Vive en fees porque es una regla de fees (vigencia y estado) y reutiliza `statusOf` y `newYorkToday`.
- **Errores** (`accounts/domain/errors.ts`, sobre `DomainError`):
  - `AccountRuleError(field)` → `400 validation_error` con `details.field`;
  - `AccountNameTakenError` → `409 account_name_taken`.

  `AccountInactiveError` → `409 account_inactive` va en `imports/domain`.

### D4. Unidad de trabajo y bloqueos

- **`AccountAdminRepository`:**
  - `inProvider(scope, providerId, work)`: transacción. Comprueba que el proveedor existe y está en el alcance (`null` → `404`), sin bloquearlo.
  - `inAccount(scope, accountId, work)`: transacción con la fila de `Account` en `UPDLOCK, HOLDLOCK`, el mismo bloqueo que toman las escrituras de fees. Editar una cuenta y crear o cambiar sus fees se esperan entre sí.
  - Las dos envuelven `retryOnDeadlock` y el timeout de 15 s de fees.
- **`AccountAdminUnit`:**
  - `ruleSet(id)` → `{ providerId, isActive } | null`.
  - `nameTaken(name, exceptAccountId?)`.
  - `lockSourceAccount(accountId, providerId)` → `boolean`: `UPDLOCK, HOLDLOCK` sobre la cuenta origen filtrada por proveedor.
  - `sourceFees(accountId)` → `FeeState[]`.
  - `insertAccount`, `updateAccount`, `insertFee`, `feeHistory(copied)`, `audit`.
- **Orden de creación:**
  1. Proveedor en alcance.
  2. Conjunto válido.
  3. Nombre libre.
  4. Bloqueo de la cuenta origen.
  5. Leer sus fees y `planCopy`.
  6. `insertAccount`.
  7. Fees copiados.
  8. Una fila `FeeHistory` `copied` por copia.
  9. `account.create`.

  La cuenta origen se bloquea **antes** de leer sus fees, así que un cambio de fee en curso termina antes o empieza después (escenario "Copia y cambio de fee simultáneos"). Las copias son `NULL…NULL` en una cuenta nueva sin fees, así que `TR_Fee_NoOverlap` no puede saltar; si saltara, el respaldo `overlapBackstop` de fees lo convierte en `409 fee_overlap`.
- **Historial de la copia.** La unidad de cuentas escribe la fila `copied` con su propio `copiedHistory`, reutilizando `snapshotJson`, y las copias con `columns`, `stateSelect`, `toState` y `overlapBackstop`, que se exportan del repositorio de escritura de fees. `FeeHistoryWrite` de fees no cambia: ninguna escritura de fees produce `copied`. No hace falta una entrada `fee.*` por copia en `AuditLog`: la única entrada `account.create` lleva los pares `{ sourceFeeId, feeId }`.
- **Edición:** `inAccount`. Se relee la cuenta bajo bloqueo, `planAccountPatch`, y luego conjunto válido y nombre libre (si cambian), `updateAccount` y la auditoría. Si no hay cambios, no hay escritura y `updatedAt` no cambia.

### D5. Nombre único: comprobación previa + respaldo del índice

- Comprobación dentro de la transacción con `findFirst({ where: { name } })` (y `accountId ≠ actual` al editar). La intercalación de la base, `SQL_Latin1_General_CP1_CI_AS` por defecto, compara sin distinguir mayúsculas. El test de integración del escenario "Nombre de otra cuenta del mismo proveedor" lo verifica con `providerc-usd`.
- **Respaldo:** dos altas simultáneas pasan la comprobación las dos, y la segunda choca con `Account_name_key`. El adaptador mssql la reporta como `P2002`, o con el número 2627/2601 en `driverAdapterError.cause.code`; se traduce a `AccountNameTakenError` por número, no por mensaje, como `isFeeOverlapTrigger`.
- **Alternativa descartada:** bloquear una fila "global" para serializar todas las altas. El índice ya garantiza la unicidad y el respaldo da el mismo `409`.

### D6. Auditoría

- `entityType = 'Account'` y `entityId` = el `accountId` en minúsculas, como fees.
- **`account.create`**: detalle `{ name, providerId, chargebackReservePolicy, rollingReserveCapAmt, matchingRuleSetId, copyFeesFromAccountId, copiedFees: [{ sourceFeeId, feeId }] }`.
- **Edición**: `{ changes, reason? }`. El dinero va como string decimal y nunca como número.
- **Renombrar** cambia también el nombre con el que se generan al vuelo los exports de intentos anteriores (`<cuenta>_B…`). Se acepta: la auditoría guarda el nombre anterior y los CSV no llevan el nombre en su contenido. El summary sí lo lleva, y mostrará el actual.

### D7. Cuenta cerrada en imports

- `AccountRef` del repositorio de imports gana `isActive`.
- `createImport` comprueba `account.isActive` justo después de `requireAccount`, dentro de `withStaged`, y lanza `AccountInactiveError` antes de leer los archivos. Al lanzar dentro de `withStaged`, los archivos ya subidos se borran.
- `requireAccount` no cambia para el resto de usos: listar imports, añadir o quitar archivos, pareo, análisis, validaciones, settlement, undo y pagos siguen funcionando con la cuenta cerrada.
- **Carrera aceptada:** un import creado milisegundos antes del cierre queda como "abierto" y sigue su curso. No se bloquea la cuenta al subir, porque la subida lee archivos de hasta 200 MiB y no debe retener un bloqueo.

### D8. Lecturas ampliadas

- `findAccount`: `include` de `createdBy { userId, userName }` y `updatedAt`.
- `listAccountChannels` y `listChannelAccounts`: `assignedInBatch { batchNo }`.
- **`listChannels`**: un `select` de la fila de `AccountChannel` con `isPrimary = true` y la cuenta y el merchant de su proveedor. `primaryAccount` es `null` si no hay principal o si su merchant no está en el alcance, con la misma regla que ya aplica `AccountChannelItem.primaryAccount`. Una consulta, sin N+1.
- **`GET /providers/{id}/matching-rule-sets`** en `matching`: `http/matching-routes.ts`, un `RuleSetReadService` y un método en el repositorio Prisma (`matchingRuleSet.findMany` con `accounts`), registrado desde un `matching-module.ts` nuevo. El alcance se comprueba con el proveedor, como `listProviderChannels`: `404` si no se ve. Las cuentas enlazadas son del mismo proveedor y por tanto del mismo merchant, así que no hay que ocultar ninguna. `admin-matching` añadirá a este módulo `POST`, el detalle y `PUT`.

### D9. Bruno repetible y tests robustos ante cuentas `bruno-`

- **Flujo `20-flows/accounts`**, con `admin` y en Provider C:
  1. **Create account**: `bruno-<id>` con `copyFeesFromAccountId = ProviderC-USD` y el conjunto "Provider C legacy". El `id` sale de `Date.now()` en base 36 y deja el nombre en ≤ 50 caracteres.
  2. **Duplicate name**: `409`.
  3. **Copied fees**: cinco, `NULL…NULL`.
  4. **Rule sets**: la cuenta aparece en "Provider C legacy".
  5. **Edit**: política y tope.
  6. **Close**.
  7. **Upload to closed account**: `analyst`, `409 account_inactive`.
  8. **Reopen and close**: deja la cuenta cerrada.

  Cada pasada deja una cuenta `bruno-` cerrada más, con cinco fees, hasta el siguiente `pnpm db:seed`.
- **`10-smoke`:**
  - `Create account - analyst` (`403`);
  - `Create account - unknown provider` (`404`, `admin`);
  - `Patch account - viewer` (`403`);
  - `Patch account - unknown` (`404`, `admin`);
  - `Patch account - providerId` (`400`);
  - `Matching rule sets` (`200`);
  - `Matching rule sets - viewer out of scope` (`404`).

  Ninguna escribe.
- **Tests con listas exactas de cuentas:** `catalog.int.test.ts` y cualquier otro que se encuentre con `ProviderA-EUR', 'ProviderA-USD'`, `toHaveLength` sobre cuentas o nombres de cuentas filtran `name.startsWith('bruno-')` con un ayudante `seedAccounts()` en `test/integration/helpers.ts`.
- **Tests de integración del change:** crean cuentas `it-acc-<n>`. En un `afterEach` borran, en orden de claves foráneas, `AuditLog` (Account y Fee de esas cuentas), `FeeHistory`, `Fee`, `Import` y `Account`. Al correr en serie, no los ve ningún otro fichero.

### D10. Rutas y orden de respuestas

- `POST /providers/:providerId/accounts` y `PATCH /accounts/:accountId` con `preHandler: app.requirePermission('account.manage')`, `tags: ['accounts']` y respuestas `201`/`200`, `400`, `401`, `403`, `404` y `409`.
- Grupo 1: handlers provisionales en `501 not_implemented`, como en `admin-fees`.

## Risks / Trade-offs

- [Intercalación sensible a mayúsculas en algún entorno] → El test de integración "providerc-usd" lo detecta. El despliegue usa la misma imagen y la misma base (`infra/`).
- [La copia mantiene bloqueada la cuenta origen mientras se insertan hasta ~20 fees] → Transacción corta. Las escrituras de fees de esa cuenta esperan, como mucho, el timeout de 15 s.
- [Cuentas `bruno-` acumuladas en la base local] → Están cerradas, se ignoran en los tests y desaparecen con `pnpm db:seed`. En Accounts aparecen como `closed`.
- [Renombrar cambia el nombre de exports de intentos anteriores] → Aceptado y auditado (D6). README §1.2 lo dirá.
- [La comprobación de cuenta cerrada no se hace bajo bloqueo] → Carrera de milisegundos aceptada (D7).
- [`ChannelListItem` cambia la forma de `GET /channels`] → Solo añade un campo. El frontend actual lo ignora; los fixtures de MSW se amplían en el grupo 1.

## Migration Plan

- Sin migración de base.
- Despliegue normal (`scripts/deploy.sh build | up`).
- **Rollback:** revertir el PR. Las cuentas creadas siguen siendo válidas para el código anterior, porque usan las mismas columnas.
