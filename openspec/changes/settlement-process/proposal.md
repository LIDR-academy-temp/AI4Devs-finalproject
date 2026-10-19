# Proposal

## Why

Un import llega hoy hasta `validated` (#9, `validation-runs`) y ahí se detiene: no existe forma de convertirlo en un intento de batch, así que no hay movimientos por ciclo, ni fees aplicados, ni reservas, ni summary, y la demo de la Entrega 2 no cierra. Este change implementa `POST /imports/{id}/settlements` y `GET /accounts/{id}/batch-number/next` (README §4.3, §4.4) para HU3 CA 1–5 (issue #11, núcleo de RT2-DB-001) y deja los contratos que necesitan la pantalla (#13) y el summary con sus CSV (#12). También cierra lo que `validation-runs` dejó pendiente: la clave única de `SettlementTransaction`, la precondición de procesar y el gancho `MissingResolution`.

## What Changes

- **Oráculos y seed corregidos primero** (grupo 0 de tasks): RDR con importe, payable que resta los fees por batch, cálculos a 4 decimales con `Decimal`, fee de Chargeback en ProviderC-Alt y sección `summary` en `legacy-provider/expected.json`.
- **Procesar** (`POST /imports/{id}/settlements`, permiso `settlement.process`): desde `validated`, en **una** transacción con guarda sobre `Import`, crea un `SettlementBatch` `processed` con `batchNo` (propuesto o editado) y `attemptNo`, un `SettlementTransaction` por aparición incluida y por ciclo E/I/R, los `SettlementBatchFee`, `SettlementBatchTotal` y `SettlementBatchBrandTotal`, pasa el import a `processed` con `currentBatchId`, asocia los canales a la cuenta y audita todo dentro de la misma transacción. Ningún movimiento queda Settled (`settlementStatusId = Unsettled`).
- **Número de batch** (`GET /accounts/{id}/batch-number/next?importId=`): el siguiente número de la cuenta o, si el import tiene un intento `undone`, su mismo número con `attemptNo + 1`. `409 batch_no_taken` si hay intento vigente con ese número.
- **Vista previa** (`POST /imports/{id}/settlements/preview`): el mismo cálculo sin escribir nada, para el "resumen previo" de Settlement Review (#13, decisión de alcance de #9). Ningún importe se calcula en el frontend.
- **Amount payable auditable**: toda vista (previa, respuesta, #12, #13) trae `payableBreakdown`, la lista ordenada de líneas con signo cuya suma es `amountPayable`, calculada por el servidor.
- **Fees por batch** prellenados desde `Other Fees` (ya los devuelve `GET /imports/{id}`): el request los manda confirmados, ajustados o añadidos. Los preestablecidos llevan `feeId` de un fee no transaccional de la cuenta. Los de importe libre llevan una categoría con `allowsFreeAmount`. Lecturas mínimas para el formulario: `GET /accounts/{id}/fees?transactional=false&asOf=` y `GET /fee-types` (README §4.4).
- **Asociación de canales**: los canales sin asociar o de otra cuenta exigen `confirmChannelAssignment: true` (`409 channel_assignment_not_confirmed`). Al procesar, la cuenta pasa a ser la principal del canal (`AccountChannel.isPrimary`) y queda auditado.
- **`MissingResolution`** implementado: `resolveForBatch` pasa a `resolved` los `missing` persistentes de corridas vigentes del proveedor cuyo `(transactionId, cycle)` entra en el batch. `reopenForBatch` queda listo para deshacer (tramo 6).
- **Recortable con punto de control** (grupo 11 de tasks): fees transaccionales por fecha de evento con desglose (`SettlementTransactionFee`, `configurationSnapshot`). Si el 2026-10-20 a mediodía el apply no ha llegado a ese grupo, se recorta igual. Sin él, `feeAmount = 0` y la advertencia `transactional_fees_not_computed` (design D17).
- **Esquema (migración `0007_settlement_process`, escrita a mano dentro de `BEGIN TRY / BEGIN TRAN`; la aplica la persona)**: **BREAKING** para el modelo: se elimina `UNIQUE (transactionId, cycle, batchId)` y se crea `UX_SettlementTransaction_batch_row (batchId, sheetId, rowNo) WHERE sheetId IS NOT NULL`, más una `CHECK` de que hoja y fila van juntas. `SettlementTransaction.eventDate` pasa a `NULL` para ajustes que no se pueden fechar (HU3 CA3: "no se inventa la fecha").
- **Contrato**: esquemas Zod en `packages/shared/src/settlement.ts` y `fees.ts`, OpenAPI regenerado y colección Bruno. En el README: §4.3 con códigos en minúsculas, mensajes en inglés, `runId` en el cuerpo y la forma real de la respuesta; §3.2 con la clave nueva, `eventDate` nullable y la combinación de inclusiones; §3.3 con la regla de inclusión del procesamiento y la fila con el gateway en `Pending`.

## Decisiones que toma este change (detalle y alternativas en design.md)

1. **Clave única de `SettlementTransaction`** (D3): un movimiento por **fila de origen** del batch, `(batchId, sheetId, rowNo)`, filtrado a las filas con origen (el histórico sembrado no tiene hoja). Admite Refund + Chargeback, Chargeback + `CHB 2` y duplicados incluidos a mano. *Descartado*: combinar las inclusiones en un movimiento por `(transactionId, cycle)`, porque Refund y Chargeback son eventos distintos, con importe y fee propios, y `CHB 2` lleva `excludeAmount`. Afecta a una lectura de `validation`: el `excludeAmount` de una aparición histórica pasa a buscarse por fila (D3).
2. **Precondición** (D5): solo desde `validated`, con el `runId` revisado en el cuerpo. Dentro de la transacción y tras la guarda se comprueba que la corrida vigente es ese `runId`, que no está bloqueada y que su última `import.review` sigue válida. Si la revisión se invalidó entre medias, el import ya está en `analyzed` y la guarda falla: `409 import_not_validated { status: "analyzed" }`, sin escribir nada. Con otra corrida revisada entre medias: `409 validation_run_superseded`.
3. **`MissingResolution`** (D11): implementado en `validation/infrastructure` con el cliente transaccional de Prisma (`Prisma.TransactionClient`). Se llama dentro de la transacción de procesar. Solo cuentan los hallazgos de corridas vigentes (`isSuperseded = 0`).
4. **Filas con estado no resuelto** (`statusId` nulo, E o I): no se procesan. No se descartan en silencio: van en `skipped.unresolvedStatus` de la vista previa y de la respuesta, y en la auditoría.
5. **Errores** en snake_case con mensajes en inglés: `import_not_validated`, `validation_run_superseded`, `blocking_validation_issue`, `batch_no_taken`, `channel_assignment_not_confirmed`, `batch_fee_invalid`. Se corrige el ejemplo de README §4.3 en este change.

## Decisiones del gate (2026-10-19)

- **Pending.** Si la transacción está en `Pending` en el gateway y la fila trae otro estado, la fila se procesa con el estado de la fila, igual que un desajuste APP/DEC. Es un desajuste que se corrige del lado del merchant. Solo se salta (`skipped.pending`) la fila cuyo propio estado es `Pending`. Que la validación lo marque como `status_mismatch` queda en P16.
- **P1. Redondeo.** Fees, reserva y totales se calculan a 4 decimales, sin redondear a céntimos. Lo que da más de 4 decimales (importe × porcentaje) se redondea mitad hacia arriba en el cuarto.
- **P2. RDR.** Un RDR descuenta del merchant igual que un Chargeback o un Refund: lleva su importe y resta en el amount payable. El importe 0 del seed y del oráculo es un error (el estado se introdujo más tarde) y se corrige en el grupo 0.
- **P3. Amount payable.** La fórmula de D15 se mantiene y el resultado tiene que ser auditable: `payableBreakdown` en todas las vistas (D15, D19).
- **P4, P5, P11, P13, P14: aprobadas** como estaban. Estado de la fila en E/I; filas que no se procesan por motivo; totales en positivo; número propuesto = máximo + 1; `resolveForBatch` sobre cualquier import del proveedor.
- **P6. Fecha de un ajuste.** Para un movimiento I, `eventDate` = `ImportRow.txnDate` (la fecha del proveedor) si viene en el archivo; si no, `Transaction.lastStatusChangedAt` cuando el estado del gateway es el de la fila; si no, `NULL` con la advertencia `undated_adjustment`. E sigue con `transactionDate`. No se conoce la zona horaria de las fechas del proveedor (Riesgos del design).
- **P7. Fees de `Other Fees`: aprobada la excepción.** Con `source = "file"` se admiten con `feeId = null` aunque el tipo no admita importe libre. El mantenimiento de tipos nuevos o desconocidos queda en #60 (roadmap).
- **P8. Fecha de negocio de referencia del batch:** `settlementDate`, editable por el analista; sin ella, el máximo de los rangos de la corrida. La hora actual solo va en los timestamps de auditoría.
- **P9.** Un preestablecido solo con porcentaje no se calcula: el analista lo agrega a mano como fee por batch con su importe.
- **P10.** El tope de reserva no se aplica en el MVP y se mantiene la advertencia `reserve_cap_not_applied`. La alerta de tope alcanzado queda en #61 (roadmap).
- **P12.** Aprobada ("una reserva no se libera dos veces"), pero va con la política de reserva ante chargeback a la Entrega 3.
- **P15.** `mdrAmt` es la suma de los fees MDR por movimiento y puede diferir del oráculo (`mdrIncludedInDeposit`, sobre el total): los nuestros son más precisos.
- **Recorte.** La política de reserva ante chargeback (antes grupo 12, D12) pasa a la Entrega 3 en #62, con P12 y el cambio de `heldReserves`. El contrato no cambia: `reserveEarlyReleasedAmt` existe y vale 0, y la advertencia `chargeback_reserve_policy_not_applied` sale si la cuenta es `release_on_chargeback`.

## Preguntas cerradas al empezar el apply (2026-10-19)

- **P6b. Fee de un ajuste sin fecha: aprobada la opción provisional.** Se aplica el fee de su tipo solo si es el único de la cuenta y su vigencia es `NULL…NULL` (vale para cualquier fecha); si no, no lleva fee y la advertencia lleva `feeSkipped = true`.
- **P16. `status_mismatch` con el gateway en `Pending`: no se arregla en este change.** El motor no lo genera (`backend/src/modules/validation/domain/non-recorded-adjustment.ts:26` devuelve `null` cuando el gateway está en `Pending`, como dice README §3.3). Queda en #63 (Entrega 3): motor, README §3.3, spec `validation` y revisión de oráculos.

## Capabilities

### New Capabilities

Ninguna. El procesamiento amplía `settlement`, cuyo propósito ya es "procesar un import validado como intento de batch". Las lecturas de fees amplían `fees`.

### Modified Capabilities

- `settlement`: intentos y número de batch (siguiente número, intento tras deshacer, concurrencia), precondición, movimientos por ciclo con la clave por fila, combinación de inclusiones, filas que no se procesan, fees por batch (preestablecido, libre, del archivo), asociación de canales, totales, amount payable y su desglose, vista previa, advertencias, procesar sin Settled, errores.
- `fees`: selección por fecha de negocio del evento (con ajuste sin fecha y redondeo a 4 decimales) y lecturas para Settlement Review (`GET /accounts/{id}/fees`, `GET /fee-types`).
- `validation`: "Los hallazgos persisten" (resolución al procesar y reapertura), "Clave de duplicado y colisión" (aparición histórica por fila) y "Rangos y faltantes" (el escenario de `batch-clean` corregido con el rango R por vencimiento).
- `import`: máquina de estados (`validated → processed`) y transiciones no admitidas (`import_not_validated`).

## Impact

- **Oráculos y seed**: `data/samples/plan.ts`, `backend/prisma/synthetic.ts` (RDR, 4 decimales con `Decimal`, fee de Chargeback de ProviderC-Alt), `backend/prisma/seed.ts` (payable de los batches sembrados con RDR), `data/samples/*/expected.json` regenerados. Los `.xlsx` no deberían cambiar.
- **Backend**: módulo nuevo `modules/settlement/{domain,application,infrastructure,http}` y módulo `modules/fees` mínimo (selección por fecha, importe, lecturas). En `validation/infrastructure`: `prisma-missing-resolution.ts`, y el detalle de una aparición histórica lee `excludeAmount` por fila. `imports/domain/import-state.ts` gana `assertCanProcess`. `app.ts` registra los módulos.
- **Shared**: `packages/shared/src/settlement.ts` y `fees.ts` (request, vista previa, vista del intento con `payableBreakdown`, opciones de fees).
- **Base de datos**: migración `0007_settlement_process` y `schema.prisma` (sin `@@unique` en `SettlementTransaction`, `eventDate DateTime?`). Sin tablas nuevas. Permisos del seed suficientes (`settlement.process`, `fee.view`).
- **Contrato**: `docs/openapi.yaml`, `frontend/src/lib/api/schema.gen.ts`, `api-collection/` (`10-smoke`, `20-flows/settlements`), README §3.2, §3.3, §4.3, §4.4.
- **Sin dependencias nuevas** (`Prisma.Decimal`, que es `decimal.js`, ya está).

## Fuera de alcance

- Política de reserva ante chargeback, liberación anticipada y su efecto en los faltantes R: #62 (Entrega 3).
- Pagar, retirar el pago y deshacer (tramo 6). `reopenForBatch` queda implementado y probado, sin ruta que lo llame.
- `GET /settlements/{id}`, `/transactions`, `/export`, `GET /imports/{id}/settlements`, `GET /accounts/{id}/settlements` y los CSV: #12, que lee lo que este change escribe ("Contrato para #12"). La respuesta `201` ya trae las URL de export, que responden `404` hasta #12.
- Pantallas Settlement Review y Summary: #13 ("Contrato para #13").
- Administración de fees (tramo 5), mantenimiento de tipos (#60), alerta de tope de reserva (#61), `status_mismatch` con el gateway en `Pending` (P16, #63).
- Heredar acciones manuales entre corridas (#53) y cerrar la inclusión manual de E duplicados entre batches (#49).

## Insumos que necesito de la persona

1. **Revisar el diff de los `expected.json`** tras el grupo 0, antes de seguir con el grupo 1.
2. **Migración `0007_settlement_process`**: revisar el SQL y aplicarlo con `! pnpm db:migrate`; después `! pnpm db:seed`.
3. **Colección Bruno**: el flujo `20-flows/settlements` deja `batch-clean` procesado y `RAM-07` asociado (aún no hay deshacer). Confirmar que `pnpm db:seed` va antes de cada `pnpm test:api`, como ya dicen los prerrequisitos. `api-collection/.env` presente y `pnpm dev` levantado.
