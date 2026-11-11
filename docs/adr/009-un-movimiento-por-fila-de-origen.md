# ADR-009 · Un movimiento por fila de origen y fecha de evento desconocida

- **Estado:** Aceptado (Entrega 2, cambio de rumbo)
- **Decisores:** autor del proyecto, en el gate de `settlement-process` (PR #66)

## Contexto

RT2-DB-001 preveía `UNIQUE (transactionId, cycle, batchId)`: un solo movimiento por transacción y ciclo en cada batch. Pero las reglas de negocio admiten varios eventos del mismo ciclo en un batch:

- un Refund y un Chargeback de la misma transacción;
- un Chargeback y un `CHB 2` legacy;
- un duplicado que el analista incluye a mano.

Además, hay ajustes cuya fecha de evento el gateway no da, y HU3 exige no inventarla.

## Opciones consideradas

1. Fusionar los eventos del mismo ciclo en un solo movimiento.
2. Añadir un `seqNo` a la clave.
3. Un movimiento por fila de origen `(batchId, sheetId, rowNo)`.

Para la fecha desconocida: inventarla (la fecha del batch) o dejarla en NULL.

## Decisión

Opción 3, y fecha NULL.

- `0007_settlement_process` sustituye la clave por `UX_SettlementTransaction_batch_row`, filtrado `WHERE sheetId IS NOT NULL` porque el historial sembrado no tiene fila de origen. Añade también `CK_SettlementTransaction_sourceRow`: hoja y fila van juntas.
- `SettlementTransaction.eventDate` admite NULL, con la advertencia `undated_adjustment`.
- `0008_settlement_fee_event_date` extiende el NULL al detalle de fees. Se decidió durante el apply, cuando la integración mostró que el fee de un ajuste sin fecha no se podía guardar.

## Consecuencias

- Cada fila procesada tiene su movimiento, y los exports pueden ordenar de forma estable por `(cycle, sheetId, rowNo, settlementTxnId)`.
- Las búsquedas por `(transactionId, cycle)` usan un índice no único.
- Un fee con vigencia `NULL…NULL` aplica también a un ajuste sin fecha; uno con vigencia acotada no aplica.

## Referencias

`backend/prisma/migrations/0007_settlement_process`, `0008_settlement_fee_event_date`; design de `settlement-process` (D4); README §6, RT2-DB-001.
