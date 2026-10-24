# Proposal

## Why

La conciliación es la unidad de trabajo de Concilia: agrupa los archivos de un período, los parámetros del motor y sus resultados. Sin poder crearla y listarla, el analista no tiene dónde cargar archivos ni ver el estado de cada cierre (HU-02, PRD RF-04..RF-08).

## What Changes

- API para crear, listar (paginado, con filtros por estado y período) y consultar el detalle de conciliaciones de la empresa del usuario.
- Validación del período (fin no anterior a inicio) y de los parámetros del motor con sus valores por defecto: ventana de días 3, tolerancia 0,05, % comisión 0, % retención 0, agrupación habilitada.
- Ciclo de vida `DRAFT → PROCESSING → COMPLETED → CLOSED` (o `FAILED`) definido en esta capacidad; las transiciones a `PROCESSING`/`COMPLETED`/`FAILED` las dispara el motor en `matching-engine-core`.
- Pantallas de listado (nombre, período, estado, porcentaje conciliado, fecha) y de creación con el primer paso del asistente (datos generales y parámetros).

## Capabilities

### New Capabilities
- `reconciliations`: gestión del ciclo de vida de una conciliación, sus parámetros y su consulta.

### Modified Capabilities
<!-- ninguna -->

## Impact

- **HU:** HU-02 (y la parte de listado de HU-07). **Tickets:** TK-06, TK-07. **RF:** RF-04, RF-05, RF-06, RF-07, RF-08.
- **Endpoints:** `GET /reconciliations`, `POST /reconciliations`, `GET /reconciliations/{id}` (readme §4.1).
- **Código:** `apps/api/src/reconciliations/`, `apps/web/src/features/reconciliations/`, `apps/web/src/pages/` (listado y wizard paso 1).
- Depende de `auth-and-tenant-isolation`.
