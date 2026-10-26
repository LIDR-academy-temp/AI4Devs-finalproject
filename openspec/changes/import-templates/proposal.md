# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

Cada mes el analista recibe el mismo formato del mismo banco y del mismo POS; volver a mapear columnas cada vez es trabajo repetido. Guardar el mapeo como plantilla reduce la carga mensual a elegir la plantilla y confirmar (HU-12, readme §1.2 funcionalidad 1, PRD RF-17). Prioridad *Could*: se implementa si queda capacidad en E3 (decisión abierta nº 4 del PRD).

## What Changes

- Guardar, al confirmar un mapeo, la configuración (mapeo de columnas, formato de fecha, separador decimal, fila de cabecera) como plantilla con nombre, por empresa y tipo de fuente.
- Al subir un archivo, elegir una plantilla y aplicarla automáticamente a la vista previa; si las columnas del archivo no coinciden con las de la plantilla, se advierte indicando cuáles faltan o sobran.
- Listado y borrado de plantillas de la empresa (gestión reservada al rol ADMIN según readme §1.1; edición no incluida).

## Capabilities

### New Capabilities
- `import-templates`: creación, aplicación y gestión de configuraciones de mapeo reutilizables por banco o POS.

### Modified Capabilities
- `file-import`: la subida acepta una plantilla y la vista previa la aplica con detección de columnas no coincidentes. Nota: la spec existirá tras archivar `file-import-and-column-mapping`.

## Impact

- **HU:** HU-12. **Tickets:** TK-23 (3 SP). **RF:** RF-17.
- **Endpoints:** `GET /templates`, `POST /templates`, `DELETE /templates/{id}`; `POST /reconciliations/{id}/files` acepta `templateId`.
- **Código:** `apps/api/src/templates/`, selector de plantilla en el paso de carga de `apps/web`.
- **Tablas:** `import_templates` ya existe en el esquema (readme §3).
