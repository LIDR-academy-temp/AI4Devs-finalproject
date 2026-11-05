# Spec Delta — import

## ADDED Requirements

### Requirement: Imports en curso
`GET /api/v1/imports` SHALL responder `200` con `{ items, page, pageSize, total }` con los imports de las cuentas del alcance de quien llama, del `updatedAt` más reciente al más antiguo y, a igual `updatedAt`, por `importId`. Cada elemento SHALL traer el resumen del import más `account`, `provider` y `merchant` (`id` y `name`). Sin `status`, SHALL listar solo `uploaded`, `mapped`, `analyzed` y `validated`. SHALL exigir token y ningún permiso.

#### Scenario: Imports abiertos por defecto
- **GIVEN** un import de `batch-split_part1.xlsx` en `uploaded` en `ProviderA-USD`, uno de `Legacy_ProviderC-Alt_batch.xlsx` en `mapped` en `ProviderC-Alt` y otro cancelado en `ProviderA-USD`
- **WHEN** `analyst` llama a `GET /api/v1/imports`
- **THEN** recibe `200` con los dos abiertos y sin el cancelado, el más recientemente actualizado primero
- **AND** el de `ProviderC-Alt` trae `status = "mapped"`, `fileCount = 1`, `createdBy.userName = "analyst"`, `account = { id: <ProviderC-Alt>, name: "ProviderC-Alt" }`, `provider = { id: 201, name: "Provider C" }` y `merchant = { id: 2, name: "Merchant B" }`

#### Scenario: Alcance de quien consulta
- **GIVEN** los mismos imports
- **WHEN** `viewer` (solo `Merchant A`) llama a `GET /api/v1/imports`
- **THEN** recibe `200` con el de `ProviderA-USD` y ningún import de `ProviderC-Alt`

#### Scenario: Sin token
- **WHEN** se llama a `GET /api/v1/imports` sin token
- **THEN** recibe `401` con `code = "unauthorized"`

#### Scenario: Import analizado en la lista
- **GIVEN** un import de `batch-split` (las dos partes) analizado en `ProviderA-USD`
- **WHEN** `analyst` lo busca en `GET /api/v1/imports?status=analyzed`
- **THEN** su elemento trae `analyzedAt` no nulo, `rowsTotal = 783`, `rowsMatched = 780`, `rowsUnmatched = 0` y `fileCount = 2`

### Requirement: Filtros de imports en curso
`GET /api/v1/imports` SHALL filtrar por `status` (un estado de `Import`, también `processed` o `cancelled`), `merchantId`, `providerId`, `accountId` y `mine=true` (solo los creados por quien llama), combinados con AND. Un valor fuera de su vocabulario o formato SHALL responder `400 validation_error`; un merchant, proveedor o cuenta inexistente o fuera del alcance, `404 not_found`, igual en los dos casos.

#### Scenario: Por cuenta y por estado
- **GIVEN** los imports del escenario "Imports abiertos por defecto"
- **WHEN** `analyst` pide `?accountId=<ProviderC-Alt>` y después `?status=cancelled`
- **THEN** la primera respuesta trae solo el import de `ProviderC-Alt` y la segunda solo el cancelado

#### Scenario: Solo los míos
- **GIVEN** un import abierto creado por `analyst` y otro creado por `admin`, en cuentas del alcance de los dos
- **WHEN** `analyst` pide `?mine=true`
- **THEN** recibe solo el suyo, y con `?mine=false` o sin `mine` recibe los dos

#### Scenario: Filtro fuera del alcance
- **WHEN** `viewer` pide `?merchantId=2`, `?providerId=201` o `?accountId=<ProviderC-Alt>`, o `analyst` pide `?accountId=00000000-0000-4000-8000-00000000ffff`
- **THEN** recibe `404` con `code = "not_found"` y el mismo cuerpo en todos los casos

#### Scenario: Valores no válidos
- **WHEN** se pide `?status=weird`, `?mine=yes`, `?merchantId=abc` o `?accountId=123`
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Paginación de imports en curso
`page` (desde 1, por defecto 1) y `pageSize` (de 1 a 500, por defecto 50) SHALL paginar la lista de `GET /api/v1/imports` sobre un orden estable entre páginas; fuera de rango SHALL responder `400 validation_error`. `total` SHALL contar todos los imports que cumplen los filtros.

#### Scenario: Dos páginas
- **GIVEN** tres imports abiertos en `ProviderA-USD`
- **WHEN** `analyst` pide `?accountId=<ProviderA-USD>&pageSize=2` y después `&page=2`
- **THEN** la primera página trae dos imports y `total = 3`, la segunda el tercero, y ningún import se repite entre páginas

#### Scenario: Fuera de rango
- **WHEN** se pide `?page=0`, `?pageSize=0` o `?pageSize=501`
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Motivo de la cancelación
`POST /api/v1/imports/{id}/cancel` SHALL exigir el cuerpo `{ reason }`, de 1 a 500 caracteres sin los espacios de los extremos y sin otros campos, y SHALL guardarlo recortado en `AuditLog.detailJson.reason` de `import.cancel`, junto al estado anterior y la corrida. Un cuerpo ausente o no válido SHALL responder `400 validation_error` sin cambiar el import ni auditar.

#### Scenario: Cancelar con motivo
- **GIVEN** un import de `batch-split` analizado
- **WHEN** `analyst` cancela con `{ reason: "  Wrong file from the provider  " }`
- **THEN** recibe `200` con `status = "cancelled"` y existe una fila de `AuditLog` con `action = "import.cancel"`, `detailJson.reason = "Wrong file from the provider"`, `detailJson.previousStatus = "analyzed"` y `detailJson.runId = null`

#### Scenario: Sin motivo
- **GIVEN** un import en `uploaded`
- **WHEN** se cancela sin cuerpo, con `{}`, con `{ reason: "   " }`, con un motivo de 501 caracteres o con `{ reason: "x", note: "y" }`
- **THEN** recibe `400` con `code = "validation_error"`, el import sigue en `uploaded` y no se escribe ninguna fila de `AuditLog`

#### Scenario: Permiso con motivo
- **WHEN** `viewer` cancela un import con `{ reason: "Not mine" }`
- **THEN** recibe `403` con `code = "forbidden"`

### Requirement: Hojas sin confirmar en la readiness
En un import `mapped`, la `readiness` de cualquier respuesta con el detalle SHALL incluir en `missing`, en el orden de las hojas, un elemento `{ sheetId, sheetName, field: "confirmation", message }` por cada hoja con `mappingConfirmed = false`, y ningún otro elemento de esa hoja; `canAnalyze` SHALL ser `false` mientras quede alguna. En `uploaded` la readiness SHALL seguir evaluando la propuesta sin elementos `confirmation`.

#### Scenario: Archivo añadido tras confirmar
- **GIVEN** un import en `mapped` con `batch-split_part1.xlsx` confirmado
- **WHEN** `analyst` añade `batch-split_part2.xlsx` y después pide `GET /api/v1/imports/{id}`
- **THEN** las dos respuestas traen `readiness.canAnalyze = false` y un elemento `confirmation` por cada hoja de `part2`, en el orden de sus hojas, los mismos que nombra el `422 mapping_incomplete` de un `POST analyze` inmediato

#### Scenario: Confirmar las hojas nuevas
- **GIVEN** ese import
- **WHEN** `analyst` confirma el pareo de todas las hojas tal como se propuso
- **THEN** la respuesta del `PUT` trae `readiness.canAnalyze = true` y `missing = []`

#### Scenario: Recién subido
- **WHEN** se sube `batch-split_part1.xlsx` a `ProviderA-USD`
- **THEN** el import está en `uploaded`, `readiness.canAnalyze = true` y `missing` no contiene ningún elemento `confirmation`

### Requirement: Pantalla In Progress: lista
`/reconciliations/in-progress` SHALL listar `GET /imports` paginado en el servidor (50 por página), en el orden del API, con cuenta (y `merchant › proveedor` debajo), archivos, filas leídas (`rowsTotal`, o `—` antes del análisis), estado con su color, quién lo empezó, creado y actualizado. Sin imports SHALL mostrar `No imports in progress.` con un enlace **Start a new reconciliation** a `/reconciliations/new`.

#### Scenario: Imports abiertos
- **GIVEN** un import de `batch-split_part1.xlsx` en `uploaded` en `ProviderA-USD` creado por `analyst`
- **WHEN** `analyst` abre In Progress
- **THEN** ve una fila con `ProviderA-USD`, `Merchant A › Provider A`, `1` archivo, `—` filas, el estado `uploaded`, `analyst` y sus fechas, y se pidió `GET /imports?page=1&pageSize=50`

#### Scenario: Sin imports
- **GIVEN** que `GET /imports` responde `total = 0`
- **WHEN** `analyst` abre In Progress
- **THEN** ve `No imports in progress.` y **Start a new reconciliation** lleva a `/reconciliations/new`

#### Scenario: Ancho de pantalla
- **WHEN** `analyst` abre In Progress con imports a 1280 y a 1024 px
- **THEN** la página no se desplaza en horizontal

### Requirement: Pantalla In Progress: filtros
In Progress SHALL ofrecer filtros de merchant, proveedor (del merchant elegido), cuenta (del proveedor elegido), estado (`Any open status` o uno de los cuatro abiertos) y **Only mine**, guardados en la dirección junto con la página. Cambiar un filtro SHALL volver a la página 1. Un merchant, proveedor o cuenta de la dirección fuera del alcance SHALL mostrar `This selection is not available.` sin pedir la lista.

#### Scenario: Filtrar por estado y solo los míos
- **WHEN** `analyst` elige el estado `mapped` y marca **Only mine** estando en la página 2
- **THEN** la dirección pasa a `?status=mapped&mine=true` sin `page`, se pide `GET /imports?status=mapped&mine=true&page=1&pageSize=50` y al recargar la página los filtros siguen elegidos

#### Scenario: Merchant, proveedor y cuenta
- **WHEN** `analyst` elige `Merchant B`, después `Provider C` y después `ProviderC-Alt`
- **THEN** el selector de proveedor solo ofrece los de `Merchant B`, el de cuenta solo los de `Provider C`, y la lista se pide con `merchantId=2&providerId=201&accountId=<ProviderC-Alt>`

#### Scenario: Selección fuera del alcance
- **WHEN** `analyst` abre `/reconciliations/in-progress?merchantId=999`, un merchant que no está entre los de su alcance
- **THEN** ve `This selection is not available.` y no se pide `GET /imports`

### Requirement: Pantalla In Progress: retomar y cancelar
Cada fila SHALL ofrecer **Resume**, un enlace a `/imports/<importId>` que abre el import en el paso de su estado, y **Cancel**, el mismo diálogo con motivo obligatorio del espacio del import. Cancelado, la lista SHALL volver a pedirse; ante `409 import_not_cancellable` SHALL mostrar `This import can no longer be cancelled (<estado>).` y volver a pedir la lista.

#### Scenario: Retomar un import pareado
- **GIVEN** un import en `mapped` en la lista
- **WHEN** `analyst` pulsa **Resume**
- **THEN** llega a `/imports/<importId>` en el paso Mapping

#### Scenario: Cancelar desde la lista
- **GIVEN** un import en `uploaded` en la lista sin filtro de estado
- **WHEN** `analyst` pulsa **Cancel**, escribe `Duplicate upload` y confirma
- **THEN** se llama a `POST /imports/<importId>/cancel` con `{ reason: "Duplicate upload" }` y, al volver a pedirse la lista, el import ya no aparece

#### Scenario: Cancelado por otra persona
- **WHEN** `POST cancel` desde la lista responde `409 import_not_cancellable` con `details.status = "cancelled"`
- **THEN** ve `This import can no longer be cancelled (cancelled).` y la lista se vuelve a pedir

## MODIFIED Requirements

### Requirement: Pantalla Column Mapping: readiness y Analyze
La barra de readiness SHALL mostrar `Ready to analyze` o cada elemento de `readiness.missing` como `<hoja> · <campo>: <mensaje>`, y las `notes`, tal como los da el API, sin derivar nada de `mappingConfirmed`. **Analyze** SHALL habilitarse solo en `mapped`, con `readiness.canAnalyze = true` y sin cambios sin confirmar; deshabilitado, SHALL indicar el motivo.

#### Scenario: Hoja sin ID
- **GIVEN** un import en `mapped` cuya hoja `APP` se confirmó sin `Transaction ID`
- **WHEN** `analyst` abre el paso Mapping
- **THEN** **Analyze** está deshabilitado y la barra muestra `APP · transactionId` con su mensaje
- **AND** al parear `ID` → `Transaction ID` y confirmar, la barra muestra `Ready to analyze` y **Analyze** se habilita

#### Scenario: Pareo sin confirmar
- **GIVEN** el import de `batch-clean` en `uploaded` con `readiness.canAnalyze = true`
- **WHEN** abre el paso Mapping
- **THEN** **Analyze** está deshabilitado con `Confirm the mapping before analyzing.`

#### Scenario: Cambios sin confirmar
- **GIVEN** un import en `mapped` listo para analizar
- **WHEN** `analyst` cambia un campo sin confirmar
- **THEN** **Analyze** se deshabilita con `Confirm the mapping before analyzing.` hasta que confirma

#### Scenario: Archivo añadido tras confirmar
- **GIVEN** un import en `mapped` con `part1` confirmado
- **WHEN** `analyst` añade `part2`
- **THEN** la barra nombra cada hoja de `part2` con `confirmation`, tomadas de `readiness.missing` del detalle (que responde `canAnalyze = false`), y **Analyze** está deshabilitado

### Requirement: Cancelación del import desde la pantalla
Con permiso y el import en `uploaded`, `mapped`, `analyzed` o `validated`, el espacio del import SHALL ofrecer **Cancel import**, que abre un diálogo con un campo `Reason` obligatorio (1–500 caracteres) y llama a `POST cancel` con el motivo, sin los espacios de los extremos, solo al confirmar. Cancelado, el import SHALL mostrarse en solo lectura con su estado y un enlace para empezar un import nuevo en la misma cuenta.

#### Scenario: Cancelar un import analizado
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** `analyst` pulsa **Cancel import**, escribe `Wrong file from the provider` y confirma
- **THEN** se llama a `POST cancel` con `{ reason: "Wrong file from the provider" }`, el import muestra `cancelled`, el paso Analysis conserva contadores y filas, no hay acciones de edición y **Start a new import** lleva a `/reconciliations/new` con `ProviderA-USD` elegida

#### Scenario: Motivo vacío
- **WHEN** `analyst` abre el diálogo y el campo `Reason` está vacío o solo tiene espacios
- **THEN** **Yes, cancel the import** está deshabilitado y no se llama a `POST cancel`

#### Scenario: Motivo nuevo cada vez
- **WHEN** `analyst` escribe un motivo, cierra el diálogo sin confirmar y lo vuelve a abrir
- **THEN** el campo `Reason` está vacío

#### Scenario: Desistir
- **WHEN** `analyst` pulsa **Cancel import** y cierra el diálogo sin confirmar
- **THEN** no se llama a `POST cancel` y el import no cambia

#### Scenario: Ya no cancelable
- **WHEN** `POST cancel` responde `409 import_not_cancellable`
- **THEN** ve `This import can no longer be cancelled (<estado>).` y la pantalla se recarga

### Requirement: Smoke E2E de la importación
El proyecto SHALL tener un escenario E2E en Gherkin, ejecutable en local con un comando, que contra la aplicación y el API reales con el seed cargado recorra login → subida → confirmación → análisis, compruebe el resultado de `batch-clean` contra su `expected.json` y cancele el import al terminar, con un motivo.

#### Scenario: Batch limpio de punta a punta
- **GIVEN** la base sembrada y la aplicación levantada
- **WHEN** `analyst` entra, elige `ProviderA-USD`, sube `Recon_Template_ProviderA-USD_batch-clean.xlsx`, confirma la propuesta tal cual y pulsa **Analyze**
- **THEN** ve `Rows read 783` y `Matched 780` y el aviso `RAM-07 is not assigned yet`
- **AND** al cancelar el import como limpieza, escribiendo un motivo, ve `cancelled`

#### Scenario: Aplicación no levantada
- **WHEN** se ejecuta el smoke sin la aplicación o el API levantados
- **THEN** falla antes del primer paso con un mensaje que indica cómo levantar la base, el seed y la aplicación
