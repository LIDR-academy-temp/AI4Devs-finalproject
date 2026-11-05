# Design — settlement-reserve-chargeback

## Context

El motor de settlement es un cálculo puro: `computeSettlement(input)` (`settlement-process` D2) se usa tanto en la vista previa como al procesar. Los totales, el desglose, la vista y los exports ya leen `reserveEarlyReleasedAmt`:

- `totals.ts` suma el campo en `reserveEarlyReleasedAmt`, la línea `reserve_early_released` de `payableBreakdown` y `amountPayable`;
- `prisma-settlement-reader.ts` lee la vista con `SUM` de los movimientos;
- `summary-csv.ts` escribe "Reserve released on chargeback" y ya sabe pintar `reserve_already_released` con el ID de origen.

Hoy `movements.ts` pone 0 en todo movimiento I, con `{ policy, applied: false }`, y `compute-settlement.ts` emite `chargeback_reserve_policy_not_applied`. El contrato (`@recon/shared`) ya incluye la advertencia `reserve_already_released` y `reservePolicySnapshot` como objeto libre. Las columnas existen (migración `0001`), con `CHECK reserveEarlyReleasedAmt >= 0` (`0002`). **No hay migración.**

En validación, `heldReserves` lee `st.reserveEarlyReleasedAmt` del propio E, que siempre vale 0, y `missing.ts` descarta las candidatas con valor distinto de cero. La liberación vive en el I (D12 de `settlement-process`), así que hoy esa comprobación nunca descarta nada.

Las reglas aprobadas en el gate están en la proposal (P1–P8) y en los delta specs. Los tres estados de I (`Chargeback`, también `CHB 2`; `Refund`; `RDR`) liberan por igual (P4). Como un movimiento I siempre tiene uno de esos tres estados, la regla se aplica a **todo movimiento I** sin distinguir el estado.

## Goals / Non-Goals

**Goals:**
- Aplicar la política en el dominio puro, con el mismo resultado en la vista previa y al procesar.
- Leer el estado previo de cada reserva en **una** consulta por lotes de IDs, dentro de la transacción del proceso.
- Mantener la regla "una reserva no se libera dos veces" en los tres caminos: un ajuste tras otro, una R tras un ajuste y un ajuste tras una R.

**Non-Goals:**
- No se aplica el tope de reserva (#61).
- No se prorratea la liberación por el importe del ajuste (P1).
- La historia sembrada no se reescribe (P6).
- No se renombran la política, el requisito ni la etiqueta del summary (P8); el renombrado de la etiqueta queda en un issue de roadmap.
- Ninguna validación nueva: un RR de una reserva liberada no es hallazgo de validación, es una advertencia del procesamiento.
- Ningún cambio de pantalla.

## Decisions

### D1. Un paso puro nuevo: `adjustment-reserve.ts`

`applyAdjustmentReserve(movements, { policy, reserveStates })` se ejecuta en `computeSettlement` después de `buildMovements` y antes de los fees. Devuelve los movimientos ajustados y las advertencias `reserve_already_released`. Recorre los movimientos en el orden de proceso, el de primera aparición de `classifyRows`, y lleva dos conjuntos locales del batch: reservas ya liberadas en este batch y transacciones con R en este batch.

El nombre del módulo dice lo que hace (ajustes I). La política conserva su nombre (P8).

Para cada movimiento I, el resultado sale de comprobar en orden:

1. Política `hold_until_term` → `held_until_term`.
2. No hay reserva de origen → `no_held_reserve`. La reserva de origen es, por este orden:
   - el E retenido del estado previo, de un intento vigente;
   - si no hay, el primer E `Successful` con `reserveHeldAmt > 0` del batch.
3. R vigente previa, o R de la transacción en este batch → `released_in_r` (P3).
4. Liberación previa vigente, o ya liberada en este batch por otro I → `already_released` (P5).
5. Si no se cumple nada de lo anterior → `released`, con `reserveEarlyReleasedAmt = reserveHeldAmt` del E de origen, entero y sin mirar el importe del ajuste (P1). La reserva queda marcada como liberada en este batch.

En cada R: si el estado previo dice que un ajuste la liberó en un intento vigente, `reserveReleasedAmt = 0` y se emite la advertencia `reserve_already_released` (P12). Dentro del batch no puede ocurrir, porque cuando hay R gana la R (P3).

`movements.ts` deja de escribir el snapshot del I. El snapshot lo escribe este paso: `{ policy, applied: true, outcome, heldInBatchId }`, con `heldInBatchId = null` si el E está en el mismo batch o no hay E. Los E y los R siguen con snapshot `null`.

- *Alternativa descartada:* meter la regla en `buildMovements`. Mezcla el cálculo por fila con un estado que cruza filas (el primer ajuste, la R del batch) y obliga a reescribir sus tests.
- *Alternativa descartada:* guardar la liberación en el E original. Así lo decidió D12 de `settlement-process`: el E puede estar en un batch `paid` que no se toca, y la liberación tiene que deshacerse con su propio intento.
- *Alternativa descartada:* prorratear por el importe del ajuste (un refund parcial libera parte). El gate decidió liberar todo lo retenido (P1).

### D2. Entrada nueva `reserveStates` y su puerto

`SettlementInput.reserveStates: ReadonlyMap<bigint, PriorReserveState>`, con:

```
PriorReserveState { held: { amount: string; batchId: string } | null; releasedInR: boolean; releasedByAdjustment: boolean }
```

El puerto `SettlementSource.reserveStates(providerId, transactionIds, excludeImportId)` se carga en `loadSettlementInput` justo después de `previousE`, una lectura tras otra, igual que las demás dentro de la transacción. Recibe solo los IDs de las filas asociadas de ciclo I o R. `PrismaSettlementSource` resuelve los lotes con `chunks` (`MAX_SQL_PARAMETERS`), con una consulta sobre `SettlementTransaction` ⋈ `SettlementBatch` (`status <> 'undone'`, `importId <> @excluded`) ⋈ `Account` (`providerId`), agrupada por `transactionId`:

- `held`: el primer E `Successful` con `reserveHeldAmt > 0`, por `processedAt` del batch y `settlementTxnId`, con su importe como texto (`CONVERT(VARCHAR(40), …)`) y su `batchId`;
- `releasedInR`: existe un R;
- `releasedByAdjustment`: existe un I, de cualquier estado, con `reserveEarlyReleasedAmt > 0`.

Una transacción sin movimientos previos no aparece en el mapa, y eso equivale a no tener estado previo.

- *Alternativa descartada:* ampliar `previousE`. Responde otra pregunta (la ronda, incluidas las `Declined`) y lo usan sus propios tests.

### D3. Forma del snapshot

`reservePolicySnapshot` es JSON en `NVARCHAR(MAX)` y en el contrato es un `record` libre, así que no cambia el esquema compartido. `ReservePolicyOutcome` (`released` · `held_until_term` · `no_held_reserve` · `already_released` · `released_in_r`) es un tipo del dominio del backend, igual para los tres estados.

La descripción de `reservePolicySnapshot` en `docs/openapi.yaml` documenta las dos formas: la antigua `{ policy, applied: false }` y la nueva. `applied: true` distingue lo calculado con #62 de los intentos de la Entrega 2.

### D4. `heldReserves` lee la liberación de los I vigentes

En `prisma-validation-sources.ts`, la columna `reserveEarlyReleasedAmt` del resultado pasa a ser la suma de los I vigentes, sin filtrar por estado: cualquier I puede liberar.

```
ISNULL((SELECT SUM(i.reserveEarlyReleasedAmt) FROM SettlementTransaction i
        JOIN SettlementBatch ib ON … AND ib.status <> 'undone'
        JOIN Account ia ON … AND ia.providerId = @provider
        WHERE i.transactionId = t.transactionId AND i.cycle = 'I'), 0)
```

Se mantiene `HeldReserve` y `missing.ts` no cambia: el motor vuelve a comprobar, como con las candidatas ("Candidatas sin el histórico liquidado"). El fake `InMemoryValidationSources.heldReserves` hace lo mismo con los movimientos I de los batches no deshechos.

- *Alternativa descartada:* filtrar con `NOT EXISTS` en el SQL y quitar el campo. Pierde la doble comprobación del dominio, y los tests de `missing.ts` dejan de cubrir la regla.

### D5. La advertencia antigua

`compute-settlement.ts` deja de emitirla. El código sigue en `SettlementWarning` (`@recon/shared`), en OpenAPI y en `strings.ts` del frontend, porque la vista de un intento lee las advertencias de su auditoría `settlement.process`. El comentario `Emitted once the chargeback reserve policy exists (#62)` pasa a describir el comportamiento.

### D6. El oráculo de `batch-issues`

`data/samples/plan.ts` añade a `batch-issues` el bloque:

```
expected.reserveEarlyRelease = {
  released: [{ id, sheet, amount, heldInBatchNo }],
  notReleased: [{ id, sheet, outcome }],
  reserveEarlyReleasedAmt
}
```

`heldInBatchNo` es el número del batch sembrado que retuvo la reserva, o `null` si la retuvo el APP de la propia muestra (ronda 1). Con él, los tests sin base comprueban `heldInBatchId` a través de los intentos de la cuenta.

Se calcula con el mundo sintético, con estas reglas:

- se recorren las filas de las hojas CHB, REF y RDR de la muestra en el orden de proceso;
- una fila libera si su transacción tiene E `Successful` con reserva en un batch sembrado anterior, o en el APP final de la muestra, si no tiene R previa ni en el RR de la muestra, y si no la ha liberado ya una fila anterior;
- el importe es `reserveOf(t)` con `Decimal`, el mismo cálculo con el que el seed escribe `reserveHeldAmt`;
- `notReleased` lleva el de RAM-13 (`no_held_reserve`) y cualquier otro que no libere, con su motivo.

`settlementSampleInput` (`test-support/sample-input.ts`) construye `reserveStates` a partir de la historia de la muestra: los movimientos sembrados de los batches anteriores, con `held` y `R`. Así el test de dominio usa el oráculo sin base de datos.

Para regenerar se usa `pnpm samples:plan && python data/samples/build-samples.py`. Después se comprueba con `git diff --stat data/samples`:

- solo debe cambiar `batch-issues/expected.json`;
- los demás `expected.json` no cambian;
- si cambia algún `.xlsx`, se para y se pregunta a la persona.

### D7. Tests

- **Dominio (TDD, Vitest):**
  - `adjustment-reserve.test.ts` con los escenarios de la spec, todos con builders: CHB, REF y RDR que liberan, refund parcial con la reserva entera, `hold_until_term` en los tres, REF + CHB de la misma transacción, CHB + `CHB 2`, P3, P12 y deshacer;
  - `compute-settlement.test.ts` con el oráculo de `batch-issues` (importes por ID y hoja, total, línea del desglose y `amountPayable` = desglose);
  - `missing.test.ts` y el fake de `heldReserves` para "Reserva liberada anticipadamente", "Reserva liberada por un refund o un RDR", "Liberación de un intento deshecho" y "Ajuste sin liberación".
  - El test se rompe a propósito una vez para comprobar que falla: por ejemplo, no marcar la reserva como liberada en el batch, para que el segundo ajuste también libere.
- **Integración** (`backend/test/integration`):
  - `settlement-process.int.test.ts`: el test de ProviderB-Main pasa a comprobar la liberación con el oráculo y la ausencia de la advertencia antigua;
  - casos nuevos: ronda 1 con APP + CHB, `hold_until_term` en ProviderA-USD, P12 (procesar `batch-issues`, después un import con la RR de un liberado) y deshacer (deshacer y reprocesar);
  - `settlement-source.int.test.ts`: `reserveStates` con más de 2 000 IDs;
  - `validation-sources.int.test.ts`: `heldReserves` con una liberación vigente por `Refund` y con una deshecha.
- **Bruno** (`20-flows/validations/batch-issues`), tras `17 Review again`, con el import en `validated`:
  - `17b Preview reserve early release`: `200`, `reserveEarlyReleasedAmt` del oráculo, línea `reserve_early_released` con ese importe, desglose que suma `amountPayable` y sin la advertencia antigua;
  - `17c Preview as viewer`: `403 forbidden`.

  La vista previa no escribe, así que el flujo se puede repetir sin sembrar. El contrato no cambia y `batch-clean` sigue igual.

## Risks / Trade-offs

- **[Riesgo aceptado] Dos imports del proveedor procesados a la vez con un ajuste de la misma transacción podrían liberar la misma reserva dos veces.** Las lecturas del proceso no bloquean `SettlementTransaction` de otros batches. → Es la misma clase de riesgo que dos duplicados *across* procesados a la vez, y se acepta igual (casilla en #67). El siguiente batch lo deja visible: el ajuste repetido sale como duplicado o colisión *across*. Un bloqueo por transacción exigiría una tabla o un índice nuevos, es decir, una migración.
- **[Riesgo] Un R sembrado o antiguo de una transacción ajustada se sigue liberando entero.** → Es lo correcto según P6: esos ajustes no liberaron nada (`reserveEarlyReleasedAmt = 0`).
- **[Trade-off] Un refund parcial libera toda la reserva (P1).** Es la decisión de negocio. Prorratear necesitaría una regla para el resto, que seguiría esperándose en R.
- **[Trade-off] La etiqueta "Reserve released on chargeback" también cubre refunds y RDR (P8).** Se documenta en el README, y el renombrado queda en un issue de roadmap.
- **[Riesgo] Al regenerar las muestras cambian los bytes de los `.xlsx`.** → La tarea comprueba `git diff --stat data/samples`. Si cambia algo más que `batch-issues/expected.json`, se para y se pregunta antes de seguir.

## Migration Plan

Sin migración ni seed. El despliegue es el habitual (`scripts/deploy.sh build | up`). Los intentos ya procesados conservan sus valores. Revertir el change vuelve al comportamiento de la Entrega 2 sin tocar datos, porque los movimientos ya escritos con liberación siguen siendo válidos en el esquema.
