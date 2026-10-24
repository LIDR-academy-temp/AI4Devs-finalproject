# Design

## Context

Existen cruces, estados de transacción y `stats` producidos por `matching-engine-core`. El readme §4.2 define el contrato de `POST /reconciliations/{id}/matches` (201 con cruce MANUAL, 409 si hay transacción ocupada) y §1.3 la pantalla de dos tablas con barra de diferencia. Las propuestas del nivel 2 ya existen y necesitan poder resolverse en E2.

## Goals / Non-Goals

**Goals:**
- Panel que responde rápido con miles de transacciones (listados paginados en servidor).
- Cruce manual seguro ante concurrencia y con la misma estructura de datos que los automáticos.
- Indicadores siempre coherentes tras cualquier acción humana.

**Non-Goals:**
- Tarjetas de propuestas de IA con explicación enriquecida y pestaña de excepciones con motivos (changes de E3; aquí solo se crean las pestañas y las acciones básicas).
- Exportación.
- Edición de un cruce existente (se deshace y se vuelve a crear).

## Decisions

1. **Listados paginados en servidor con filtros como query params tipados** y respuesta `{ items, total, page, pageSize }`, reutilizando el helper de paginación de `reconciliation-management`. Alternativa descartada: cargar todo y filtrar en cliente; inviable con decenas de miles de filas.
2. **Servicio único `MatchesService`** con `createManual`, `confirm`, `reject`, `undo`, usado también por el runner y, en E3, por las sugerencias de IA. Alternativa descartada: lógica repartida por controlador; duplicaría las reglas de exclusividad.
3. **Exclusividad garantizada en BD:** índice único parcial sobre `match_items(pos_transaction_id)` y `match_items(bank_movement_id)` restringido a cruces activos (vía columna desnormalizada `active` en `match_items` mantenida por el servicio) además de la comprobación en servicio dentro de una transacción. Alternativa descartada: solo comprobación en servicio; dos peticiones concurrentes podrían crear cruces solapados.
4. **`REJECTED` conserva el cruce** con sus `match_items` marcados inactivos, lo que permite al motor y a la IA no volver a proponer la misma combinación. Alternativa descartada: borrar el cruce rechazado; se perdería la memoria del rechazo.
5. **Recalcular `stats` con una función `recomputeStats(reconciliationId)`** invocada tras cada acción, con agregaciones SQL. Alternativa descartada: ajustar contadores incrementalmente; propenso a desvíos.
6. **Diferencia calculada siempre en servidor** a partir de los montos persistidos; el cliente la muestra en vivo pero no la envía. Alternativa descartada: aceptar la diferencia del cliente; fuente de inconsistencias.
7. **Frontend:** `ResultsPanel` con `KpiCards` y `Tabs`; `ManualMatchView` con dos `DataTable` virtualizadas con selección y `DifferenceBar` fija; diálogo de confirmación cuando la diferencia ≠ 0; mutaciones de TanStack Query con invalidación de listados y detalle. Alternativa descartada: página separada para cruce manual; el readme la define como vista dentro del detalle.

## Risks / Trade-offs

- [Tablas con miles de filas lentas en el navegador] → paginación en servidor y virtualización; página de 50 por defecto.
- [Columna `active` desnormalizada se desincroniza] → la modifica solo `MatchesService` en la misma transacción que cambia `status`; test de integración lo verifica.
- [El usuario deshace un cruce automático correcto por error] → acción reversible: el motor lo recreará en la próxima ejecución salvo que las transacciones estén en otro cruce.

## Open Questions

- Si confirmar una propuesta con diferencia > tolerancia debe exigir nota (propuesta: sí, misma regla que el cruce manual con diferencia).
