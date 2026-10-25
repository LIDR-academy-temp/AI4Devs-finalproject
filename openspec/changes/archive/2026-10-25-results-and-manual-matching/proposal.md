# Proposal

## Why

Tras ejecutar el motor, el analista necesita ver de un vistazo cuánto quedó conciliado, cuánto dinero sigue sin explicar y qué partidas le quedan por revisar; y necesita poder resolver esas partidas cruzándolas a mano, con la misma trazabilidad que los cruces automáticos. Este change cierra el recorrido principal de E2 (HU-07, HU-08; PRD RF-30..RF-34).

## What Changes

- API de listados de transacciones POS, movimientos bancarios y cruces de una conciliación con filtros (estado, fechas, monto, marca, método) y paginación.
- Panel de resultados en el detalle de la conciliación: tarjetas de KPIs y pestañas Conciliadas, Pendientes POS, Pendientes banco, Propuestas y Excepciones (estas dos últimas se llenan en E3, pero las pestañas ya existen).
- Conciliación manual: selección múltiple en dos tablas lado a lado, suma de cada lado y diferencia en vivo, creación de un cruce MANUAL confirmado con nota opcional.
- Deshacer cualquier cruce (automático o manual), devolviendo sus transacciones a pendiente y dejando registro de la acción.
- Confirmar o rechazar cruces en estado PROPOSED generados por el nivel 2 (la UI de propuestas se completa en `ai-match-suggestions`, pero el endpoint y la acción básica se entregan aquí para que las propuestas del nivel 2 sean resolubles en E2).

## Capabilities

### New Capabilities
- `results-dashboard`: visualización del resultado de una conciliación: indicadores, listados por estado y filtros.
- `manual-matching`: creación, confirmación, rechazo y anulación de cruces por decisión humana.

### Modified Capabilities
<!-- ninguna -->

## Impact

- **HU:** HU-07, HU-08. **Tickets:** TK-15, TK-16, TK-17. **RF:** RF-30, RF-31, RF-32, RF-33, RF-34, parte de RF-29 y RF-35 (aceptar/rechazar propuestas). **RNF:** RNF-12 (trazabilidad), RNF-14 (usabilidad).
- **Endpoints:** `GET /reconciliations/{id}/pos-transactions`, `GET /reconciliations/{id}/bank-movements`, `GET /reconciliations/{id}/matches`, `POST /reconciliations/{id}/matches`, `PATCH /matches/{matchId}`, `DELETE /matches/{matchId}` (readme §4.1, §4.2).
- **Código:** `apps/api/src/reconciliations/` (listados), `apps/api/src/matching/` (servicio de cruces manuales), `apps/web/src/features/results/`.
- **Tablas:** `matches`, `match_items`, estados de `pos_transactions` y `bank_movements`, recálculo de `reconciliations.stats`.
- Depende de `matching-engine-core`.
