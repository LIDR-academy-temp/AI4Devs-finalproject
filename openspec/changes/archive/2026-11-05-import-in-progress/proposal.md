# Proposal — import-in-progress

Issue #38 (lo recortado de la Entrega 2: lista *In Progress*), más #47 (motivo al cancelar) y #42 (hojas sin confirmar en la readiness del detalle). Toca backend (módulo `imports`) y frontend (`features/imports`, menú). La resolución de filas ambiguas desde la interfaz, la otra mitad de #38, va en un change aparte (`web-ambiguous-rows`, solo frontend), decidido en el gate.

No toca los módulos `settlement` ni `validation` (otra sesión trabaja en `settlement-reserve-chargeback`, #62), ni en el backend ni en el frontend, y nada depende del estado de `batch-clean` (#111).

## Why

- **In Progress está "Soon" en el menú.** Un import a medias (subido, pareado, analizado o validado) solo se retoma con su enlace o desde el listado de una cuenta (`GET /accounts/{id}/imports`), que no dice de qué cuenta, proveedor ni merchant es cada import. HU1 CA8 pide abrirlo "desde In Progress" y retomarlo donde quedó.
- **Se cancela sin motivo.** `POST /imports/{id}/cancel` no acepta cuerpo, así que la auditoría no dice por qué se canceló, y cancelar es irreversible, como undo y unpay, que ya piden motivo.
- **La readiness del detalle miente en un caso.** En un import `mapped` al que se añade un archivo, `GET /imports/{id}` responde `canAnalyze = true` aunque las hojas nuevas no estén confirmadas; solo el `422 mapping_incomplete` de analyze las nombra. El frontend lo compensa derivando esas hojas de `mappingConfirmed`.

## What Changes

**API**

- **Nuevo `GET /api/v1/imports`** con `status`, `merchantId`, `providerId`, `accountId`, `mine`, `page` y `pageSize`. Responde `{ items, page, pageSize, total }`; cada elemento es el resumen del import con `account`, `provider` y `merchant` (id y nombre). Orden `updatedAt` descendente. Sin `status`, los cuatro estados abiertos (`uploaded`, `mapped`, `analyzed`, `validated`). Solo pide token y aplica el alcance; un filtro inexistente o fuera del alcance responde `404`.
- **BREAKING (contrato):** `POST /imports/{id}/cancel` exige `{ reason }` (1–500 caracteres sin los espacios de los extremos, como undo y unpay); sin él, `400 validation_error`. El motivo queda en `AuditLog.detailJson.reason` de `import.cancel`. Sin migración: no se guarda en `Import`.
- **Readiness del detalle:** en `mapped`, cada hoja sin confirmar entra en `readiness.missing` con `field = "confirmation"`, como en el `422` de analyze, y `canAnalyze` es coherente. En `uploaded` no cambia: la readiness sigue describiendo la propuesta.

**Pantallas**

- **In Progress** (`/reconciliations/in-progress`, con `settlement.process`): la entrada del menú deja de ser "Soon". Tabla paginada de los imports abiertos del alcance con cuenta (y merchant › proveedor), archivos, filas leídas, estado, quién lo empezó, creado y actualizado. Filtros de merchant, proveedor, cuenta, estado y "Only mine", guardados en la dirección. Por fila, **Resume** (abre el import) y **Cancel** (mismo diálogo con motivo). Estado vacío con enlace a New Reconciliation.
- **Cancel import** pide motivo obligatorio, en el espacio del import y en In Progress.
- **Column Mapping** deja de derivar las hojas sin confirmar: la barra muestra lo que dice el API.

**Colección, pruebas y documentación**

- Bruno: casos feliz y negativos de `GET /imports`; cancel con motivo y sin él; flujo `20-flows/in-progress` con `legacy-provider` y `batch-split`, que acaba cancelando con motivo.
- Smoke E2E: la limpieza cancela con motivo.
- Capturas de In Progress, del diálogo de cancelar y de la readiness con un archivo añadido, a 1280 y 1024 px, sin `batch-clean`.
- README §4 (fila nueva y fila de cancel), §1.5 (pendientes de #38, #47 y #42), OpenAPI y cliente generado.

**Fuera de alcance:** "Recently closed" del prototipo y el Dashboard; mostrar el motivo de cancelación en la pantalla del import; resolver filas ambiguas (change `web-ambiguous-rows`).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `import`: lista de imports en curso (API y pantalla), motivo obligatorio al cancelar (API y diálogo), hojas sin confirmar en la readiness del detalle y la barra de Column Mapping que deja de derivarlas, y el smoke que cancela con motivo.
- `web-shell`: In Progress pasa a ser un enlace del menú con su entrada activa.

## Impact

- **Backend:** `backend/src/modules/imports` (dominio `readiness.ts` y estado del import, servicio, repositorio Prisma, rutas). Sin migración: el listado usa el índice `(accountId, createdAt)` existente y el motivo vive en `AuditLog`.
- **Shared:** `packages/shared/src/imports.ts` (consulta y página del listado). El cuerpo del cancel reutiliza `ReasonRequest` sin moverlo.
- **Frontend:** `features/imports` (In Progress, `CancelImportDialog`, `ReadinessBar`, mutaciones y consultas), menú y router, fake MSW de imports; extracción del selector merchant › proveedor › cuenta de `features/fees` para reutilizarlo.
- **Contrato:** `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts` regenerados. Clientes del cancel sin cuerpo (smoke E2E, Bruno) se actualizan en el mismo PR.
- **Colección Bruno, e2e y `docs/wireframes/import-in-progress/`.**
