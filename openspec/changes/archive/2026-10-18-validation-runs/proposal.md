# Proposal

## Why

El motor de validaciones (#8, change `validation-engine`) produce el informe solo en memoria: no hay corridas guardadas, ni forma de ver un hallazgo con sus apariciones, ni acciones del analista, ni decisión de conjunto. Sin eso, un import `analyzed` no puede pasar a `validated` y el tramo 4 (#11, procesar el batch) no tiene sobre qué trabajar. Este change cierra HU2 en el backend (criterios 1–2 y 5–9, README §3.2, §3.3 y §4.4) y deja el contrato que necesita la pantalla (#10).

## What Changes

- **Adaptadores Prisma de los cinco puertos del motor** (`ValidationRowSource`, `AccountScopeSource`, `SettlementHistorySource`, `MissingCandidateSource`, `RegisteredMissingSource`) con las notas del traspaso de #8: `heldReserves` filtra por el plazo **vigente** del canal con un predicado sargable (`transactionDate <= DATEADD(day, -rollingReserveDays, @rMax)`) y `@rMax` viaja como `datetime2`; las candidatas I admiten `lastStatusChangedAt IS NULL`; la exclusión de procesadas va en SQL. Se mide la carga desde SQL Server.
- **Ampliación pequeña del motor**: la aparición `previous_batch` pasa a llevar `sheetId` y `rowNo` del movimiento histórico (ya están en `HistoryMovement`), para que el detalle muestre archivo, hoja y fila también de las apariciones históricas (HU2 CA2).
- **Persistencia de la corrida** (`POST /imports/{id}/validations`): una corrida nueva marca la anterior como superada sin borrarla y guarda los ocho `ValidationResult`, los `ValidationIssue` (con `missingRange`, `gatewayStatusId` y `source` en `detailJson`) y las `ConflictOccurrence` (con `defaultIncluded` como `includeInSettlement` inicial).
- **Lecturas**: `GET /imports/{id}/validations` (corrida vigente: resultados, conteos, bloqueo, rangos, contadores informativos, `manualChangeCount`, revisión vigente y última revisión invalidada), `GET /imports/{id}/validation-issues?type=&scope=&status=&validationCode=&cycle=&page=&pageSize=` y `GET /validation-issues/{id}` (hallazgo con todas sus apariciones, el usuario y la fecha de la resolución y de cada cambio de inclusión).
- **Acciones opcionales, auditadas con usuario y fecha**: `PATCH /conflict-occurrences/{id}` (`includeInSettlement`, en `analyzed` o `validated`; en ciclo R, como máximo una aparición incluida y ninguna si la reserva ya se liberó en un batch anterior) y `PATCH /validation-issues/{id}` (resolver a mano un `non_recorded_adjustment` o un `status_mismatch`, con nota). Las dos respuestas devuelven el usuario y la fecha.
- **Decisión de conjunto** (`POST /imports/{id}/review`): "continuar" sobre una corrida concreta (`runId`); pasa el import a `validated` solo si esa corrida es la vigente y no está bloqueada (`409 blocking_validation_issue` con `provider_mismatch`, sin override); la aprobación queda en `AuditLog` con el usuario. Cancelar sigue siendo `POST /imports/{id}/cancel` (ya existe), que ahora registra también la corrida vigente.
- **Invalidación de la revisión**: re-ejecutar las validaciones o cambiar una inclusión sobre un import `validated` lo devuelve a `analyzed` en la misma transacción y deja auditada la revisión invalidada (quién y cuándo revisó, quién, cuándo y por qué se invalidó).
- **Máquina de estados del import**: nuevas transiciones `analyzed → validated` (review) y `validated → analyzed` (re-ejecución o cambio de inclusión); validar en `analyzed` o `validated`; resolver una fila ambigua deja sin corrida vigente al import (hay que volver a validar).
- **Gancho para #11**: puerto `MissingResolution` declarado (sin implementación) para pasar un faltante a `resolved` con su batch y devolverlo a `persistent` al deshacer.
- **Esquema (migración `0006_validation_runs`, escrita a mano dentro de `BEGIN TRY / BEGIN TRAN`, la aplica la persona)**: `ValidationRun.undatedAdjustmentCount` y `ValidationRun.undatedCandidateCount` (`INT NOT NULL DEFAULT 0`); índice único filtrado `UX_ValidationRun_current_import (importId) WHERE isSuperseded = 0` (una sola corrida vigente por import); `ImportSheet.sheetIndex INT NULL` (posición de la hoja en el libro, que la regla de "primera aparición" de README §3.3 necesita y hoy no se guarda; la rellena la subida). Sin cambios en otras tablas.
- **Contrato**: esquemas Zod en `packages/shared`, OpenAPI regenerado, colección Bruno (caso feliz y negativos de cada ruta), README (§3.2, §3.3 con la regla de inclusión de R, §4.4 y el ejemplo `BLOCKING_VALIDATION_ISSUE` de §4.3, que pasa a minúsculas).

### Concurrencia: cómo se garantiza una sola corrida vigente

Toda escritura del flujo (validar, revisar, cambiar una inclusión, resolver una fila, cancelar) empieza con una `UPDATE` con guarda sobre la fila de `Import`, que la bloquea en exclusiva hasta el commit, y por eso las escrituras se serializan. La corrida se calcula fuera de la transacción y se persiste solo si el import sigue en `analyzed` o `validated` **y** con el mismo `updatedAt` que tenía al empezar: de dos corridas simultáneas, una gana y la otra recibe `409 import_changed` sin escribir nada. El índice único filtrado es la última barrera. Si un review se cruza con una corrida, gana el que confirma primero. Si gana el review, la corrida recibe `409 import_changed` (el review cambió el import) y no invalida una revisión que nadie vio invalidar. Si gana la corrida, el review recibe `409 validation_run_superseded`, porque pide el `runId` que el analista revisó. Detalle en design D4.

## Capabilities

### New Capabilities

Ninguna: corridas, hallazgos, acciones y revisión amplían `validation`, cuyo propósito ya incluye "hallazgos y decisiones de inclusión" de HU2.

### Modified Capabilities

- `validation`: persistencia de corridas (vigente y superadas), lecturas de corrida, hallazgos y detalle, cambio de inclusión (con el límite de R), resolución manual, decisión de conjunto y su invalidación, aparición histórica con hoja y fila, adaptadores de los puertos con sus límites exactos y rendimiento de extremo a extremo.
- `import`: máquina de estados (`analyzed ↔ validated`, validar en `analyzed` o `validated`, resolver una fila supera la corrida vigente) y cancelación (registra la corrida vigente).

## Impact

- **Backend**: `modules/validation/{application,infrastructure,http}` nuevos (servicio, repositorio, adaptadores, rutas, módulo); `modules/validation/domain/types.ts` y `across-batches.ts` (aparición histórica con hoja y fila); `modules/imports` (`import-state.ts`, `prisma-import-row-repository.ts` al resolver una fila, `import-service.ts` al cancelar); `app.ts` registra el módulo.
- **Shared**: `packages/shared/src/validation.ts` (esquemas de request y response).
- **Base de datos**: migración `0006_validation_runs` y `schema.prisma` (tres columnas). La subida (`prisma-import-repository.ts`) guarda `sheetIndex`; los imports ya existentes quedan con `NULL` y se ordenan por nombre de hoja (design D2). Permisos: los del seed bastan (`settlement.process` para escribir; lecturas solo con autenticación, como en README §4.4). No falta ninguno.
- **Contrato**: `docs/openapi.yaml`, `frontend/src/lib/api/schema.gen.ts` regenerados; `api-collection/` (`10-smoke`, `20-flows/validations`).
- **Sin dependencias nuevas.**

## Fuera de alcance

- **Criterio 4 del issue / HU2 CA9** (un `missing_*` pasa a `resolved` al aparecer en un batch `processed` posterior y vuelve a `persistent` al deshacerlo): va en #11 (settlement-process). Aquí solo se declara el puerto `MissingResolution` (design D11).
- **Resumen previo por ciclo** (conteos e importes): pasa de #10 a #13 (frontend-settlement) por decisión de alcance. No hay endpoint de agregados en este change.
- **Heredar las acciones manuales entre corridas** (inclusiones cambiadas y resoluciones a mano): deuda de la Entrega 3. Mientras tanto, `run.manualChangeCount` permite a #10 avisar antes de re-ejecutar.
- **Plazo aplicado en vez del vigente** para el vencimiento de reservas: sigue como deuda en #44.
- **Pantalla** Analysis & Validations: #10. Comunicaciones al proveedor: fuera de la aplicación.
- **Cómo se combinan las inclusiones** de una fila presente en varios hallazgos al procesar: lo decide #11, como ya fija README §3.3.

## Decisiones de la revisión (2026-10-18)

Las siete preguntas que el README no resolvía quedaron decididas en la revisión del design. Cada una está en la spec marcada con su número.

- **P1. Re-validar un import `validated`: sí.** La corrida nueva supera a la anterior, el import vuelve a `analyzed` y la revisión queda invalidada y auditada. Motivo: el criterio 1 de #9 y el 4 de #10 hablan de que "la revisión anterior queda invalidada". `import_not_analyzed` cubre solo `uploaded`, `mapped`, `processed` y `cancelled`.
- **P2. Solo las apariciones `current_import` admiten cambiar `includeInSettlement`.** Una `previous_batch` → `409 occurrence_not_editable`, porque es evidencia de un batch ya procesado.
- **P3. Inclusión manual por ciclo.**
  - **R**: como máximo una aparición incluida por hallazgo, y ninguna del import actual si otra es `previous_batch` (esa reserva ya se liberó). Error: `409 occurrence_not_includable` con `reason` (`reserve_already_included` / `reserve_already_released`). Fuente: la regla "Ciclo R sin estado" del change archivado `validation-engine`; se lleva también a README §3.3.
  - **I**: incluir a mano está permitido y auditado.
  - **E**: también permitido y auditado, en el batch y entre batches (README §3.2: "incluso para incluir un duplicado detectado").
  - Queda para #11 que `SettlementTransaction` tiene `UNIQUE (transactionId, cycle, batchId)`: Refund + Chargeback, Chargeback + `CHB 2` y las apariciones incluidas a mano de la misma clave no caben en un mismo batch.
- **P4. Cambiar una inclusión se permite en `analyzed` y en `validated`.** En `validated`, en la misma transacción, el import vuelve a `analyzed` y la revisión queda invalidada y auditada; la corrida se conserva.
- **P5. Resolver a mano un `non_recorded_adjustment` / `status_mismatch`**: en cualquier estado del import, si el hallazgo es de la corrida vigente; sin vuelta atrás (`409 issue_already_resolved`).
- **P6. Lo hecho a mano no pasa a la corrida siguiente.** Cada corrida nace con las inclusiones por defecto y los hallazgos `persistent`, y lo anterior queda en la corrida superada y en `AuditLog`. El contrato añade `run.manualChangeCount` (apariciones con `includeInSettlement` distinto de `defaultIncluded` más hallazgos resueltos a mano) para que #10 avise antes de re-ejecutar. Heredarlas es deuda de la Entrega 3.
- **P7. Resolver una fila ambigua invalida la corrida.** La corrida vigente pasa a superada sin sustituta y el review exige validar de nuevo (`409 validation_run_required`). Solo ocurre en `analyzed`, así que no hay revisión que invalidar.

Rendimiento: umbral aprobado. Menos de 2 s en local, anotado en el PR, y menos de 4 s en el test. El bench va condicionado a `RECON_BENCH=1`, no corre en CI y se ejecuta con la máquina tranquila (sin `pnpm dev`).

## Insumos que necesito de la persona

1. Revisar el SQL de `0006_validation_runs` y aplicarlo con `! pnpm db:migrate` (no hay base sombra, `P3014`); después, `! pnpm db:seed` si la base local no está sembrada.
2. Ejecutar el bench con `RECON_BENCH=1` con la máquina tranquila, o dejar que lo ejecute el agente con `pnpm dev` parado, y anotar la cifra en el PR.
3. `api-collection/.env` presente (copiado de `.env.example`, con `SEED_PASSWORD` igual al de la raíz) y `pnpm dev` levantado para ejecutar la colección.
