# Design — web-import

> **Revisión del design (2026-10-17):** D2 y D3 aprobadas. D4 aprobada con dos correcciones ya incorporadas: la cola de subida sobrevive a la navegación y, si el primer archivo falla, el siguiente aceptado crea el import. D5 mantiene los tres controles por hoja, con nombre de hoja y propuesta destacados en cada tarjeta. D6 lleva la constante a `@recon/shared` con un test de integración contra la base sembrada. D11 queda solo local, sin job de CI. Los issues de los huecos del API los abre la persona. Aprobadas la limpieza del smoke (cancela su import) y el filtro de la tabla en la URL. El resto sigue los patrones de `web-shell` (D3, D7, D10, D11 de su design).

## Context

- **Frontend** (archivado en `web-shell`): TanStack Router con árbol en código (`app/router.tsx`, `staticData.requires` y `crumbs`), guarda de permiso de presentación en `AppLayout`, TanStack Query (`lib/query-client.ts`, sin reintentos en `4xx`), cliente `openapi-fetch` generado (`lib/api/client.ts` con `unwrap` → `ApiError { status, code }`; `lib/api/types.ts` con `ApiResponse<…>`), `authFetch` que repite una vez tras un `401` clonando la petición, shadcn/ui (`alert`, `badge`, `button`, `card`, `input`, `label`, `skeleton`, `table`), `formatDecimal` sobre strings, un `strings.ts` por pantalla, MSW con un API falso con estado (`test/msw/handlers.ts`, `fixtures.ts`) y `renderApp(path, { as })`. Las consultas de catálogo de Accounts (`features/accounts/queries.ts`) tienen claves por recurso reutilizables.
- **Menú**: `nav-config.ts` tiene New Reconciliation e In Progress sin `to` (deshabilitadas) con `requires: 'settlement.process'`.
- **API de importación** (spec `import`): todas las rutas devuelven `ImportDetail` completo salvo `GET rows` (`ImportRowsPage`) y la lista por cuenta. `POST /accounts/{id}/imports` y `POST /imports/{id}/files` son `multipart/form-data` (partes `files`) sin `body` tipado en el contrato. Errores: `400 unsupported_file_type | file_too_large | too_many_files | validation_error`, `409 duplicate_file { fileId, fileName } | import_not_editable { status } | import_not_mapped { status } | import_not_cancellable { status }`, `422 file_unreadable | mapping_incomplete { missing } | import_too_large { rows, limit }`, `403 forbidden`, `404 not_found`. `GET /imports/{id}` relee los archivos en cada llamada (decenas de ms).
- `GET /accounts/{id}` devuelve la cuenta con `provider` y `merchant` (cabecera del import). No hay catálogo de estados de transacción en el API; el seed lo define en `backend/prisma/synthetic.ts` (`TRANSACTION_STATUSES`: `statusId`, `code`, `name`, `cycle`) y lo escribe en la tabla `TransactionStatus` (mismas columnas). `@recon/shared` solo tiene `TransactionStatusCode` (los seis códigos, sin ids).
- React Hook Form y `@hookform/resolvers` ya son dependencias directas del frontend (Login, `web-shell`).
- **E2E**: `e2e/` existe solo con `.gitkeep` y ya está en `pnpm-workspace.yaml`. README §2.6 compromete Playwright con "Escenarios en Gherkin" para la suite E2E (y `CLAUDE.md` fija `e2e/` como Playwright + playwright-bdd), y sitúa el E2E en el pipeline en la Entrega 3.
- Muestras: `data/samples/*/expected.json` dan contadores, canales y fees; hojas, `rowCount` y primera fila de vista previa están en los escenarios de la spec `import`.

## Goals / Non-Goals

**Goals:**
- Un solo espacio de trabajo por import en el que el pareo en edición sobrevive a añadir o quitar archivos y a moverse entre pasos.
- El API sigue siendo la autoridad: readiness, transiciones y rechazos vienen de sus respuestas; el cliente solo adelanta los rechazos baratos (extensión, tamaño, número) y la coherencia del formulario.
- Que T3 (#10) añada las validaciones al paso Analysis sin rehacer la estructura.

**Non-Goals:**
- Estado de servidor fuera de TanStack Query; caché persistente.
- Progreso real del análisis (el API es síncrono).
- Protección frente a salir de la página con cambios sin confirmar (queda anotada en el proposal como fuera de alcance).

## Decisions

### D1 Estructura de `features/imports/`
```
features/imports/
  NewReconciliationPage.tsx   AccountPicker.tsx      validate-search.ts
  ImportPage.tsx              ImportHeader.tsx       StepTabs.tsx
  files/    FilesStep.tsx  DropZone.tsx  FileList.tsx  file-checks.ts
            upload-queue.ts (almacén por pestaña)  UploadQueueProvider.tsx
  mapping/  MappingStep.tsx  SheetCard.tsx  ColumnRow.tsx  Preview.tsx  ReadinessBar.tsx
            mapping-form.ts (valores, esquema, conversión a MappingConfirmation)  field-options.ts
  analysis/ AnalysisStep.tsx  Counters.tsx  ChannelNotice.tsx  Warnings.tsx  RowsTable.tsx
  CancelImportDialog.tsx
  queries.ts  mutations.ts  permissions.ts  strings.ts
  *.test.ts(x)
```
La elección merchant → proveedor reutiliza `merchantsQuery`, `providersQuery` y `providerQuery` de `features/accounts/queries.ts`; se añade `accountQuery(accountId)` (`GET /accounts/{id}`) junto a ellas, con clave `['accounts', accountId]`.

### D2 (aprobada) Rutas: `/reconciliations/new` y un solo `/imports/$importId` con el paso en la búsqueda
- `/reconciliations/new?merchantId&providerId&accountId` (`requires: 'settlement.process'`, migas `Reconciliation › New Reconciliation`). `validateSearch` con `IntId` para merchant y proveedor y `z.uuid()` para la cuenta, como Accounts. Preselecciona cuando hay un único valor (mismo comportamiento que Accounts). Solo cuentas con `isActive`.
- `/imports/$importId?step=files|mapping|analysis&match=&page=` (sin `requires`: el API decide el alcance y `viewer` puede leer), migas `Reconciliation › Import`. Sin `step`, el paso sale del estado (spec "Retomar un import por su enlace"). Los pasos posteriores al estado se muestran deshabilitados en las pestañas (Analysis antes de analizar).
- **Por qué una sola ruta con el paso en la búsqueda y no rutas anidadas** (`/imports/$id/files`, `/mapping`, `/analysis`): el formulario de pareo vive en `ImportPage`, que no se desmonta al cambiar de paso; así el pareo editado sobrevive a subir un duplicado o quitar un archivo en Files (criterio 4 del Ticket 3) sin un almacén aparte. Con rutas anidadas el formulario tendría que subir a un contexto del layout del import o a un store, con la misma complejidad y más superficie.
- La entrada del menú New Reconciliation pasa a `to: '/reconciliations/new'` y se marca activa también bajo `/imports/*` (escenario del delta de `web-shell`).
- Ticket 3 decía `/accounts/:accountId/reconciliations/new`; se corrige el README (proposal, desviación 1).

### D3 Estado de servidor
- `importQuery(importId)` → `['imports', importId]`, `staleTime: 30 s` y sin `refetchOnWindowFocus` (cada `GET` relee los `.xlsx` en el servidor). `importRowsQuery(importId, { match, page })` → `['imports', importId, 'rows', { match, page }]` con `placeholderData: keepPreviousData` para que paginar no parpadee.
- Todas las mutaciones que devuelven `ImportDetail` (crear, añadir, quitar, confirmar, analizar, cancelar) escriben la respuesta con `setQueryData(['imports', id])` en vez de invalidar (evita un segundo `GET` que relee archivos); analizar y cancelar invalidan además `['imports', id, 'rows']`. La lista por cuenta (`['accounts', id, 'imports']`) se invalida en cada mutación, aunque esta pantalla no la usa todavía (la usará In Progress).
- `409` de transición (`import_not_editable`, `import_not_mapped`, `import_not_cancellable`): se muestra el mensaje con `details.status` y se hace `refetch` del detalle. `ApiError` se amplía con `details?: unknown` (hoy descarta el cuerpo salvo `code` y `message`); es un cambio compatible en `lib/api/client.ts`.

### D4 Subida archivo a archivo (aprobada con correcciones)
- La selección (soltar o elegir) pasa por `file-checks.ts`: más de 10 archivos → se rechaza la selección entera (`too_many_files`); por archivo, extensión `.xlsx` sin distinguir mayúsculas (`unsupported_file_type`) y `size > 20 971 520` (`file_too_large`). Los rechazados quedan en la lista con su motivo y no se envían.
- La cola envía los aceptados **uno por petición y en orden**. Mientras no hay import, cada archivo se envía con `POST /accounts/{id}/imports`; **el primero que el API acepta crea el import**, y si ese primero falla (ilegible, por ejemplo) no hay import todavía y es el siguiente aceptado el que lo crea. A partir de ahí, los siguientes van con `POST /imports/{id}/files`. Cada respuesta actualiza el detalle (D3); cada rechazo del API se coloca junto a su archivo con el texto de su `code` (`duplicate_file` con `details.fileName`).
- **Dónde vive la cola: un almacén por pestaña fuera de los componentes de pantalla.** `upload-queue.ts` es un almacén pequeño (estado + suscripción, leído con `useSyncExternalStore`) con una cola por cuenta; `UploadQueueProvider` lo instancia en `App`, por encima del router, así que ninguna navegación lo desmonta. Cuando el primer archivo crea el import, la cola se reasocia a ese `importId` y la aplicación navega a `/imports/$id?step=files` con `replace` **sin esperar al resto**; `FilesStep` lee del almacén los archivos pendientes, en curso y rechazados de su import y los pinta junto a los del detalle. Si el usuario se va a otra pantalla a mitad, las subidas siguen; al volver al import ve el resultado de cada archivo. Al cerrar sesión o expirar (el mismo punto donde `App` hace `queryClient.clear()`), la cola se vacía y aborta las peticiones en curso con un `AbortController`.
- **Por qué esto y no navegar al terminar la cola**: con 10 archivos el usuario se quedaría varios segundos en New Reconciliation sin ver hojas ni filas, y una navegación del usuario a mitad (menú, Atrás) desmontaría la página que tiene la cola y perdería los archivos pendientes. **Por qué no pasar los pendientes a `ImportPage` por el estado de la navegación**: `ImportPage` también se desmonta si el usuario sale, y el estado de la navegación no sobrevive a una recarga ni se comparte con quien abra el import por su enlace; el almacén resuelve ambos casos con una sola pieza.
- **Por qué uno a uno y no todos en un multipart**: el API rechaza la petición entera si una parte falla; con una sola petición, un archivo ilegible impediría subir los demás y dos copias en la misma selección darían `duplicate_file` con `fileId = null` y sin nombre del coincidente. Uno a uno, cada archivo tiene su resultado y el duplicado siempre nombra al archivo ya incluido (escenario de la spec). Coste: hasta 10 peticiones, cada una devolviendo el detalle completo (decenas de ms con archivos reales). Alternativa descartada: una petición con todos (atómica, una sola respuesta), que sería la elección si el negocio exigiera "todo o nada" por selección.
- El límite de 10 se aplica por selección porque el API lo aplica por petición y no tiene límite por import (hueco anotado en el proposal).
- Mientras la cola trabaja, la zona de subida se deshabilita (escenario "Subida en curso"); los archivos pendientes muestran `Uploading…` y la lista anuncia los cambios en una región `aria-live="polite"`.
- Tests (D12): una selección de 10 archivos con la navegación a `/imports/$id` tras el primero, y otra en la que el usuario va a Dashboard a mitad: en ambos, MSW recibe las 10 subidas y el import muestra los 10; un primer archivo ilegible seguido de uno válido: el primero queda rechazado, el segundo crea el import (un solo `POST /accounts/{id}/imports` con `201`) y no hay `POST /imports/{id}/files` previo.
- **Multipart con `openapi-fetch`**: el contrato no declara `body` (limitación documentada en D9 de `import-upload-mapping`), así que se pasa un `FormData` con `bodySerializer` identidad y sin `Content-Type` (lo pone el navegador con el boundary). La primera tarea del grupo 2 verifica con MSW que la petición llega como `multipart/form-data` con sus partes `files`, también cuando `authFetch` la repite tras un `401` (repite con `request.clone()`).

### D5 Formulario de pareo
- React Hook Form con valores `{ sheets: Record<sheetId, SheetForm> }`, `SheetForm = { kind: SheetKind | null, cycle: Cycle | null, statusId: number | null, columns: Record<sourceColumn, TargetField | null> }`. Valor inicial por hoja: `mapping` si `mappingConfirmed`, si no la propuesta (`proposed` y `columns[].targetField`).
- Esquema Zod del formulario construido sobre `SheetMappingInput` de `@recon/shared` con un `superRefine` que replica en el cliente las reglas de forma del `PUT` (spec "Forma del pareo confirmado"): `transactions` exige `cycle`; ciclo `R` sin `statusId`; `batch_fees`/`ignore` sin `cycle` ni `statusId`; `targetField` sin repetir por hoja; tipo elegido. `toMappingConfirmation(values, detail)` produce el cuerpo: todas las hojas, solo columnas con campo, ninguna en `ignore`.
- **Fusión con el detalle**: el formulario usa la prop `values` de RHF con `resetOptions: { keepDirtyValues: true }`; cuando el detalle cambia (archivo añadido o quitado), las hojas nuevas toman su pareo efectivo, las quitadas desaparecen y las que el usuario tocó conservan lo editado. Tras un `PUT` correcto se hace `reset` con el pareo confirmado (sin cambios pendientes). "Cambios sin confirmar" = `formState.isDirty`.
- **Controles por hoja** (aprobados): tipo (`Transactions`, `Batch fees`, `Ignore`), ciclo (`E · transaction`, `I · adjustment`, `R · reserve`) y estado fijo (`From column` = `null`, o uno de los seis estados de D6); reglas de habilitado de la spec. Alternativa descartada por ahora: un único selector con preajustes APP/DEC/CHB/REF/RR/Summary/Ignore como dice el Ticket 3; esconde que el ciclo y el estado son independientes (una hoja `CB` legacy es `I` sin estado) y no cubre hojas sin propuesta. Si hacen falta preajustes lo dirá la primera sesión con revisores (Open Questions).
- **Cabecera de cada `SheetCard`**: el nombre de la hoja destacado (título de la sección) y, al lado, la propuesta en lenguaje del analista, construida desde `proposed` (no desde el formulario, para que siga visible mientras se edita): `Proposed: <ciclo> · <estado>` para `transactions` (`<estado>` es `statusName`, `status from column` si no hay estado fijo, o `reserve, no status` en ciclo `R`), `Proposed: batch fees` o `Proposed: ignore` (con su `note`), seguido de ` — account rule` o ` — global rule`; sin propuesta, `No proposal`. Ejemplo: `CHB` · `Proposed: I · Chargeback — global rule`. Debajo, filas, `hidden` y los tres controles con el pareo en edición.
- **Campos por tipo** (`field-options.ts`): `transactions` → `transactionId`, `status`, `amount`, `currency`, `txnDate`, `providerRef`, `orderId`, `reference`; `batch_fees` → `feeType`, `amount`, `currency`; siempre con `Keep as reference` (`null`). `gateway` nunca se ofrece. Al cambiar el tipo, las columnas con un campo no admitido en el nuevo tipo pasan a `null`.
- Selectores shadcn `select` (Radix: teclado y etiquetas accesibles).

### D6 Catálogo de estados como constante de `@recon/shared`
- `packages/shared/src/vocabulary.ts` exporta, junto a `TransactionStatusCode`, `TRANSACTION_STATUSES`: los seis estados `{ statusId, code, name, cycle }` (1 Pending · E, 2 Successful · E, 3 Declined · E, 4 Chargeback · I, 5 Refund · I, 6 RDR · I) con `code` tipado como `TransactionStatusCode` y `cycle` como `Cycle`. En el frontend sirve solo para las opciones del selector de estado fijo; lo que se muestra de la propuesta y del pareo confirmado usa el `statusName` del API.
- **Contraste con la fuente real**: `backend/test/integration/transaction-statuses.int.test.ts` lee `TransactionStatus` de la base sembrada (`statusId`, `code`, `name`, `cycle`, ordenado por `statusId`) y exige igualdad exacta con la constante compartida. Un test contra las fixtures de MSW no basta, porque las fixtures salen de la misma constante. Corre en el job `integration` existente; en local, con la base que levanta la persona. Un test unitario en `vocabulary.test.ts` asegura además que los `code` son exactamente las opciones de `TransactionStatusCode`.
- El seed sigue con su propia lista en `synthetic.ts` (sin tocar código del backend); el test de integración detecta cualquier divergencia entre ambas. Unificarlas (que el seed importe la constante) es una mejora posible del change que añada `GET /transaction-statuses`.
- Alternativa: endpoint `GET /transaction-statuses`, que es lo correcto a medio plazo pero cambia el backend (fuera de alcance; anotado en el proposal).

### D7 Readiness y Analyze
- `ReadinessBar` pinta `readiness` del detalle (servidor): `Ready to analyze` o la lista `missing` como `<sheetName ?? 'Import'> · <field>: <message>`, y las `notes` en gris. No hay readiness calculada en el cliente: el usuario confirma y el API responde con la nueva (criterio 3 del Ticket 3: "al corregir y guardar, se habilita").
- **Hojas sin confirmar (decisión del apply, 2026-10-17).** El `readiness` del detalle real no trae elementos `confirmation`: solo el `422 mapping_incomplete` de analyze los nombra. Con el import en `mapped`, la barra añade `<hoja> · confirmation` por cada hoja con `mappingConfirmed = false` (un dato del servidor, no una readiness propia), y Analyze exige además que no haya ninguna. Hueco del API anotado en el proposal.
- **Analyze** habilitado solo si `status === 'mapped' && readiness.canAnalyze && todas las hojas confirmadas && !isDirty`; si no, una línea bajo el botón con el primer motivo: sin confirmar o con cambios → `Confirm the mapping before analyzing.`; con `missing` → `Resolve the missing fields first.`. Sin permiso, el botón no se pinta.

### D8 Análisis largo
- `useAnalyze` (mutación) con guarda síncrona (`useRef`) además de `isPending`, para que dos clics en el mismo tick no lancen dos `POST`. Durante la espera: botón con indicador, región `aria-live` con `Analyzing… this can take up to a minute.`, y deshabilitados Confirm, Remove, la zona de subida y Cancel import. Sin límite de tiempo en el cliente.
- Resultado: `200` → `setQueryData` y `step=analysis`. `422 mapping_incomplete` → se escribe `details.missing` en la barra hasta el siguiente `GET`. `422 import_too_large` → mensaje con `rows` y `limit`. `409` o error de red/`5xx` → `refetch` del detalle: si está `analyzed`, paso Analysis sin error (el servidor terminó aunque la conexión se cortara); si sigue `mapped`, `The analysis did not finish. Try again.`
- Por qué releer: un proxy con tiempo de espera menor que el análisis (Nginx por defecto 60 s, despliegue fuera de este change) cortaría la respuesta mientras el servidor termina y persiste.

### D9 Paso Analysis
- `Counters`: tarjetas `Rows read`, `Matched`, `Unmatched`, `Ambiguous`, `Ignored`, `By cycle`; `Unmatched`/`Ambiguous` > 0 con borde ámbar y enlace que aplica el filtro de la tabla.
- `ChannelNotice`: filtra `assignment !== 'assigned'`; formas ocultas según la spec. Ámbar (convención del prototipo).
- `Warnings`: etiquetas por `WarningCode` en `strings.ts`; solo conteos > 0.
- `RowsTable`: TanStack Table (`@tanstack/react-table`) en modo `manualPagination` con `pageCount = ceil(total / 50)`; filtro `All | Unmatched | Ambiguous | Matched | Ignored` y página en la búsqueda de la ruta (`match`, `page`), de modo que recargar conserva la vista. Columnas: archivo · hoja, fila, ID (`transactionIdRaw`, fuente monoespaciada, texto tal cual), ciclo, resultado y motivo (`RowReason` con etiqueta), estado (`statusName ?? statusRaw`), importe (`formatDecimal`) y moneda, canal (`transaction.channelName`), advertencias. Ambiguas: lista de `gatewayName` de las candidatas (y `another merchant` si `outOfScope`). `batchFees` no se muestra (Settlement Review, #13).
- T3 (#10) añadirá debajo el bloque de validaciones y la decisión Continue / Cancel and reprocess.

### D10 Permisos y estados en pantalla
`permissions.ts`: `useCanProcess()` lee `me.permissions` de `meQuery`; `editable = canProcess && status ∈ {uploaded, mapped}`; `cancellable = canProcess && status ∈ {uploaded, mapped, analyzed, validated}`. Sin permiso o sin `editable`, los controles se pintan deshabilitados (Mapping) o no se pintan (zona de subida, Remove, Confirm, Analyze, Cancel). Es presentación: el API responde `403` por su cuenta.

### D11 Smoke E2E local con Playwright y playwright-bdd
- **Por qué playwright-bdd y no un test de Playwright sin Gherkin**: README §2.6 ("End-to-end (Playwright)") compromete "Escenarios en Gherkin para el flujo feliz, para "cancelar y reprocesar" y para `provider_mismatch`", y `CLAUDE.md` (Stack y estructura) fija `e2e/` como "Playwright + playwright-bdd". El smoke es el primer escenario de esa suite; escribirlo sin Gherkin obligaría a reescribirlo en la Entrega 3.
- Workspace `@recon/e2e`: `@playwright/test`, `playwright-bdd`, Chromium. `features/import-smoke.feature` (Gherkin en inglés, como el resto del código) y `steps/*.ts`; `playwright.config.ts` con `defineBddConfig`, `baseURL` `http://localhost:5173`, credenciales con `process.loadEnvFile` del `.env` raíz (`SEED_PASSWORD`), nunca versionadas. Selectores por rol y texto accesible (los mismos textos de `strings.ts`).
- **Solo local en este change.** Sin `webServer`: como la colección Bruno, exige `pnpm db:up`, `pnpm db:seed` y `pnpm dev` levantados; un `globalSetup` comprueba que `http://localhost:5173` y `/api/v1/health` responden y, si no, falla con un mensaje que nombra esos tres comandos. Script raíz `pnpm test:e2e`; instrucciones en README §2.6; el resultado de la ejecución se anota en la PR. Sin job de CI: va al issue de la Entrega 3 (README §2.6, "En pipeline (Entrega 3)").
- Cada ejecución crea un import nuevo de `batch-clean` (el API admite el mismo archivo en otro import) y lo cancela al final como limpieza (aprobado), para no acumular imports abiertos en la base local.

### D12 Tests de componentes
- MSW: `test/msw/imports.ts` añade al API falso un almacén de imports con la máquina de estados de la spec (`uploaded → mapped → analyzed → cancelled`), los códigos de error y el alcance (`viewer` → `404` en Provider C, `403` en escrituras). Los archivos de los tests son `File` cuyo contenido es una etiqueta de muestra (`batch-clean`, `batch-split_part1`…); el falso calcula la "huella" del contenido para detectar duplicados aunque cambie el nombre.
- `test/msw/import-fixtures.ts`: constructores de `ImportDetail` tipados con los tipos generados para `batch-clean`, `batch-split` (dos archivos), `batch-issues`, `batch-blocked`, `legacy-provider` y un libro con hoja `Bonus`; contadores, `byCycle`, canales y fees tomados de `expected.json` y de la spec; un generador de `ImportRowItem` que respeta el orden del API (unmatched, ambiguous, matched, ignored) para paginar 783 y 770 filas.
- Drag and drop: `user.upload` sobre el `input` para casi todo; un test de `drop` con `fireEvent.drop` y un `dataTransfer` con `files`.
- Como en `web-shell`, cada pieza crítica se rompe una vez a propósito (guarda de doble envío, fusión `keepDirtyValues`, filtro de canales `assigned`, comprobación de tamaño) para ver fallar su test.

### D13 Textos, accesibilidad y anchura
- `features/imports/strings.ts` con todos los textos (incluidas las etiquetas de campos, motivos y advertencias); los de la spec, literales.
- Zona de subida: un `button` que abre el `input type=file multiple accept=".xlsx"` y acepta `drop`; foco visible. Diálogo de cancelar con `alert-dialog` (foco atrapado, Escape cierra sin cancelar).
- 1280 px y 1024 px sin desplazamiento horizontal de la página: la vista previa y la tabla de filas desplazan dentro de su tarjeta.

## Risks / Trade-offs

- [El análisis supera el tiempo de espera de un proxy y la respuesta se pierde] → Releer el import tras un fallo (D8); el estado del servidor manda.
- [Un `GET /imports/{id}` relee los archivos; refrescos frecuentes cargan el servidor] → `setQueryData` con la respuesta de cada mutación, `staleTime` y sin refresco al enfocar (D3).
- [La constante de estados se desalinea del catálogo] → Test de integración contra la tabla `TransactionStatus` sembrada, en el job `integration` (D6); seguimiento para el endpoint.
- [La cola de subida sigue enviando tras salir de la pantalla o cerrar sesión] → Vive por encima del router a propósito (D4); se vacía y aborta al cerrar sesión o expirar.
- [El smoke E2E no corre en CI y puede romperse sin que se vea] → Se ejecuta antes de cada PR que toque importación y el resultado va en la PR; el job llega en la Entrega 3.
- [El API falso de MSW se aleja del real] → Tipado con los tipos generados del contrato (`openapi:check` en CI) y smoke E2E contra el backend real.
- [Subir uno a uno multiplica peticiones] → Máximo 10 por selección y respuestas de decenas de ms (D4).
- [`keepDirtyValues` conserva un valor de una columna que ya no existe tras reemplazar un archivo] → Las claves son `sheetId` y `sourceColumn`; una hoja nueva tiene `sheetId` nuevo, así que no hereda nada. Cubierto por test.
- [El smoke deja datos en la base local] → Cancela su import al final (D11); `pnpm db:seed` lo recrea todo.

## Migration Plan

Sin migraciones ni cambios de API. Despliegue: el de la SPA (fuera de este change). Rollback: revertir el PR; el backend no depende del frontend.

## Open Questions

- Textos finales de botones y mensajes no fijados por la spec: se ajustan en la revisión visual sin cambiar specs.
- **Preajustes de hoja** (APP, DEC, CHB, REF, RR, Summary, Ignore) además de los tres controles: lo decide la primera sesión con revisores. Si hacen falta, se añaden como un atajo que rellena tipo, ciclo y estado, sin cambiar el contrato ni la spec de los controles.
- Si el negocio quiere un límite de archivos por import (no solo por selección), es un change de backend; queda en los huecos del proposal junto con el catálogo de estados y el motivo de cancelación (los issues los abre la persona).
