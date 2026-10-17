# Proposal — import-upload-mapping

Issue: #4 · T2 · HU1: subir archivos de la plantilla y proponer el pareo (`POST /accounts/{id}/imports`) · Historia HU1 (CA 1–3) · Tramo 2 · Depende del tramo 1 (`auth-login`, `catalog-read`, archivados). Rama: `feat/import-upload`.

## Why

El flujo principal (README §1.3) empieza en Upload Files y Column Mapping, y hoy el backend no tiene ninguna ruta de importación: no se puede subir un archivo de la plantilla, no existe el módulo `imports` y las reglas de pareo sembradas en el tramo 0 (`MatchingSheetRule`, `MatchingColumnRule`, `MatchingStatusAlias`, conjunto "Provider C legacy") no las lee nadie. Este change crea el primer tramo de HU1: recibir uno o varios `.xlsx`, conservarlos tal cual, leer sus hojas **como texto** y devolver la propuesta de pareo con el origen de cada decisión, para que #5 (confirmar y analizar) y #6 (pantallas) tengan contrato y datos sobre los que trabajar.

## Secciones del README que implementa

- **§1.2 "Importación de archivos con pareo revisado"**: uno o varios `.xlsx` de la plantilla forman un batch; el sistema propone el pareo de hojas y columnas a partir de las reglas de la cuenta; el analista revisa antes de analizar. **"Identidad"**: la columna de ID se lee siempre como texto. **"CHB 2"**: alias legacy a `Chargeback` con `excludeAmount`.
- **§3.2 "Reglas de pareo"**: `MatchingRuleSet` por proveedor, enlazado desde la cuenta; reglas globales (`ruleSetId NULL`) como valores por defecto; una regla del conjunto prevalece sobre la global; alias globales. **§3.2 "Importación"**: `Import` en `uploaded`, `ImportFile` (`fileName`, `storagePath`, `sizeBytes`, `sha256` único por import), `ImportSheet` (`kind`, `cycle`, `statusId`, `rowCount`, `mappingConfirmed`).
- **§4 Convenciones**: alcance por merchant con `404`, cuerpo de error uniforme, `409` conflicto, `422` archivo que no se puede procesar, UUID para imports, archivos y hojas.
- **§4.2** `POST /accounts/{accountId}/imports` (contrato de la respuesta: `files[].sheets[].proposed/columns/preview`, `readiness`) y **§4.4** filas Importación: `GET /accounts/{id}/imports?status=`, `GET /imports/{id}`, `POST /imports/{id}/files`, `DELETE /imports/{id}/files/{fileId}`.
- **§5 HU1** criterios 1 (import `uploaded` con sus archivos, hojas y filas), 2 (añadir y quitar archivos; rechazo por huella) y 3 (propuesta con origen cuenta / global / sin propuesta).
- **§2.5 Seguridad**: "los archivos del proveedor se validan por tipo, tamaño, número de hojas y filas antes de parsearse".

## What Changes

- **Módulo `imports`** (`backend/src/modules/imports/{domain,application,infrastructure,http}`) con cinco rutas bajo `/api/v1`:
  - `POST /accounts/{id}/imports` (multipart, campo `files`, 1 a 10 `.xlsx` de hasta 20 MiB cada uno; permiso `settlement.process`) → `201` con el `Import` en `uploaded`, sus archivos, hojas, propuesta de pareo, vista previa y `readiness`.
  - `POST /imports/{id}/files` y `DELETE /imports/{id}/files/{fileId}` (permiso `settlement.process`; solo en `uploaded` o `mapped`) → `200` con el detalle recalculado. Un archivo con el mismo `sha256` que otro del import (o repetido dentro de la misma petición) responde `409 duplicate_file` con el archivo coincidente y no cambia nada.
  - `GET /accounts/{id}/imports?status=` y `GET /imports/{id}` (cualquier rol autenticado dentro de su alcance).
- **Módulo `matching`** (solo dominio, aplicación e infraestructura; sin rutas): la propuesta de pareo es una **función pura** sobre nombres de hoja, cabeceras y valores distintos de las columnas más las reglas (conjunto de la cuenta primero, globales después), con origen `account` / `global` / `none` por hoja y por columna; la resolución de alias de estado (`CHB 2` → `Chargeback` con `excludeAmount`) es otra función pura. Un repositorio Prisma carga las reglas vigentes de una cuenta.
- **Lector de `.xlsx` propio y acotado** (infraestructura de `imports`): lee `workbook.xml`, `sharedStrings.xml` y cada hoja en streaming, devuelve **todas las celdas como texto** (el XML de la celda tal cual, sin pasar por `number`), cuenta filas, conserva las cinco primeras como vista previa y respeta límites de descompresión, filas y columnas. Decisión de librería y límites en `design.md`.
- **Archivos en `UPLOAD_DIR`** (`imports/<importId>/<fileId>.xlsx`, nunca el nombre del usuario en la ruta) con `sha256` calculado al recibirlos; nueva variable de entorno `UPLOAD_DIR` validada en `config/env.ts` (valor por defecto `./data/uploads`, ya ignorado por git).
- **`packages/shared`**: esquemas Zod de `ImportSummary`, `ImportDetail` (archivos, hojas, `proposed`, `columns`, `preview`, `readiness`), `ImportsQuery`, `ProposalSource`, `UserRef`.
- **Errores de dominio reutilizables**: clase base `DomainError` (`status`, `code`, `details?`) en `backend/src/shared/errors.ts`; `NotFoundError` pasa a extenderla sin cambiar su respuesta; el manejador de errores la mapea una sola vez. Códigos nuevos, en minúsculas: `unsupported_file_type`, `file_too_large`, `too_many_files` (`400`), `duplicate_file`, `import_not_editable` (`409`), `file_unreadable` (`422`).
- **README §4.2**: se corrigen en el mismo change el ejemplo (`DUPLICATE_FILE` → `duplicate_file`, `FILE_UNREADABLE` → `file_unreadable`) y la leyenda de `source` (`rule`/`default` → `account`/`global`, que es lo que ya usa el ejemplo y lo que fija el issue #4).
- **Colección Bruno**: flujo `20-flows/imports` (subir `batch-split` part1, añadir part2, reintentar part1 → `409`, listar, detalle, quitar part2) y negativos en `10-smoke` (`401`, `403` con `viewer`, `400` sin archivos, `404` fuera de alcance).
- **OpenAPI**: las cinco rutas en `/docs/json`; `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts` regenerados (CI `openapi:check`).

## Capabilities

### New Capabilities

_Ninguna._ Subida, archivos y detalle pertenecen a `import` (README §3.2 "Importación", §4.2); la propuesta y los alias pertenecen a `matching` (README §3.2 "Reglas de pareo").

### Modified Capabilities

- `import`: se añaden los requisitos de subida (`POST /accounts/{id}/imports`), conservación del archivo original, añadir y quitar archivos, listado por cuenta, detalle, lectura de hojas como texto, propuesta de pareo en la respuesta y límites de lectura. Se modifican **Varios archivos por import** (detalle del `409 duplicate_file`, duplicado dentro de la misma petición, mismo archivo permitido en otro import), **Solo ID es obligatorio** (readiness al subir), **Ciclo y estado por hoja** (propuesta al subir) e **Importes positivos y moneda de referencia** (vista previa como texto; era el único requisito sin escenario).
- `matching`: se modifican **Reglas globales y conjuntos por proveedor** (precedencia exacta: conjunto de la cuenta, luego globales; igualdad sin distinguir mayúsculas o regex; `priority`; un `targetField` por hoja; origen `account` / `global` / `none`), **Alias de estado globales** (resolución sin distinguir mayúsculas y valores de estado resueltos en la propuesta), **Pareo confirmado es la fuente de verdad** (estado antes de confirmar) y **Coherencia ciclo–estado** (advertencia ya en la propuesta cuando un valor de estado tiene ciclo distinto al de la hoja); los dos últimos no tenían escenario.

## Escenarios de aceptación (del issue #4)

1. **`batch-clean` a `ProviderA-USD`** → `201`, import `uploaded`, un archivo con diez hojas: APP→E/Successful, DEC→E/Declined, CHB→I/Chargeback, REF→I/Refund, RDR→I/RDR, RR→R sin estado, `Other Fees`→`batch_fees`, `Duplicate Corrections`, `CHB Alerts` y `Settings` (oculta) → `ignore`; columnas `ID`→`transactionId`, `Amount`→`amount`, `Currency`→`currency`, todas con origen `global`; filas 340/110/3/7/3/320 (783 de transacciones, las mismas que `rows.read` de `expected.json`), 2 en `Other Fees`.
2. **`batch-split` part1 + part2** en una petición → un import con dos archivos y la propuesta sobre ambos; `POST /imports/{id}/files` con part1 otra vez → `409 duplicate_file` con `details.fileName = "Recon_Template_ProviderA-USD_batch-split_part1.xlsx"` y el import igual.
3. **`legacy-provider` a `ProviderC-Alt`** → `TRX`→E sin estado fijo, `Fail`→E/Declined, `CB`→I sin estado fijo, `Summary`→`ignore`, todas con origen `account`; `Merchant Order No#`→`transactionId`, `Order Status`→`status`, `Amount USD`→`amount` con origen `account`; la columna de estado de `CB` resuelve `CHB 2` → `Chargeback` con `excludeAmount = true`.
4. **Archivo que no es `.xlsx` o supera 20 MiB** → `400` sin crear el import.

La versión normativa está en `specs/import/spec.md` y `specs/matching/spec.md`.

## Fuera de alcance

Confirmar o editar el pareo (`PUT /imports/{id}/mapping`), analizar filas y cruzar por identidad externa (`POST /imports/{id}/analyze`, `GET /imports/{id}/rows`) y cancelar (#5); pantallas Upload Files y Column Mapping (#6); los bloques `batchFees` y `channels` del ejemplo de README §4.2, que necesitan filas parseadas y el catálogo de fees (llegan con #5 y el settlement review); administración de reglas de pareo; formatos distintos de `.xlsx`; auditoría de la subida (README §2.5 no la lista); cambios de esquema o migraciones (ninguno: las tablas `Import`, `ImportFile` e `ImportSheet` existen desde el tramo 0).

## Archivos que se crean o modifican

Nuevos:

```
packages/shared/src/imports.ts (+ .test.ts)                     esquemas de respuesta y query de imports
backend/src/modules/matching/domain/rules.ts                    tipos de reglas, alias y catálogo de estados
backend/src/modules/matching/domain/propose-mapping.ts (+ .test.ts)   propuesta pura: hojas, columnas, origen
backend/src/modules/matching/domain/status-alias.ts (+ .test.ts)      resolución de alias (CHB 2 → Chargeback, excludeAmount)
backend/src/modules/matching/application/ports.ts               MatchingRulesRepository
backend/src/modules/matching/infrastructure/prisma-matching-rules-repository.ts
backend/src/modules/imports/domain/workbook.ts                  WorkbookDescription / SheetDescription (todo texto)
backend/src/modules/imports/domain/upload-policy.ts (+ .test.ts)  extensión, nombre saneado, límites
backend/src/modules/imports/domain/readiness.ts (+ .test.ts)    canAnalyze, missing, notes
backend/src/modules/imports/domain/errors.ts                    errores 400 / 409 / 422 del módulo
backend/src/modules/imports/application/ports.ts                ImportRepository, FileStore, WorkbookReader
backend/src/modules/imports/application/import-service.ts (+ .test.ts)
backend/src/modules/imports/application/__fakes__/in-memory.ts  dobles en memoria y fixtures de las muestras
backend/src/modules/imports/infrastructure/xlsx/*.ts (+ tests)  lector OOXML acotado (zip + SAX)
backend/src/modules/imports/infrastructure/xlsx-workbook-reader.ts
backend/src/modules/imports/infrastructure/fs-file-store.ts (+ .test.ts)
backend/src/modules/imports/infrastructure/prisma-import-repository.ts
backend/src/modules/imports/http/multipart.ts                   partes multipart → archivos preparados (hash, tamaño)
backend/src/modules/imports/http/import-routes.ts (+ .test.ts)  cinco rutas
backend/src/modules/imports/imports-module.ts                   composición; depende de 'prisma' y 'auth'
backend/src/test-support/build-test-app.ts                      buildTestApp movido desde auth (tercer módulo)
backend/test/integration/imports.int.test.ts                    muestras contra SQL Server y UPLOAD_DIR temporal
api-collection/20-flows/imports/*.bru · api-collection/10-smoke/Import*.bru
```

Modificados: `backend/package.json` (`@fastify/multipart`, `fflate`, `saxes`), `backend/src/config/env.ts` (`UPLOAD_DIR`), `backend/src/app.ts` (registra `importsModule`; `BuildAppOptions.importService`), `backend/src/shared/errors.ts` y `backend/src/plugins/error-handler.ts` (`DomainError`), `backend/src/modules/auth/http/test-support.ts` (reexporta desde `test-support/`), `backend/src/app.test.ts` (rutas en `/docs/json`), `backend/test/integration/helpers.ts` (variables de entorno inyectables), `packages/shared/src/auth.ts` (`UserRef`) e `index.ts`, `docs/openapi.yaml`, `frontend/src/lib/api/schema.gen.ts`, `.env.example` (comentario de `UPLOAD_DIR`), `README.md` §4.2 (códigos y leyenda de `source`), `openspec/specs/import/spec.md` y `openspec/specs/matching/spec.md` (al archivar).

## Impact

- **API**: cinco rutas nuevas bajo `/api/v1`; ninguna existente cambia. Primer endpoint con `multipart/form-data` y primer uso de `requirePermission` fuera de `auth` (`settlement.process`): el primer negativo `403 forbidden` de la colección, como pedía la spec `api-collection`.
- **Dependencias nuevas del backend**: `@fastify/multipart` (oficial, Fastify 5), `fflate` (zip, MIT, sin dependencias) y `saxes` (SAX, ya presente en el lockfile como dependencia transitiva). Ninguna librería de hoja de cálculo completa (motivo en `design.md`).
- **Sistema de archivos**: el backend escribe en `UPLOAD_DIR` (por defecto `backend/data/uploads` al arrancar con `pnpm dev`; `data/uploads/` ya está en `.gitignore`); la integración usa un directorio temporal por ejecución.
- **Base de datos**: solo filas nuevas en `Import`, `ImportFile`, `ImportSheet` (sin tocar el esquema). `ImportSheet.kind/cycle/statusId` guardan la propuesta como instantánea con `mappingConfirmed = false`; `ImportSheetColumnMap` sigue vacío hasta que #5 confirme.
- **Resto de módulos**: `DomainError` queda disponible para fees, validation y settlement; `buildTestApp` pasa a `backend/src/test-support/` como anunció el design de `catalog-read` (D9).
- **CI**: sin jobs ni variables nuevas; `openapi:check` obliga a regenerar el contrato y el cliente; el job `integration` ejecuta la suite nueva contra el seed con `UPLOAD_DIR` temporal.
