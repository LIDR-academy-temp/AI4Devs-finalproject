# Design — admin-fees

## Context

La motivación está en `proposal.md` y el comportamiento en la delta spec `specs/fees/spec.md`. Lo que condiciona el diseño, comprobado en el código:

**El módulo `fees` hoy es solo de lectura.**
- `FeeReadService` y `PrismaFeeRepository` sirven `GET /accounts/{id}/fees` y `GET /fee-types`.
- `domain/fee-selection.ts` (`isInForce`, `feeInForce`, `businessDay`) y `domain/fee-amount.ts` ya existen y se reutilizan.
- `POST /accounts/{id}/fees` no existe, aunque el README lo marque con ✅.

**Lo que ya tiene la base de datos.**
- `Fee` tiene todas las columnas de README §3.2, incluidas las variantes.
- `FeeHistory` tiene `action` (`created|updated|closed|copied`, en `CK_FeeHistory_action`), `beforeJson`, `afterJson` y `reason NVARCHAR(500)`.
- Restricciones: `CK_Fee_amountOrPercentage`, `CK_Fee_validity` (`endDate >= startDate`), `CK_Fee_percentages` (0–1) y el trigger `TR_Fee_NoOverlap` (`THROW 50001`).
- **No hace falta migración.**
- `AuditLog` es genérico. No hay módulo `audit`: cada repositorio escribe en él dentro de su transacción, como `prisma-settlement-repository.ts`.

**Uso de los fees.**
- `SettlementTransactionFee.feeId` es `NOT NULL`, con `eventDate` y `configurationSnapshot`. `SettlementBatchFee.feeId` admite NULL.
- El motor guarda el snapshot completo, así que editar un fee nunca altera lo ya procesado.
- El motor no aplica las variantes (`hasVariant` en `settlement/domain/transactional-fees.ts`).

**Seed.**
- Todas las cuentas tienen fees `NULL…NULL` creados por `admin`.
- Su fila `FeeHistory.created` lleva `afterJson` con **números** JSON (`"percentage":0.1`) y `reason: "seed"`.
- Las cuentas con batches sembrados tienen sus fees en uso.

**Errores y permisos.**
- Los errores de dominio extienden `DomainError` (`status`, `code`, `details`).
- La validación de esquema de Fastify responde `400 validation_error` con `details` como lista de `{ path, message }`.
- `app.requirePermission(...)` va en `preHandler`, antes del handler, y el alcance se resuelve en el repositorio (`scope.merchantIds`). Por eso el `403` sale antes que el `404`.
- Solo el rol `admin` tiene `fee.manage`. La colección Bruno no tiene login de `admin`.

**Reintento.** `settlement/infrastructure/deadlock-retry.ts` reintenta ante el error 1205.

## Goals / Non-Goals

**Goals:**
- Un contrato en `@recon/shared` que la sesión de pantallas pueda usar desde el primer grupo de tareas.
- Las reglas de vigencia, solape y uso como funciones puras con tests.
- Escrituras atómicas con bloqueo por cuenta.
- Ningún cambio de comportamiento en lo que ya lee Settlement Review.

**Non-Goals:**
- Simulate (roadmap).
- Retirar un fee programado y sin uso: va a roadmap, ver D4.
- Copiar fees al crear una cuenta (`admin-accounts`).
- Aplicar las variantes en el motor.
- El mantenimiento del catálogo de tipos (#60).
- Las pantallas (`web-admin-fees`).
- Cambiar el bloqueo del procesado de settlements (ver Riesgos).

## Decisions

### D1. Estructura

```
packages/shared/src/fees.ts
  AccountFee (extended), FeeCreate, FeePatch, FeeUpdateResult,
  FeesQuery, FeeListItem, FeePage, FeeHistoryQuery, FeeHistoryEntry, FeeSnapshot, FeeErrorCode

backend/src/modules/fees/
  domain/fee-validity.ts       pure: status, overlap, previous day, closing against the last applied event
  domain/fee-patch.ts          pure: classifies the PATCH (correct | change), editable fields by use; before/after rows
  domain/fee-snapshot.ts       pure: row ⇄ FeeSnapshot; reads the legacy history with JSON numbers
  application/errors.ts        FeeOverlapError, FeeInUseError, FeeRuleError (400 with details.field)
  application/fee-admin-service.ts   create, patch, list, history
  application/ports.ts         + FeeAdminRepository
  infrastructure/prisma-fee-admin-repository.ts   transaction + account lock + usage + history + audit
  http/fee-admin-routes.ts     POST, PATCH, GET /fees, GET history
```

`FeeReadService` se queda igual. Solo cambia `toStoredFee`, que pasa a rellenar los campos nuevos de `AccountFee`.

### D2. Contrato compartido (fuente de `web-admin-fees`)

Todos los importes son `Money4` y todos los porcentajes `Rate6` (strings). Las fechas de vigencia son `IsoDate | null`.

**`AccountFee`**, ampliada de forma aditiva. Conserva sus campos y añade:
- `conditionalPercentage`, `conditionThresholdAmt`, `brandFixedAmount` y `brandPercentage`, nullable;
- `status: 'active' | 'scheduled' | 'closed'`;
- `inUse: boolean`;
- `lastAppliedEventDate: IsoDate | null` (null si no hay uso, D5). La pantalla lo usa como fecha mínima de cierre y como mínimo de `effectiveFrom − 1`;
- `createdBy: { userId, userName }`, `createdAt` y `updatedAt` (ISO con `Z`).

**`FeeCreate`** (`strictObject`):

| Campo | Tipo |
|---|---|
| `feeTypeId` | entero, obligatorio |
| `fixedAmount`, `percentage` | opcionales, nullable |
| las cuatro variantes | opcionales, nullable |
| `startDate`, `endDate` | `IsoDate \| null`; si se omiten, `null` |
| `description` | opcional, hasta 100, admite `null` |

La regla "al menos uno de importe o porcentaje" **no** está en Zod: la aplica el dominio con `details.field` (D9). Así el mensaje es el de README §4.1 y el front lo puede pintar junto al campo.

**`FeePatch`**: unión de dos `strictObject`, que se distinguen porque esté o no `effectiveFrom`:
- **Corrección:** subconjunto no vacío de los campos de `FeeCreate` sin `feeTypeId`, más `reason?`.
- **Cambio desde una fecha:** `{ effectiveFrom, ...valores, reason? }`, con al menos un valor entre importes, porcentajes, variantes y `description`, y sin `startDate` ni `endDate`.

En las dos formas, `reason` tiene de 1 a 500 caracteres sin contar los espacios de los extremos. `feeTypeId` o `accountId` cuentan como clave desconocida y dan `400`.

**Resto de esquemas:**

| Esquema | Forma |
|---|---|
| `FeeUpdateResult` | `{ fee: AccountFee, successor: AccountFee \| null }` |
| `FeesQuery` | `merchantId?`, `providerId?` (enteros), `accountId?` (uuid), `kind?` (`transactional\|preset\|free_amount`), `status?` (`active\|scheduled\|closed`), `q?` (1–100), `page` (≥ 1, por defecto 1), `pageSize` (1–500, por defecto 50) |
| `FeeListItem` | `AccountFee & { merchant: { id: number, name }, provider: { id: number, name }, account: { id: uuid, name } }` |
| `FeePage` | `{ items, page, pageSize, total }` |
| `FeeHistoryQuery` | `{ scope?: 'fee' \| 'type' }` |
| `FeeHistoryEntry` | `{ feeHistoryId, feeId, action, changedAt, changedBy: { userId, userName }, reason, before: FeeSnapshot \| null, after: FeeSnapshot }` |
| `FeeSnapshot` | campos de configuración en forma de API: `feeTypeId`, importes, porcentajes, variantes, `startDate`, `endDate`, `description` |
| `FeeErrorCode` | `fee_overlap` con `details: { conflicts: { feeId, startDate, endDate }[] }`; `fee_in_use` con `details: { fields?: string[], lastAppliedEventDate?: IsoDate }` |

### D3. Las dos formas del PATCH

`domain/fee-patch.ts` recibe el fee actual, su uso (`inUse`, `lastAppliedEventDate`) y el cuerpo, y devuelve las filas que hay que escribir o un error.

**1. Corrección.**
- Si el fee está en uso y llegan campos distintos de `description` y `endDate`, devuelve `FeeInUseError({ fields })`.
- Si el fee está en uso y llega `endDate`, debe ser `≥ lastAppliedEventDate`; si no, `FeeInUseError({ lastAppliedEventDate })`.
- La fila resultante pasa las reglas de un fee válido.
- La acción es `closed` si solo cambia `endDate` de `null` a una fecha, y `updated` en cualquier otro caso.

**2. Cambio desde una fecha.**
- Comprueba que `startDate < effectiveFrom` (o que `startDate` sea nulo) y que `endDate` sea nulo o `≥ effectiveFrom`. Si no, `400` con `field: effectiveFrom`.
- `effectiveFrom − 1` debe ser `≥ lastAppliedEventDate`.
- Resultado:
  - el original con `endDate = effectiveFrom − 1` (acción `closed`);
  - un sucesor con `feeId` nuevo, `startDate = effectiveFrom`, el `endDate` original y la configuración fusionada (acción `created`).
- Se permite sobre un fee en uso: es la forma prevista de cambiar sus valores.

Las fechas se manejan como strings `YYYY-MM-DD`. "Menos un día" se calcula sobre la fecha civil, sin zona horaria.

### D4. Retirada de un fee programado y sin uso → roadmap (#109)

**Qué se aplaza.** La retirada (D4-A): un intervalo vacío `endDate = startDate − 1`, que la selección ya excluye por sí sola, con la migración `0009_fee_withdrawal`. Esa migración relajaría `CK_Fee_validity` y haría que `TR_Fee_NoOverlap` ignorase los intervalos vacíos.

**Por qué.**
- No se tocan la CHECK ni el trigger antes de la entrega.
- Un fee programado y sin uso se puede corregir en el sitio entero (fechas, valores, descripción), así que un error de alta se arregla sin anularlo.

**Qué queda fuera.** No hay `withdraw` en `FeePatch`, ni estado `withdrawn`, ni `fee_withdrawn`, ni `fee.withdraw`.

**Descartada:** una columna `withdrawnAt`, porque obligaría a filtrar en cada lectura.

### D5. Uso y último evento aplicado

- `inUse` = existe alguna fila en `SettlementTransactionFee` con ese `feeId`, o alguna en `SettlementBatchFee`.
- `lastAppliedEventDate` = el mayor de dos valores, o `null` si no hay ninguno:
  - `CAST(MAX(stf.eventDate) AS date)`;
  - `MAX(sb.settlementDate)` de los batches que lo usan como `SettlementBatchFee.feeId`.
- Cuentan **todos los intentos, también los `undone`**. Sus filas siguen existiendo y sus exports se regeneran desde lo escrito, así que es la opción conservadora.
- `eventDate` es hora de pared de Nueva York sin zona, así que su parte de fecha es el día de negocio.

**Dónde se calcula:**
- En las escrituras, dentro de la transacción y después del bloqueo.
- En las lecturas, en la misma consulta, con subconsultas `EXISTS` y `MAX` agrupadas por `feeId`:
  - `GET /accounts/{id}/fees`: para los fees de la cuenta;
  - `GET /fees`: solo para los `feeId` de la página pedida, en una segunda consulta.

### D6. Atomicidad, bloqueo y solapes

Cada escritura va en una transacción `prisma.$transaction`, en este orden:

1. `SELECT accountId FROM Account WITH (UPDLOCK, HOLDLOCK) WHERE accountId = @id`, con la cuenta ya filtrada por alcance. Así se serializan las escrituras de fees de una misma cuenta; dos altas simultáneas esperan la una a la otra.
2. Se leen los fees de la cuenta y el tipo, y su uso.
3. El dominio decide.
4. `findOverlaps` (pura) comprueba las filas resultantes contra los demás fees del mismo tipo, usando los centinelas e ignorando la propia fila. Si hay solape, `FeeOverlapError({ conflicts })`.
5. Se escriben `Fee`, `FeeHistory` y `AuditLog`.

**Respaldo.** Si el trigger lanza el 50001 (una escritura que se saltó el caso de uso), el repositorio lo traduce a `FeeOverlapError` con `conflicts: []`.

**Orden en el cambio desde una fecha.** El original se actualiza **antes** de insertar el sucesor, para que el trigger vea ya el cierre.

**Interbloqueos (1205).** Se reintentan con `deadlock-retry`. Si importarlo desde `settlement` acopla los módulos, se mueve a `backend/src/infrastructure/` sin cambiar su comportamiento, y los tests existentes siguen en verde.

### D7. Estado y "hoy"

`statusOf(fee, today)` es pura:
- `scheduled` si `start > today`;
- `closed` si `end < today`;
- `active` en cualquier otro caso.

`today` es el día de calendario en America/New_York, calculado una vez por petición con `Intl` (como en `exports/audit-time.ts`). Los tests lo inyectan como reloj.

### D8. `GET /fees`

- **Base:** consulta Prisma sobre `Fee` con `account.provider.merchantId IN scope`.
- **`kind`:**
  - `transactional` → `feeType.isTransactional = true`;
  - `preset` → no transaccional con `allowsFreeAmount = false`;
  - `free_amount` → no transaccional con `allowsFreeAmount = true`.
- **`status`:** los predicados de D7 en SQL, sobre `today`.
- **`q`:** `contains`. La collation de la base no distingue mayúsculas.
- **Total:** `count`.
- **Orden:** `merchant.name`, `provider.name`, `account.name`, `feeType.title`, `startDate` (SQL Server pone los `NULL` primero en `ASC`) y `feeId`.
- **Filtros por entidad:** un `merchantId`, `providerId` o `accountId` se comprueba antes contra el alcance. Si no existe o queda fuera, `NotFoundError('Merchant' | 'Provider' | 'Account')`.
- **Uso:** `inUse` y `lastAppliedEventDate` solo para los `feeId` de la página (D5).

### D9. Errores

| Código | Estado | Cuándo | `details` |
|---|---|---|---|
| `validation_error` | 400 | El esquema no valida (Fastify) | lista de `{ path, message }` |
| `validation_error` | 400 | Reglas cruzadas del dominio: ni importe ni porcentaje, `endDate < startDate`, tipo inactivo, `effectiveFrom` fuera de la vigencia | `{ field }` |
| `fee_overlap` | 409 | Solape con otro fee | `{ conflicts }` |
| `fee_in_use` | 409 | Fee en uso: campos no editables, o cierre o cambio anterior al último evento aplicado | `{ fields }` o `{ lastAppliedEventDate }` |
| `not_found` | 404 | Fee, cuenta, merchant o proveedor inexistente o fuera del alcance | — |
| `forbidden` | 403 | Sin `fee.manage` / `fee.view`; se comprueba antes del alcance | — |

`FeeRuleError` extiende `DomainError` con `status = 400` y `code = 'validation_error'`, así que el error handler no cambia.

### D10. Historial y auditoría

**Formato.** `FeeHistory.beforeJson` y `afterJson` se escriben con `FeeSnapshot`: strings decimales y fechas `YYYY-MM-DD`.

**Historial del seed.** El lector (`fee-snapshot.ts`) acepta también el formato que deja el seed, con números JSON. Cada número se normaliza con `new Prisma.Decimal(String(n)).toFixed(4|6)`.

**`scope=type`.** Primero resuelve el fee con su alcance y luego lee el historial de todos los fees de su cuenta y tipo. Orden: `changedAt DESC`, `feeHistoryId DESC`.

**`AuditLog`.** Siempre con `entityType = 'Fee'` y `entityId = feeId` en minúsculas. Cada entrada lleva `reason` si se envía.

| Acción | `detailJson` |
|---|---|
| `fee.create` | — |
| `fee.update` | campos cambiados |
| `fee.close` | `endDate` |
| `fee.change` | `successorFeeId` y `effectiveFrom` |

### D11. Rutas provisionales del grupo 1

Para publicar el contrato antes de la lógica, el grupo 1 declara las cuatro rutas con su esquema y su `preHandler` de permiso. Mientras tanto, los handlers responden `501 not_implemented` con el cuerpo de error uniforme.

Así, `docs/openapi.yaml` y `schema.gen.ts` salen completos y `web-admin-fees` puede generar su cliente y trabajar contra MSW. Los grupos 4 y 5 sustituyen los handlers.

### D12. Colección Bruno

**Login.** Se añade `00-auth/Login as admin` con:
- `SEED_ADMIN_USER` en `.env.example`;
- `{{adminToken}}`;
- `as: admin`, documentado en `collection.bru` y en `CLAUDE.md`.

**`10-smoke`.** Negativos:

| Petición | Usuario | Respuesta |
|---|---|---|
| `POST` | `analyst` | `403` |
| `PATCH` de un uuid inexistente | `admin` | `404` |
| `GET /fees` sin token | — | `401` |
| `GET /fees?merchantId=2` | `viewer` | `404` |
| Historial de un fee de ProviderC-Alt | `viewer` | `404` |
| `POST` sin importe | `admin` | `400` |
| `GET /fees?pageSize=0` | — | `400` |

Casos felices: `GET /fees` e historial.

**`20-flows/fees/`.** Secuencia con `admin` sobre una cuenta del merchant 1:
1. Crea un `Wire Fee` de un día, en una fecha futura derivada de la ejecución (`2100-01-01` + (`Date.now()` mod 36500) días), y guarda el `feeId`.
2. Crea otro solapado → `409 fee_overlap`.
3. Corrige la descripción → `200`, acción `updated`.
4. Cambia desde el día siguiente → `200` con sucesor.
5. Pide el historial con `scope=type`.
6. Hace `PATCH` con `percentage` sobre un fee del seed en uso → `409 fee_in_use`.

La secuencia acumula filas en la base local; se limpian con `pnpm db:seed`.

### D13. Documentación

**README:**
- §1.2: simulate pasa a roadmap. En "Limitaciones conocidas" se añaden las variantes que el motor no aplica y la retirada de un fee programado (#109).
- §1.5: se quitan los fees de la fila de #80.
- §3.2: la forma de `FeeHistory` y `lastAppliedEventDate`.
- §4.1: `fee_overlap`, la respuesta plana de `AccountFee` y `brandPercentage` en `FeeCreate`.
- §4.4: los códigos de error en las filas de fees, ✅ en lo implementado y simulate como roadmap.

**Además:** se regeneran `docs/openapi.yaml` y `schema.gen.ts`, y se actualiza `CLAUDE.md` (D12).

## Risks / Trade-offs

- **[Carrera con el procesado]** `settlement-process` lee los fees sin bloquear la cuenta. Un `PATCH` que corrija en el sitio un fee sin uso mientras un settlement lo está aplicando dejaría un desglose con la configuración anterior (el snapshot guarda la correcta) y un historial `updated` posterior.
  → Riesgo aceptado: el importe procesado es correcto gracias al snapshot y la ventana es de milisegundos en un uso administrativo. Se anota en #67; el settlement no se toca en este change.
- **[`undone` cuenta como uso]** Un fee aplicado solo en un intento deshecho no se puede corregir en el sitio.
  → Se cambia desde una fecha, o se cierra con `endDate` ≥ su evento. Es la opción conservadora.
- **[Historial del seed con números]** El lector es tolerante, pero un número con muchos decimales podría redondear al normalizarse.
  → Los valores del seed tienen como mucho 3 decimales, y un test fija la conversión.
- **[Sin retirada]** Un fee programado que se creó por error se queda en la cuenta.
  → Se corrige en el sitio (fechas o valores) mientras no tenga uso. La retirada real está en #109.
- **[Variantes sin aplicar]** El API acepta configuraciones que el motor ignora.
  → Es una limitación documentada en el README, y el front no las expone en `web-admin-fees`.
- **[Contrato antes que la lógica]** Si los grupos 4 y 5 cambian algún esquema, `web-admin-fees` queda desfasado.
  → `pnpm openapi:check` en 5.4. Si cambia algo, se regenera y se avisa.
