# Proposal — import-analyze

Issue: #5 · T2 · HU1: confirmar pareo, analizar y cruzar por identidad externa · Historia HU1 (CA 4–8) · Tramo 2 · Depende de #4 (`import-upload-mapping`, archivado el 2026-10-17). Rama: `feat/import-analyze`.

## Why

Tras #4 el backend recibe los archivos de la plantilla y propone el pareo, pero el import se queda en `uploaded`: nadie confirma el pareo, ninguna fila llega a `ImportRow`, no existe el cruce por identidad externa `(gatewayId, sourceTransactionId)` que es la base de las ocho validaciones (#8) y del settlement, y la colección Bruno deja un import `uploaded` en cada ejecución porque no hay forma de cancelarlo. Este change cierra HU1: confirmar el pareo (`mapped`), parsear y cruzar (`analyzed`), avisar de canales, listar y resolver filas, y cancelar.

## Secciones del README que implementa

- **§1.2 "Identidad"**: identidad externa `(gatewayId, sourceTransactionId)` normalizada según `Gateway.idFormat` (`numeric`: solo dígitos sin ceros a la izquierda; `uuid`: 36 caracteres en minúsculas sin llaves); cruce en los gateways de los canales de la cuenta y, si no tiene ninguno, en los de los canales de su proveedor (regla fijada en la revisión del proposal y llevada al README en este change); `matched` / `unmatched` / `ambiguous`; ID leído como texto. **"Importación de archivos con pareo revisado"**: el analista confirma antes de analizar; para analizar debe estar el Transaction ID y la forma de obtener el estado; el resto de columnas se conserva como fila original. **"Cruce contra transacciones propias"**: no asociadas y ambiguas primero; aviso de canales sin asociar o de otra cuenta. **"CHB 2"**: `Chargeback` con `excludeAmount`. **"Importes del archivo siempre positivos"**: negativo = advertencia.
- **§3.2 "Importación"**: `Import.status` (`uploaded → mapped → analyzed`, `cancelled`), `analyzedAt`, `rowsTotal/Matched/Unmatched`; `ImportSheet.mappingConfirmed`; `ImportSheetColumnMap` como fuente de verdad del parseo; `ImportRow` (PK `(sheetId, rowNo)`, `transactionIdRaw`, `rawData`, `matchResult`, `detailJson` con candidatas). **"Catálogo"**: `Gateway.idFormat`, `AccountChannel.isPrimary`. **"Reglas de pareo"**: regla global de filas con `ID` vacío; alias de estado. **"Acceso y auditoría"**: `AuditLog` para acciones sin autor en otra tabla.
- **§4.2**: bloques `channels` y `batchFees` del ejemplo; `readiness` como contrato de lo que falta. **§4.4** filas Importación: `PUT /imports/{id}/mapping`, `POST /imports/{id}/analyze`, `GET /imports/{id}/rows?match=&page=`, `POST /imports/{id}/cancel`.
- **§5 HU1** criterios 4 (confirmar → `mapped`), 5 (no analiza sin ID o estado e indica hoja y campo), 6 (filas con fila original, normalización, cruce, `analyzed`, orden, fila ambigua resuelta y registrada), 7 (aviso de canales) y 8 (import analizado no se modifica; cancelar conserva evidencia). **HU2 CA8** (cancelar conserva archivos y filas).

## What Changes

- **`PUT /api/v1/imports/{id}/mapping`** (permiso `settlement.process`; solo en `uploaded` o `mapped`): guarda el pareo confirmado de **todas** las hojas del import (`kind`, `cycle`, `statusId`, columnas → `targetField`), marca `mappingConfirmed = true`, sustituye `ImportSheetColumnMap` y pasa el import a `mapped`. Valida la forma (hoja desconocida u omitida, columna que no existe en la cabecera, `targetField` repetido, `transactions` sin ciclo, ciclo `R` con estado, `batch_fees`/`ignore` con ciclo) con `400 validation_error`; un pareo incompleto (sin ID o sin estado) **se guarda** y se refleja en `readiness.missing`; es el análisis el que lo rechaza.
- **`POST /api/v1/imports/{id}/analyze`** (`settlement.process`; solo en `mapped`): relee los archivos con el pareo confirmado, crea una `ImportRow` por fila de cada hoja `transactions` (fila original en `rawData`, `rowNo` = fila de Excel), normaliza el ID según el `idFormat` de cada gateway de la cuenta, cruza por `(gatewayId, sourceTransactionId)` y marca `matched` / `unmatched` / `ambiguous` / `ignored` (ID vacío); una celda de ID numérica con notación científica o más de 15 dígitos **no se cruza**: queda `unmatched` con motivo `lossy_numeric_id`. Actualiza contadores y `analyzedAt`, pasa a `analyzed` y responde el detalle con `analysis` (filas por resultado y por ciclo, advertencias), `channels` y `batchFees`. Precondiciones incumplidas → `422 mapping_incomplete` con hoja y campo; más de 100 000 filas de transacciones sumando todos los archivos → `422 import_too_large` antes de leer nada (tope fijado tras la medición de D1).
- **Aviso de canales**: por cada canal de las transacciones asociadas, `assigned`, `unassigned` (sin fila en `AccountChannel`) o `assigned_to_other_account` con la cuenta principal actual.
- **`GET /api/v1/imports/{id}/rows?match=&sheetId=&page=&pageSize=`** (autenticado, alcance): página de filas con `unmatched` y `ambiguous` primero, cada una con sus datos resueltos, advertencias, candidatas (ambiguas) y `rawData`.
- **`PATCH /api/v1/imports/{id}/rows/{sheetId}/{rowNo}`** (`settlement.process`; import `analyzed`): elige el gateway de una fila `ambiguous` entre sus candidatas → `matched`; queda en `AuditLog` (`import.row.resolve_gateway`).
- **`POST /api/v1/imports/{id}/cancel`** (`settlement.process`; cualquier estado salvo `processed` y `cancelled`): pasa a `cancelled` conservando archivos, hojas, pareo y filas; queda en `AuditLog` (`import.cancel`).
- **Máquina de estados explícita** (normativa en `specs/import/spec.md`, "Máquina de estados del import"): `uploaded|mapped → mapped` (PUT mapping), `mapped → analyzed` (analyze), `uploaded|mapped|analyzed|validated → cancelled`. Respuestas `409`: `import_not_mapped` (analyze fuera de `mapped`), `import_not_editable` (mapping, archivos o PATCH fuera del estado permitido), `import_not_cancellable` (`processed` o ya `cancelled`), `row_not_ambiguous`. Un segundo `analyze` concurrente recibe `409`.
- **`batchFees` prellenados**: las filas de las hojas `batch_fees` (`Other Fees`) con el pareo confirmado, resueltas por título contra `FeeType` (`source = file`; tipo desconocido → `feeTypeId = null` con `warning`), en el detalle de todo import analizado. No se persisten como `ImportRow` (`cycle` es NOT NULL; deuda registrada, decisión 5 de la revisión).
- **Lector `.xlsx`**: nueva lectura de filas completas en streaming con los mismos límites de #4 (64 MiB inflados, 200 000 filas, 256 columnas), celdas como texto y marca de pérdida de precisión por celda.
- **Reutiliza de #4**: `DomainError` y códigos snake_case, alcance por merchant en el `WHERE` con `404` idéntico, readiness, `UNPROPOSED_SHEET_KIND`, dobles en memoria, `buildTestApp`.
- **`packages/shared`**: `MappingConfirmation`, `SheetMapping`, `ImportRowItem`, `ImportRowsQuery`, `ImportRowsPage`, `ResolveRowBody`, `ChannelNotice`, `BatchFeeProposal`, `AnalysisSummary`; `ImportSheetDetail` gana `mappingConfirmed` y `mapping`; `ImportDetail` gana `analysis`, `channels` y `batchFees` (null antes de analizar); `ReadinessItem` gana `field` opcional.
- **Auditoría compartida**: el puerto `AuditLogger` y su adaptador Prisma salen de `auth` a `shared`/`infrastructure` (reexportados desde `auth` para no tocar sus tests).
- **Colección Bruno**: el flujo `20-flows/imports` continúa tras quitar part2: añadir part2, analizar sin confirmar (`409`), confirmar, analizar (contadores de `batch-clean`), filas, resolver una fila no ambigua (`409`), añadir archivo tras analizar (`409`), **cancelar** (`200`) y cancelar de nuevo (`409`). `10-smoke`: `Mapping - viewer` (`403`), `Analyze - unknown import` (`404`), `Rows - unknown import` (`404` con `viewer`), `Resolve row - viewer` (`403`), `Cancel - viewer` (`403`).
- **OpenAPI**: cinco rutas nuevas en `/docs/json`; `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts` regenerados.
- **README**: §1.2 "Identidad" y §3.2 (`Transaction`, `ImportRow`) recogen la regla de gateways del cruce con respaldo en los canales del proveedor; el ejemplo de §4.2 pasa a `otherAccount: { accountId, name }`.

## Capabilities

### New Capabilities

_Ninguna._ Confirmación, análisis, filas y cancelación pertenecen a `import` (README §3.2 "Importación", §4.4); la precedencia de reglas, los alias por fila y el pareo confirmado como fuente de verdad pertenecen a `matching`.

### Modified Capabilities

- `import`: se añaden **Confirmación del pareo**, **Forma del pareo confirmado**, **Campo gateway no admitido todavía**, **Máquina de estados del import**, **Análisis del import**, **Precondiciones del análisis**, **Fila original de referencia**, **Estado e importe por fila**, **Normalización del ID por formato del gateway**, **Resultado del cruce**, **IDs con pérdida de precisión no se cruzan**, **Aviso de canales**, **Fees por batch prellenados desde la hoja de fees**, **Resumen del análisis**, **Filas del import**, **Resolución de una fila ambigua**, **Cancelación del import**, **Capacidad de análisis**, **Archivo duplicado dentro del import** y **Mismo archivo admitido en otro import** (los dos últimos salen de partir **Varios archivos por import**, 525 caracteres, como pide el issue). Se modifican **Varios archivos por import** (descripción recortada; escenario heredado "Batch repartido en dos archivos" con el resultado del análisis), **Solo ID es obligatorio** (escenario heredado "Hoja sin columna ID": `422` y el import sigue en `mapped`), **Ciclo y estado por hoja** (escenario heredado "Plantilla estándar": filas por ciclo y fees prellenados), **Cruce por identidad normalizada** (recortado a la regla de identidad; escenario "ID desconocido" con el detalle de la fila), **Filas sin ID se ignoran** (filas `ignored` persistidas), **Importes positivos y moneda de referencia** (advertencias del análisis), **Añadir y quitar archivos antes de analizar** (archivo añadido en `mapped`), **Imports de una cuenta** (contadores tras analizar), **Detalle de un import** (bloques nuevos) y **Readiness de la propuesta** (sobre el pareo efectivo).
- `matching`: se parte **Reglas globales y conjuntos por proveedor** (927 caracteres) en la precedencia (queda) más **Conjunto de reglas por proveedor**, **Comparación de patrones**, **Origen de cada propuesta** y **Un campo destino por hoja** (ADDED); el escenario heredado "Conjunto legacy del proveedor C" pasa a describir el procesado completo. Se modifican **Alias de estado globales** (resolución fila a fila; escenario heredado "CHB 2 legacy" con `excludeAmountRows`), **Pareo confirmado es la fuente de verdad** (qué gobierna tras confirmar) y **Coherencia ciclo–estado** (advertencia por fila en el análisis). Se añade **Estado fijo por hoja frente a columna de estado** (precedencia confirmada en la revisión, decisión 2) y **Longitud del ID numérico** en `import`.

Tras archivar, `openspec validate import --type spec --strict` y `openspec validate matching --type spec --strict` deben pasar sin avisos: ninguna descripción de requisito supera los 500 caracteres y todo requisito tiene escenario.

## Escenarios de aceptación (del issue #5 y heredados de #4)

1. **Hoja sin ID** → `PUT mapping` sin `transactionId` en APP se guarda (`mapped`, `readiness.missing` nombra APP); `POST analyze` → `422 mapping_incomplete` con `details.missing = [{ sheetName: "APP", field: "transactionId", … }]`; el import sigue en `mapped` y sin filas.
2. **`batch-clean` confirmado y analizado** → `analyzed`; `analysis.rows = { total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 }`, `byCycle = { E: 450, I: 10, R: 320 }`; APP 340, DEC 110, CHB 3, REF 7, RDR 3, RR 320 filas; `rowsTotal = 783`, `rowsMatched = 780`.
3. **`batch-issues`** → `unmatched = 1` (`4260465812403708`), `warnings.negative_amount = 1`, `channels` con RAM-13 `unassigned`, `batchFees` con `Fraud Monitoring Fee` sin tipo y con `warning`; **`batch-clean`** → `channels` incluye RAM-07 `unassigned` y RAM-01, RAM-02 `assigned`.
4. **Import `analyzed`** → `POST files` y `DELETE file` responden `409 import_not_editable`; `POST cancel` → `cancelled` con archivos, hojas y filas intactos; el mismo archivo se admite en un import nuevo.
5. **IDs como texto** → una celda de texto de 17 dígitos se guarda en `transactionIdRaw` y se devuelve exactamente igual; una celda **numérica** de 17 dígitos o en notación científica no se cruza y queda `unmatched` con `reason = "lossy_numeric_id"`.
6. **Heredados de #4**: batch repartido en dos archivos (part1 + part2 → mismos contadores que `batch-clean`), hoja sin columna ID (no pasa a `analyzed`), plantilla estándar (fees prellenados), conjunto legacy del proveedor C (81 filas `matched`, E 80, I 1, `Failed → Declined`), `CHB 2` legacy (`excludeAmount = true`, listada en las filas como `expected.excludeAmountRows`).

La versión normativa está en `specs/import/spec.md` y `specs/matching/spec.md`.

## Decisiones de la revisión del proposal (2026-10-17)

Nueve puntos que el README no fijaba se plantearon como preguntas abiertas y quedaron decididos en la revisión. Las specs y el design recogen estas decisiones; no quedan preguntas abiertas que cambien el alcance.

1. **Gateways del cruce (regla de negocio nueva; va al README §1.2 y §3.2).** Se cruza en los gateways de los canales asociados a la cuenta (`AccountChannel`); si la cuenta no tiene ninguno, en los gateways de los canales de su proveedor (`Channel.providerId = Account.providerId`). Solo si tampoco hay ninguno, las filas con ID quedan `unmatched` con `reason = "no_gateways"`.
2. **Estado fijo por hoja y columna `status` a la vez** (`legacy-provider`, hoja `Fail`): gana la hoja; si la columna resuelve a otro estado, advertencia `status_differs_from_sheet` por fila.
3. **Columna `gateway`**: fuera de alcance; `PUT mapping` responde `400 validation_error` si alguna columna se parea como `gateway`. Deuda registrada (cómo se traduce un valor de celda a un gateway).
4. **`txnDate`**: la columna se acepta en el pareo y se conserva en `rawData`; `ImportRow.txnDate` queda `NULL`. Deuda registrada (formato de la celda).
5. **Filas de `Other Fees`**: no se persisten en `ImportRow` (`cycle` NOT NULL); `batchFees` se deriva del archivo con el pareo confirmado. Deuda registrada: `cycle` nullable junto con `ImportSheet.kind` nullable (deuda de #4).
6. **PATCH de fila ambigua**: solo con el import en `analyzed` (`409 import_not_editable` en el resto); #8 decide qué pasa en `validated`.
7. **Auditoría del cancel**: se registra `import.cancel` en `AuditLog` (acción sin autor en otra tabla; `Import` no tiene `cancelledBy/At`).
8. **`otherAccount`** en `channels` es `{ accountId, name }`; el ejemplo de README §4.2 se corrige en este change.
9. **`MatchingRowIgnoreRule`**: solo se aplica la regla global "fila con `ID` vacío". Deuda registrada (sobre qué columna se comparan los patrones).

Se mantiene todo el alcance del issue, incluidos el PATCH de filas ambiguas con auditoría compartida y el fixture de gateway 9001 en integración. Deuda añadida en la revisión: caché por `(importId, updatedAt)` de la descripción del libro y de `batchFees`, para no releer el `.xlsx` en cada `GET` de un import analizado.

Supuestos menores que se aplican sin preguntar y quedan en la spec: `rowNo` es el número de fila de la hoja (cabecera = 1); `rowsUnmatched` no incluye las ambiguas; el orden secundario de las filas es archivo (`uploadedAt`), nombre de hoja y `rowNo` (no hay posición de hoja persistida); las hojas `ignore` no generan filas; un `analyze` se ejecuta de forma síncrona en la petición.

## Esquema

**Sin cambios ni migración.** Todo lo necesario existe desde el tramo 0: `ImportRow` (con `feeTypeRaw`, `detailJson`, `CHECK matchResult`, `ISJSON`), `ImportSheetColumnMap`, `ImportSheet.mappingConfirmed`, `Import.analyzedAt` y contadores, `Gateway.idFormat`, `AccountChannel.isPrimary` con el índice filtrado `UX_AccountChannel_primary` (migración `0002_constraints`), `MatchingStatusAlias`, `FeeType`, `AuditLog`. Si en `apply` apareciera una carencia, se para: la migración la genera el agente con `--create-only` y la aplica la persona.

## Fuera de alcance

Las ocho validaciones y `POST /imports/{id}/validations` (#8); pantallas Column Mapping y Analysis (#6); matching difuso; resolución de la columna `gateway`; conversión de `txnDate`; comparación de importe, moneda y fecha contra la transacción (advertencias de validación); administración de reglas; procesamiento, `SettlementBatchFee` y asociación efectiva de canales (settlement); análisis en segundo plano (worker); re-análisis de un import `analyzed` (se cancela y se crea otro, HU1 CA8).

## Archivos que se crean o modifican

Nuevos:

```
packages/shared/src/imports.ts (+ .test.ts, ampliados)              MappingConfirmation, ImportRowItem, ImportRowsPage, ChannelNotice, BatchFeeProposal, AnalysisSummary…
backend/src/shared/audit.ts                                          puerto AuditLogger/AuditEntry (sale de auth)
backend/src/infrastructure/prisma-audit-logger.ts                    adaptador (sale de auth; auth reexporta)
backend/src/modules/imports/domain/normalize-source-id.ts (+ .test.ts)   numeric / uuid, pérdida de precisión, longitud
backend/src/modules/imports/domain/match-rows.ts (+ .test.ts)            cruce puro: matched / unmatched / ambiguous + candidatas
backend/src/modules/imports/domain/build-rows.ts (+ .test.ts)            fila leída + pareo confirmado + alias → ImportRow (estado, importe, moneda, rawData, advertencias)
backend/src/modules/imports/domain/mapping-confirmation.ts (+ .test.ts)  validación estructural del PUT y pareo efectivo
backend/src/modules/imports/domain/analysis-preconditions.ts (+ .test.ts) missing con field (422)
backend/src/modules/imports/domain/channel-notice.ts (+ .test.ts)        assigned / unassigned / assigned_to_other_account
backend/src/modules/imports/domain/batch-fees.ts (+ .test.ts)            Other Fees → BatchFeeProposal contra FeeType
backend/src/modules/imports/domain/import-state.ts (+ .test.ts)          máquina de estados y errores 409
backend/src/modules/imports/infrastructure/xlsx/row-reader.ts (+ tests)  filas completas en streaming (rowNo, celdas texto, celdas con pérdida)
backend/src/modules/imports/infrastructure/prisma-import-row-repository.ts  inserción por lotes bajo el límite de parámetros, claim y cierre del análisis, páginas, groupBy
backend/src/modules/imports/infrastructure/prisma-transaction-lookup.ts  (gatewayId, sourceTransactionId) IN (...)
backend/src/modules/imports/infrastructure/prisma-account-context.ts     gateways de la cuenta, asignación de canales, tipos de fee
backend/test/integration/import-rows.int.test.ts                         medición de la inserción (grupo 1)
backend/test/integration/import-analyze.int.test.ts                      cinco muestras contra expected.json, ambigua, pérdida de precisión, cancel
api-collection/20-flows/imports/8…18 *.bru · api-collection/10-smoke/{Mapping - viewer, Analyze - unknown import, Rows - unknown import, Resolve row - viewer, Cancel - viewer}.bru
```

Modificados: `backend/src/modules/imports/{application/ports.ts, application/import-service.ts (+ .test.ts), application/__fakes__/in-memory.ts, domain/errors.ts, domain/readiness.ts, domain/workbook.ts, http/import-routes.ts (+ .test.ts), imports-module.ts, infrastructure/prisma-import-repository.ts, infrastructure/xlsx-workbook-reader.ts, infrastructure/xlsx/sheet-parser.ts}`, `backend/src/modules/auth/{application/ports.ts, infrastructure/prisma-audit-logger.ts, application/__fakes__/in-memory.ts}` (reexports), `backend/src/app.test.ts`, `backend/test/integration/imports.int.test.ts` (limpieza de `ImportRow`), `docs/openapi.yaml`, `frontend/src/lib/api/schema.gen.ts`, `README.md` §1.2 "Identidad", §3.2 (`Transaction`, `ImportRow`) y §4.2 (ejemplo de `otherAccount`), `openspec/specs/import/spec.md` y `openspec/specs/matching/spec.md` (al archivar).

## Impact

- **API**: cinco rutas nuevas bajo `/api/v1`; las de #4 no cambian de contrato salvo campos **añadidos** al detalle (`mappingConfirmed`, `mapping`, `analysis`, `channels`, `batchFees`, `ReadinessItem.field`), todos presentes con `null`/`false` antes de analizar, así que #6 puede apoyarse en una sola forma de respuesta.
- **Base de datos**: primeras escrituras en `ImportSheetColumnMap`, `ImportRow` (hasta 100 000 filas por import, en lotes bajo el límite de 2 100 parámetros de SQL Server, dentro de una transacción con tiempo ampliado; medido en el primer grupo de tareas: 783 filas en < 1 s, 20 000 en 12,8 s) y `AuditLog` desde `imports`; actualizaciones de `Import` y `ImportSheet`. Sin cambios de esquema.
- **Dependencias**: ninguna nueva (`Prisma.Decimal` cubre el importe; `decimal.js` ya viene con Prisma).
- **Rendimiento**: `analyze` es síncrono y CPU + E/S; con las muestras reales (≤ 783 filas) debe cerrar en menos de 3 s; el tope de 100 000 filas por import se mide una vez y se documenta (análisis asíncrono y `OPENJSON` quedan como deuda). `GET /imports/{id}` de un import analizado añade agregados sobre `ImportRow` (groupBy, canales, advertencias) y sigue releyendo el `.xlsx` para la propuesta y `batchFees` (caché por `(importId, updatedAt)` registrada como deuda).
- **Resto de módulos**: `AuditLogger` queda disponible para validation y settlement; `auth` no cambia de comportamiento. `TransactionLookup` y `AccountContext` son puertos del módulo `imports` que #8 reutilizará.
- **CI**: sin jobs nuevos; `openapi:check` obliga a regenerar; el job `integration` ejecuta las dos suites nuevas contra el seed (la medición de 200 000 filas es opcional, fuera de CI).
