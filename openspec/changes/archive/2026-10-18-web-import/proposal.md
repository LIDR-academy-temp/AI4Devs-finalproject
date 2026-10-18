# Proposal — web-import

Issue: #6 · T2 · HU1 · Pantallas Upload Files y Column Mapping (RT2-FE-003), con el **recorte del 18-oct** (último comentario del issue, doc 04 §3.1). Absorbe el smoke E2E de #7 (su último comentario: la suite E2E completa pasa a la Entrega 3 y #7 se cierra con el PR de #6). Depende de #4 (`import-upload-mapping`) y #5 (`import-analyze`), ambos archivados, y de #3 (`web-shell`).

## Why

El API de importación está completo desde #4 y #5 (subir, añadir y quitar archivos, propuesta de pareo, confirmar, analizar, filas, cancelar), pero solo se puede usar con `curl` o con la colección Bruno. HU1 es la puerta de entrada del flujo de reconciliación: sin estas pantallas el analista no puede preparar un batch en la aplicación, y las pantallas de los tramos 3 y 4 (Analysis & Validations, Settlement Review) no tienen de dónde arrancar.

## Secciones del README que implementa

- **§5 HU1**, criterios 1–5, 6 (salvo resolver ambiguas), 7 y 8 (cancelar; retomar solo por enlace directo, sin la lista In Progress).
- **§1.3**: pantallas New Reconciliation (solo la elección de cuenta, integrada en Upload Files), Upload Files y Column Mapping, y el resultado del análisis como primera parte de Analysis & Validations (contadores, filas y aviso de canales; las validaciones son de #10).
- **§4.2** y §4.4: consume `POST /accounts/{id}/imports`, `POST /imports/{id}/files`, `DELETE /imports/{id}/files/{fileId}`, `GET /imports/{id}`, `PUT /imports/{id}/mapping`, `POST /imports/{id}/analyze`, `GET /imports/{id}/rows`, `POST /imports/{id}/cancel`, y del catálogo `GET /merchants`, `/merchants/{id}/providers`, `/providers/{id}`, `/accounts/{id}`. **Ningún endpoint nuevo ni modificado.**
- **§6 Ticket 3**, con las desviaciones de la sección siguiente.

## What Changes

- **New Reconciliation · Upload Files** (`/reconciliations/new`, requiere `settlement.process`): merchant → proveedor → cuenta activa dentro del alcance; zona de arrastrar y soltar (y selector accesible por teclado) para varios `.xlsx`. Los archivos se suben uno a uno; el primero que el API acepta crea el import (si el primero falla, lo crea el siguiente) y la pantalla pasa a su espacio de trabajo sin interrumpir la cola, que sobrevive a la navegación.
- **Espacio de trabajo del import** (`/imports/$importId`), con tres pasos: **Files**, **Mapping** y **Analysis**; abre en el paso que corresponde al estado del import.
  - **Files**: archivos con sus hojas y filas, quitar y añadir mientras el import esté en `uploaded` o `mapped`; errores junto al archivo: duplicado por huella con el nombre del archivo coincidente, no `.xlsx`, más de 20 MiB, más de 10 archivos en una selección, `file_unreadable`.
  - **Mapping**: una tarjeta por archivo y una sección por hoja que destaca el nombre de la hoja y la propuesta en lenguaje del analista (p. ej. `CHB` · `Proposed: I · Chargeback — global rule`), con el tipo (`transactions` / `batch_fees` / `ignore`), ciclo y estado fijo propuestos y su origen (cuenta / global / sin propuesta); por columna, el campo propuesto y su origen; todo editable; vista previa de las primeras filas con la cabecera según el pareo en edición; **Confirm mapping** (`PUT`, el import pasa a `mapped`); barra de readiness y **Analyze** deshabilitado mientras haya `missing` o cambios sin confirmar, indicando hoja y campo.
  - **Analysis**: estado de carga sin doble envío mientras analiza (puede tardar decenas de segundos); contadores read / matched / unmatched / ambiguous / ignored y por ciclo; aviso de canales sin cuenta o con otra cuenta principal (incluidas las formas ocultas `outOfScope`); advertencias del análisis con su conteo; tabla de filas paginada en el servidor (TanStack Table), con unmatched y ambiguous primero y filtro por resultado. Las ambiguas muestran sus candidatas, sin acción.
  - **Cancel import** con confirmación, en cualquier estado cancelable; después, el import queda en solo lectura con un enlace para empezar uno nuevo en la misma cuenta.
- **Permisos en pantalla**: `viewer` (sin `settlement.process`) no ve New Reconciliation y, por enlace directo, ve el import en solo lectura: sin subir, quitar, editar, confirmar, analizar ni cancelar.
- **Menú**: la entrada New Reconciliation pasa a ser enlace; In Progress sigue deshabilitada.
- **Smoke E2E solo local** (workspace `e2e/`, Playwright + playwright-bdd, primer escenario Gherkin del proyecto; Gherkin porque README §2.6 lo compromete para la suite E2E): login como `analyst` → subir `batch-clean` a `ProviderA-USD` → confirmar la propuesta → analizar → ver 783 filas leídas, 780 matched y RAM-07 como canal sin cuenta → cancelar el import como limpieza. Se ejecuta con `pnpm test:e2e` contra la base sembrada y `pnpm dev`; el resultado se anota en la PR. El job de CI va al issue de la Entrega 3 (README §2.6, "En pipeline").
- **Catálogo de estados compartido**: constante `TRANSACTION_STATUSES` en `@recon/shared` junto a `TransactionStatusCode`, contrastada con las filas de `TransactionStatus` de la base sembrada por un test de integración del backend (D6).
- **README** corregido en el mismo change donde el Ticket 3 discrepa del contrato ya archivado (lista abajo).

### Desviaciones del Ticket 3 (se corrige el README)

1. Ruta `/accounts/:accountId/reconciliations/new` → `/reconciliations/new?merchantId=&providerId=&accountId=` (la cuenta se elige en la pantalla) y `/imports/$importId` para un import existente (D2).
2. Vista previa de 10 filas → **5**: es lo que devuelve `preview` (spec `import`, "Celdas leídas como texto").
3. `gateway` en la lista de campos → **no se ofrece**: el API lo rechaza (`400`, spec `import` "Campo gateway no admitido todavía").
4. Selector de estado por hoja con APP/DEC/CHB/REF/RR/Summary/Ignore → tres controles que reflejan el contrato: tipo, ciclo y estado fijo (D5).
5. "Save mapping" + "Analyze" separados, como pide el ticket (el prototipo los une en un botón).

## Huecos del API detectados (no se cambia el código del backend)

Quedan anotados aquí; los issues de seguimiento los abre la persona, no este change.

- **Sin catálogo de estados.** No hay `GET` de `TransactionStatus`; el selector de estado fijo usa la constante `TRANSACTION_STATUSES` de `@recon/shared` con los seis estados sembrados (1 Pending … 6 RDR), y un test de integración del backend la compara con la tabla `TransactionStatus` de la base sembrada. Seguimiento: `GET /transaction-statuses`.
- **Cancelar sin motivo.** La convención del prototipo pide motivo en las acciones irreversibles, pero `POST /imports/{id}/cancel` no acepta cuerpo; la pantalla pide solo confirmación. Seguimiento: añadir `reason` al cancel y a su `AuditLog`.
- **Límite de 10 archivos por petición, no por import.** El API no limita el total de archivos de un import; la pantalla aplica el límite a cada selección (D4).
- **Hojas sin confirmar fuera del readiness.** El detalle de un import `mapped` con hojas sin confirmar (por ejemplo, tras añadir un archivo) responde `readiness.canAnalyze = true`; solo `POST analyze` las nombra con `field = "confirmation"`. La pantalla las deriva de `mappingConfirmed` (design D7). Seguimiento: que `readiness` del detalle las incluya.
- **Análisis síncrono sin progreso.** `POST analyze` responde al terminar; la pantalla muestra un estado indeterminado y, si la conexión se corta, relee el import antes de dar error (D8).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `import`: se añaden los requisitos de las pantallas (Upload Files, Column Mapping, resultado del análisis, cancelar, solo lectura sin permiso, smoke E2E). Los requisitos de API existentes no cambian y ya tienen todos al menos un escenario.
- `web-shell`: cambia el requisito **Navegación filtrada por permisos**: New Reconciliation pasa a ser enlace para quien tiene `settlement.process` (sus escenarios `analyst` y `admin` decían "deshabilitada" y "solo Dashboard y Accounts son enlaces").

## Fuera de alcance (Entrega 3)

Resolver filas ambiguas desde la UI (`PATCH rows`); lista **In Progress** y aviso de "import abierto" en la cuenta; contexto de la cuenta del prototipo (último batch, fees preestablecidos); validaciones y botón Continue (#10); fees por batch (`batchFees`, se muestran en Settlement Review, #13); suite E2E completa y su job de CI; preajustes de hoja (APP, DEC…), pendientes de la primera sesión con revisores; guardar el pareo como regla de la cuenta; aviso al salir con cambios sin confirmar.

## Impact

- **Código nuevo**: `frontend/src/features/imports/` (pantallas, consultas, mutaciones, textos y tests), fixtures y handlers MSW del mundo de importación (detalles de `batch-clean`, `batch-split`, `batch-issues` y `legacy-provider` derivados de los `expected.json`); `e2e/` como workspace `@recon/e2e` (Playwright, playwright-bdd, un `.feature` y sus pasos).
- **Código modificado**: `frontend/src/app/router.tsx` (rutas), `app/App.tsx` (proveedor de la cola de subida, D4), `app/layout/nav-config.ts` (enlace), `frontend/src/lib/api/client.ts` (`ApiError.details`), `frontend/src/test/msw/*`, `packages/shared/src/vocabulary.ts` (`TRANSACTION_STATUSES`), `README.md` (§6 Ticket 3 y §2.6 con el comando E2E), `docs/wireframes/README.md` e `impl/` (capturas), `prompts.md`, `package.json` raíz (`test:e2e`).
- **Backend**: solo un test de integración nuevo (`backend/test/integration/transaction-statuses.int.test.ts`); sin cambios de código, API ni base de datos. Sin migraciones. CI sin cambios: el test nuevo corre en el job `integration` existente. La colección Bruno no cambia (no hay endpoints nuevos ni modificados).
- **Dependencias nuevas**: `@tanstack/react-table` (frontend); componentes shadcn `select`, `alert-dialog`, `tabs`, `tooltip`; `@playwright/test` y `playwright-bdd` (e2e). React Hook Form ya es dependencia directa del frontend desde `web-shell` (`react-hook-form`, con `@hookform/resolvers`); no se añade.
