# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

El jefe financiero necesita archivar el resultado del cierre y entregarlo a auditoría en el formato que ya usan: Excel. Sin exportación, el trabajo hecho en Concilia no sale de la herramienta (HU-11, readme §1.2 funcionalidad 7, PRD RF-40, CU-5).

## What Changes

- Descarga de un archivo Excel de la conciliación con hojas Resumen (indicadores y parámetros), Conciliadas (cada cruce con método, confianza, diferencia, usuario y transacciones de ambos lados), Pendientes POS, Pendientes banco y Excepciones (con motivo y nota).
- Montos exportados como celdas numéricas con formato, fechas como celdas de fecha; nunca como texto.
- Botón "Exportar Excel" en el detalle de la conciliación, disponible en estados COMPLETED y CLOSED.
- Generación en streaming para conciliaciones grandes y nombre de archivo con nombre de la conciliación y fecha.

## Capabilities

### New Capabilities
- `excel-export`: generación de un reporte Excel completo y archivable del resultado de una conciliación.

### Modified Capabilities
<!-- ninguna -->

## Impact

- **HU:** HU-11. **Tickets:** TK-22 (3 SP). **RF:** RF-40.
- **Endpoints:** `GET /reconciliations/{id}/export`.
- **Código:** `apps/api/src/exports/`, botón en `apps/web/src/features/reconciliations/`.
- **Dependencias nuevas:** `exceljs`.
