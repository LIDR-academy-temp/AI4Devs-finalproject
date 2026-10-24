# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

No toda partida pendiente es un error: hay contracargos, anulaciones, ventas aún no acreditadas. El analista necesita documentar por qué una transacción no tiene contraparte para que deje de contar como pendiente y quede explicada ante auditoría. Y la auditoría exige saber quién hizo cada acción relevante y cuándo (HU-10, readme §1.2 funcionalidades 6 y 8, PRD RF-38, RF-39, RF-41, OBJ-4).

## What Changes

- Marcar una venta o un movimiento pendiente como excepción con un motivo predefinido (contracargo, anulación, error de registro en POS, pendiente de acreditación, otro con nota obligatoria) y una nota opcional; la transacción pasa a EXCEPTION, aparece en su pestaña y deja de contar como pendiente.
- Revertir una excepción devolviendo la transacción a PENDING.
- Registro de auditoría inmutable de las acciones críticas: ejecutar conciliación, crear o deshacer cruce, confirmar o rechazar propuesta, marcar o revertir excepción, con usuario, fecha, entidad afectada y detalle.
- Consulta del registro de auditoría por conciliación en el detalle.

## Capabilities

### New Capabilities
- `exceptions`: documentación de transacciones sin contraparte con motivo y nota, su efecto en los indicadores y su reversión.
- `audit-log`: registro inmutable y consultable de las acciones relevantes de los usuarios sobre una conciliación.

### Modified Capabilities
- `results-dashboard`: la pestaña Excepciones muestra motivo y nota y los indicadores excluyen las excepciones de los pendientes. Nota: la spec existirá tras archivar `results-and-manual-matching`.

## Impact

- **HU:** HU-10 (y trazabilidad de HU-08). **Tickets:** TK-21 (3 SP), TK-24 (2 SP). **RF:** RF-38, RF-39, RF-41. **RNF:** RNF-12.
- **Endpoints:** `PATCH /pos-transactions/{id}/exception`, `PATCH /bank-movements/{id}/exception`; nuevo `GET /reconciliations/{id}/audit-log`.
- **Código:** `apps/api/src/reconciliations/` (excepciones), `apps/api/src/audit/` (interceptor o servicio invocado desde `MatchesService` y el runner), pestaña Excepciones en `apps/web`.
- **Tablas:** `exceptionReason` y `exceptionNote` ya existen en `pos_transactions` y `bank_movements`; `audit_log` ya existe en el esquema (readme §3).
