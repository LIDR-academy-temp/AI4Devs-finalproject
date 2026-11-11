# ADR-003 · Tres ciclos E/I/R como eje del modelo; Settled solo con el intento pagado

- **Estado:** Aceptado (propuesto en la Entrega 1; confirmado en la Entrega 2)
- **Decisores:** autor del proyecto

## Contexto

El Back-Office del gateway guarda un solo flag de "settled" y una última fecha por transacción. Pero una transacción puede tener movimientos en tres ciclos: la operación original (E), los ajustes posteriores (I) y la liberación de la reserva (R). Además, procesar un batch no equivale a cobrarlo.

## Opciones consideradas

1. Un único estado "settled" por transacción, como hoy.
2. Movimientos por ciclo (`cycle` ∈ E | I | R), con Settled derivado del batch.

## Decisión

Opción 2. El ciclo lo fija la hoja o la regla de pareo, no el estado del gateway. R no tiene estado. Un movimiento está Settled solo cuando su batch está `paid`; un batch `processed` todavía no confiere ese estado.

## Consecuencias

- Duplicados y colisiones se comparan por `(transactionId, cycle)`; ciclos distintos nunca se comparan entre sí.
- El summary, los rangos de fechas y los faltantes se calculan por ciclo.
- `0002_constraints` fija el ciclo con `CHECK ('E','I','R')`, y `TransactionStatus` solo admite E e I.

## En la Entrega 2

- **Settled no es una vista SQL**, como preveía RT2-DB-001: se deriva en el dominio del estado del intento (`backend/src/modules/settlement/domain/settled.ts`), nunca de `SettlementTransaction.settlementStatusId`, que sigue en el esquema.
- **El rango R se calcula por vencimiento de la reserva**, no por fecha de creación: con la fecha de creación aparecían faltantes falsos (review del PR #41). Usar el plazo aplicado al liquidar (`expectedReserveReleaseAt`) queda como deuda #44.
- Pagar y retirar el pago, que es lo que convierte un movimiento en Settled, quedan para la Entrega 3 (#78). Hasta entonces solo está Settled el historial sembrado.
