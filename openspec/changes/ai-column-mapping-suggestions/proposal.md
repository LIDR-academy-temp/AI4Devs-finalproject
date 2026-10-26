# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

Cada banco y cada POS exporta con cabeceras distintas ("Fecha Trx", "F. Operación", "Valor", "Importe neto"…). Hoy el analista debe asignar cada columna a mano en cada carga. Un modelo de lenguaje interpreta la semántica de las cabeceras y de las filas de ejemplo mucho mejor que una lista de sinónimos, y reduce el mapeo a una confirmación (HU-05 criterio E3, readme §1.2 funcionalidad 1, PRD RF-16, §10.1).

## What Changes

- Al generar la vista previa de un archivo, el sistema envía al modelo las cabeceras, hasta 5 filas de ejemplo (con tarjetas enmascaradas) y la lista de campos estándar según el tipo de fuente, y recibe un mapeo sugerido con confianza por columna, formato de fecha y separador decimal detectados.
- La sugerencia aparece preseleccionada en el selector de columnas; el usuario puede modificarla y la importación sigue siendo una acción explícita suya.
- La sugerencia es opcional: si el servicio de IA no responde en el tiempo límite o devuelve algo no válido, la vista previa se muestra sin sugerencia y sin error bloqueante.
- El prompt se documenta en `prompts.md`.

## Capabilities

### New Capabilities
- `ai-mapping-suggestion`: obtención de un mapeo de columnas sugerido por IA a partir de la estructura y muestras de un archivo, con validación de la respuesta y degradación silenciosa.

### Modified Capabilities
- `file-import`: la vista previa incluye el mapeo sugerido cuando existe y el selector lo preselecciona. Nota: la spec existirá en `openspec/specs/file-import/` tras archivar `file-import-and-column-mapping`.

## Impact

- **HU:** HU-05 (criterio E3). **Tickets:** TK-19 (3 SP). **RF:** RF-16. **RNF:** RNF-08 (solo datos no sensibles al modelo), RNF-09 (IA opcional), RNF-11 (timeout y reintento).
- **Endpoints:** `GET /files/{fileId}/preview` devuelve además `suggestedMapping`.
- **Código:** `apps/api/src/ai/` (cliente del SDK de Anthropic, modelo por `AI_MODEL`), `apps/api/src/imports/`, selector de columnas en `apps/web`.
- **Dependencias nuevas:** `@anthropic-ai/sdk`, `zod`.
