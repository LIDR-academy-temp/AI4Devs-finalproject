# Proposal

## Why

El motor de conciliación es la razón de ser de Concilia: sustituye las horas de cruce manual en Excel por una ejecución automática que resuelve la mayoría de las partidas sin falsos positivos. Este change entrega los dos primeros niveles (exacto y tolerancia) y la ejecución asíncrona que los conecta con la conciliación (HU-06; PRD RF-22..RF-29, §8; readme §1.2, §2.2).

## What Changes

- Capa de dominio pura del motor: pipeline de estrategias donde cada nivel trabaja solo con lo que los anteriores dejaron sin cruzar.
- Nivel 1 (exacto): mismo **local + lote + referencia** (decisión del usuario, validada con los archivos de ejemplo) y mismo monto bruto; lote y referencia se comparan sin prefijo ni ceros a la izquierda; confirmado automáticamente; la ambigüedad bloquea.
- Tabla de relación de locales por empresa (nombre del local en el POS ↔ código de establecimiento del banco), cargable desde Excel.
- Nivel 2 (tolerancia): mismo monto o monto neto esperado dentro de una ventana de días, con cálculo de neto a partir de % comisión y % retención. Se **adopta la decisión abierta nº 1 del PRD**: solo se confirma automáticamente si el candidato es único en ambos lados **y** coinciden los últimos 4 dígitos; en cualquier otro caso se genera como propuesta.
- Ejecución asíncrona desde la API: la conciliación pasa a PROCESSING, el motor corre fuera del ciclo de la petición, los resultados se persisten en una transacción, se calculan las estadísticas y el estado pasa a COMPLETED o FAILED. Re-ejecutar recalcula los cruces automáticos y conserva los manuales.
- Botón "Ejecutar" en el detalle de la conciliación con indicador de progreso por sondeo del estado.

## Capabilities

### New Capabilities
- `store-mapping`: relación de locales entre POS y banco, por empresa.
- `matching-engine`: reglas de cruce por niveles entre transacciones POS y movimientos bancarios, independientes de cómo se almacenan los datos.
- `reconciliation-run`: ejecución de una conciliación de extremo a extremo: precondiciones, estados, persistencia atómica de resultados, estadísticas y re-ejecución.

### Modified Capabilities
<!-- ninguna -->

## Impact

- **HU:** HU-06. **Tickets:** TK-12, TK-13, TK-14. **RF:** RF-22..RF-29. **RNF:** RNF-02 (10k×10k < 2 s), RNF-03 (asíncrono), RNF-10 (transaccional), RNF-13 (cobertura ≥ 90 % del motor), RNF-15 (dominio puro).
- **Endpoints:** `POST /reconciliations/{id}/run` (202), `GET /reconciliations/{id}` para el estado (readme §4.2).
- **Código:** `apps/api/src/matching/engine/` (dominio), `apps/api/src/matching/matching.service.ts` y `ReconciliationRunner`, `apps/web/src/features/reconciliations/` (botón ejecutar y progreso).
- **Tablas:** nueva `store_mappings`; `matches`, `match_items`, actualización de `status` en `pos_transactions`, `bank_movements` y `reconciliations.stats`.
- **Dependencias nuevas:** `decimal.js`.
- Depende de `file-import-and-column-mapping` y `synthetic-datasets`.
