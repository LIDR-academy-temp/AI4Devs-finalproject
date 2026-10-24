# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

Los bancos y adquirentes rara vez acreditan venta por venta: depositan el total de un lote, de un día o de una marca, normalmente neto de comisión y retención. Sin cruces N:1, todas esas ventas quedan pendientes y el analista vuelve a sumar a mano en Excel, que es exactamente el dolor que Concilia quiere eliminar (readme §1.2 nivel 3, PRD §8.1, riesgo 5).

## What Changes

- Nuevo nivel 3 del motor: agrupa ventas POS pendientes por combinaciones de día, lote, marca y código de local, calcula el neto esperado del grupo y busca un movimiento bancario pendiente cuyo monto coincida dentro de la tolerancia.
- Los cruces agrupados se generan siempre como propuesta (MANY_TO_ONE, PROPOSED) con una explicación que indica el criterio de agrupación usado.
- Estrategia de búsqueda acotada: primero grupos por lote, luego por día y marca, luego por día y local; se evita la explosión combinatoria con límites configurables de tamaño de grupo.
- Parámetro `enableGrouping` de la conciliación activa o desactiva el nivel.
- Medición de precisión y cobertura del nivel 3 con los escenarios de lote y neto del dataset sintético.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `matching-engine`: se añade el nivel 3 (agrupado N:1) al pipeline con sus reglas de agrupación, el criterio de propuesta obligatoria y el parámetro de activación. Nota: esta spec existirá en `openspec/specs/matching-engine/` tras archivar `matching-engine-core`.

## Impact

- **HU:** HU-06 (criterio "nivel agrupado (E3)"). **Tickets:** TK-18 (8 SP). **RF:** RF-24. **RNF:** RNF-02 (mantener < 2 s con el nivel 3 activo).
- **Código:** `apps/api/src/matching/engine/strategies/grouped.strategy.ts`; sin cambios de API ni de esquema.
- **Riesgo clave:** falsos positivos por sumas coincidentes casuales; por eso nunca se confirma automáticamente.
