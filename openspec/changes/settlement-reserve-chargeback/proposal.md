# Proposal — settlement-reserve-chargeback

Issue #62: liberación de la reserva al procesar el batch, para las cuentas con política `release_on_chargeback`, ante cualquier ajuste I: `Chargeback` (también el alias `CHB 2`), `Refund` o `RDR`. Es el grupo 12 del change `settlement-process` (D12 y P12), que se recortó de la Entrega 2.

Es un change **solo de backend**: dominio, lectura de la fuente, validación de faltantes R, tests, Bruno y documentación. **No hay migración, no hay datos sembrados nuevos y no cambia el contrato del API.** La política se sigue llamando `release_on_chargeback` y la etiqueta del summary sigue siendo **Reserve released on chargeback**. Renombrar la etiqueta toca pantalla, spec, tests y capturas, así que queda en un issue de roadmap.

## Why

La política de reserva ante chargeback se configura por cuenta desde la aplicación (README §1.1 y §1.2, "Reserva por cuenta"), pero el motor todavía no la aplica:

- todo movimiento I lleva `reserveEarlyReleasedAmt = 0` y `reservePolicySnapshot = { policy, applied: false }`;
- una cuenta `release_on_chargeback` recibe la advertencia `chargeback_reserve_policy_not_applied`;
- la línea **Reserve released on chargeback** del summary sale siempre a `0.0000`.

Así, en ProviderB-Main la reserva de una transacción ajustada sigue retenida y se espera en R, cuando el proveedor ya la ha devuelto. Eso falla el criterio HU3 CA4 ("aplica la política de la cuenta"). El contrato ya tiene todos los campos, así que solo falta el cálculo.

## What Changes

**Regla de liberación (dominio `settlement`)**

- Con `release_on_chargeback`, el **primer** movimiento I del batch de una transacción libera la reserva retenida de esa transacción. Puede ser un `Chargeback` (también un `CHB 2`, con `excludeAmount`), un `Refund` o un `RDR`. La liberación se guarda en `reserveEarlyReleasedAmt` del propio movimiento I, nunca en el E original.
- Una reserva está retenida si se cumplen las cuatro condiciones:
  - la transacción tiene un movimiento E `Successful` con `reserveHeldAmt > 0`, en este batch o en un intento vigente (`status <> 'undone'`) de cualquier cuenta del proveedor;
  - no hay movimiento R vigente de esa transacción;
  - no hay en este batch un movimiento R de esa transacción (P3);
  - no hay liberación anticipada vigente, ni en un intento anterior ni en un I anterior del mismo batch.
- Se libera **todo** el `reserveHeldAmt` de ese E, es decir, lo que se retuvo. No se recalcula ni se prorratea por el importe del ajuste (P1).
- Con `hold_until_term`, o sin reserva retenida, el movimiento vale 0 y la reserva sigue su plazo.
- `reservePolicySnapshot` del movimiento I pasa a `{ policy, applied: true, outcome, heldInBatchId }`. Así se conserva la regla aplicada y por qué se liberó o no. `outcome` ∈ `released` · `held_until_term` · `no_held_reserve` · `already_released` · `released_in_r`, igual para los tres estados.
- **P12.** Una fila RR cuya reserva ya liberó un ajuste en un intento vigente produce un movimiento R con `reserveReleasedAmt = 0` y la advertencia `reserve_already_released` (`transactionId`, `sheetId`, `rowNo`). Una reserva no se libera dos veces.
- Deja de emitirse `chargeback_reserve_policy_not_applied`. El código sigue en el contrato, porque los intentos anteriores lo guardaron en su auditoría y su vista lo sigue mostrando.
- **Deshacer.** Deshacer un intento anula su liberación sin escribir nada, porque toda lectura filtra `status <> 'undone'`. La reserva vuelve a estar retenida y se espera en R.

**Lo que ya existe y solo cambia de cifra**

- Totales, `amountPayable`, la línea `reserve_early_released` de `payableBreakdown`, la vista, el bloque de reservas y del amount payable del export `summary`, y la columna **Reserves** de Movements.
- Todo eso ya suma `reserveEarlyReleasedAmt` de los movimientos I.
- TXN y RR no cambian de regla. El RR ya lista "también las R que liberan 0" (README §1.2).

**Validación (`validation`, faltantes R)**

- `heldReserves` deja de leer `reserveEarlyReleasedAmt` del E, que siempre vale 0.
- Ahora considera liberada la reserva si existe un movimiento I vigente de la transacción, de cualquiera de los tres estados y en cualquier cuenta del proveedor, con `reserveEarlyReleasedAmt > 0`.
- Una liberación de un intento `undone` no cuenta: la reserva vuelve a ser candidata a faltante.

**Oráculo y datos**

- No hace falta sembrar nada:
  - ProviderB-Main ya es `release_on_chargeback`;
  - `batch-issues` trae ajustes CHB, REF y RDR de transacciones liquidadas en E en batches sembrados anteriores;
  - y trae uno sin reserva: el `non_recorded_adjustment` de RAM-13.
- Al oráculo de `batch-issues` se le **añade** el bloque `expected.reserveEarlyRelease`, calculado en `plan.ts`. Cubre las hojas CHB, REF y RDR: movimientos liberados con su ID, su hoja y su importe; no liberados con su motivo; y el total `reserveEarlyReleasedAmt`.
- Los `.xlsx` no deberían cambiar. Si cambian al regenerar, se para y se pregunta.
- El resto de oráculos no cambia, y se comprueba al regenerar: `batch-clean`, `batch-split` y `legacy-provider` son `hold_until_term`, y `batch-blocked` no se procesa.

## Decisiones del gate (aprobadas por K, 2026-11-04)

- **P1. Qué se libera.** Todo el `reserveHeldAmt` del E vigente que lo retuvo: el del mismo batch (ronda 1) o el de un intento vigente anterior de cualquier cuenta del proveedor (ronda 2). No se recalcula ni se prorratea por el importe del ajuste.
- **P2. Qué política manda.** La de la cuenta que procesa el ajuste, aunque el E sea de otra cuenta del proveedor. Las cuentas son agrupaciones lógicas y no se reporta por cuenta; el proveedor es el mismo. La política queda en `reservePolicySnapshot`.
- **P3. R y ajuste de la misma transacción en el mismo batch.** Gana la R: el proveedor la liberó por plazo en ese archivo, y el I queda en 0 con `outcome = released_in_r`.
- **P4. Estados que liberan.** `Chargeback` (con `CHB 2`), `Refund` y `RDR`, por igual y con las mismas reglas. *Cambia respecto a la propuesta inicial*, que liberaba solo en `Chargeback`.
- **P5. Varios ajustes de la misma transacción** (`Chargeback` + `CHB 2`, `Refund` + `Chargeback`, o uno en un batch anterior). Solo libera el primero vigente en orden de proceso. Los demás quedan en 0 con `outcome = already_released`.
- **P6. Historia sembrada de ProviderB-Main.** No se reescribe: sus I sembrados tienen `reserveEarlyReleasedAmt = 0`, como un intento de la Entrega 2. Por eso sus R sembradas siguen siendo coherentes y `batch-issues` no trae ningún `reserve_already_released`.
- **P7. Advertencia antigua.** `chargeback_reserve_policy_not_applied` se queda en el enum y en el texto del frontend para los intentos ya procesados, y no se emite más.
- **P8. Nombres.** Se mantienen el nombre de la política (`release_on_chargeback`), el requisito "Política de reserva ante chargeback" y la etiqueta **Reserve released on chargeback**. El README explica que aplican a los tres ajustes. Renombrar la etiqueta (por ejemplo, a "Reserve released on adjustment") queda en el issue de roadmap #125.
- **Riesgo aceptado.** Dos imports simultáneos con el mismo ajuste podrían liberar dos veces. Queda como casilla en #67.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `settlement`:
  - "Política de reserva ante chargeback": regla exacta para CHB, REF y RDR, fuente de la reserva, P3 y P5, snapshot y deshacer;
  - "Reserva retenida y liberada": P12;
  - "Advertencias del procesamiento": se emite `reserve_already_released` y ya no `chargeback_reserve_policy_not_applied`.
- `validation`, "Candidatas a faltante": la liberación anticipada se lee de los movimientos I vigentes de los tres estados, y la de un intento deshecho no cuenta.

## Impact

- **Backend:**
  - `settlement/domain`: un módulo nuevo `adjustment-reserve.ts`, `movements.ts`, `compute-settlement.ts` y `types.ts`, con la entrada nueva `reserveStates`;
  - `settlement/application`: `ports.ts`, `load-settlement-input.ts` y los fakes;
  - `settlement/infrastructure`: `prisma-settlement-source.ts`, con una consulta nueva por lotes de IDs;
  - `validation/infrastructure/prisma-validation-sources.ts` (`heldReserves`) y su fake en memoria.
- **Contrato** (`@recon/shared`, OpenAPI): sin cambios de forma. Solo se actualizan comentarios y descripciones ("Emitted once… (#62)").
- **Frontend:** sin cambios de pantalla. La cifra ya se muestra en el summary y en Movements. No hace falta change `web-*`.
- **Datos:** sin migración ni seed. Cambian `data/samples/plan.ts` y `batch-issues/expected.json` (bloque añadido).
- **Tests:**
  - TDD de dominio con Vitest y el oráculo de `batch-issues`;
  - integración de procesar, P12 y deshacer, y de `heldReserves`;
  - colección Bruno: vista previa de `batch-issues` en `20-flows/validations/batch-issues`.
- **Documentación:**
  - README §1.2 ("Reserva por cuenta": aplica a CHB, REF y RDR; roadmap #62 hecho), §3 (`chargebackReservePolicy`, `reserveEarlyReleasedAmt` y `reservePolicySnapshot`), §3.3 (candidatas R) y el ejemplo del §4;
  - `docs/openapi.yaml` (descripciones).
- **GitHub:** un issue de roadmap para renombrar la etiqueta y la casilla del riesgo en #67.
