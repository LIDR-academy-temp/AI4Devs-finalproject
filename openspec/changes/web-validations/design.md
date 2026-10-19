# Design — web-validations

## Context

- **Espacio del import** (`web-import`, archivado): una sola ruta `/imports/$importId?step=files|mapping|analysis&match=&page=` (D2), `ImportPage` con `StepTabs` y `AnalysisStep`, que hoy pinta `Counters`, `ChannelNotice`, `Warnings` y `RowsTable`. Su comentario ya reserva el sitio de las validaciones de #10. `ImportHeader` lleva el estado y `CancelImportDialog` (sin motivo, por el hueco del API). `permissions.ts` (`useCanProcess`, `useImportAccess`) decide lo que se ofrece por permiso y estado, y es solo presentación. Las mutaciones escriben el `ImportDetail` devuelto con `setQueryData` (D3) y `useAnalyze` usa una guarda síncrona con `useRef` (D8).
- **Cliente**: `openapi-fetch` tipado con `paths` de `schema.gen.ts`, `unwrap` → `ApiError { status, code, details }`, `authFetch` con renovación transparente (`web-shell` D7). **Las siete rutas de #9 no están en `docs/openapi.yaml` de esta rama**, así que `api.GET('/api/v1/imports/{importId}/validations')` no compila hoy.
- **Contrato**: "Contrato para #10" en `validation-runs/design.md` (rama `feat/validation-runs`), con tipos, rutas, errores, mensajes y ejemplos para MSW. #9 solo tiene proposal y design: no hay código del backend ni esquemas Zod de respuesta en `packages/shared` (hoy `validation.ts` solo trae los enums del motor: `ValidationOutcome`, `IssueType`, `IssueScope`, `OccurrenceSource`, `MissingType`, `MissingRange`; `ValidationCode` está en `vocabulary.ts`).
- **MSW**: `test/msw/handlers.ts` compone el falso de catálogo y auth y `createImportHandlers` (`test/msw/imports.ts`). Este tiene un almacén de imports con máquina de estados, `seedImport(sample, { status })`, `importRecord`, `holdNext` y `failNext`, y registra cada petición (`importRequests`). `renderApp(path, { as })` monta la app con el usuario indicado.
- **shadcn** instalado: `alert`, `alert-dialog`, `badge`, `button`, `card`, `input`, `label`, `select`, `skeleton`, `table`, `tabs`, `tooltip`. No hay `sheet`, `switch` ni `textarea`. `lib/format.ts` solo tiene `formatDecimal`.
- La base local la comparte #9 mientras está en curso, así que este change no ejecuta integración ni E2E hasta su último grupo.
- **Fechas** (convención decidida en la revisión, proposal "Convención de fechas"): todas las columnas son `DATETIME2` sin zona (`backend/prisma/schema.prisma`) y el API las serializa con `Z` (`toISOString()`). Las de auditoría salen de `new Date()` en el servidor y son instantes UTC. Las de negocio son la hora de pared de Nueva York del gateway principal, aunque lleven `Z`.
- **Smoke E2E** de `web-import` (`e2e/`, Playwright + playwright-bdd): entra como `analyst` con `SEED_PASSWORD` del `.env` raíz (`process.loadEnvFile`), vacía el campo de contraseña tras el login y no guarda trace ni vídeo.

## Goals / Non-Goals

**Goals:**
- Que el rebase sobre #9 toque solo dos ficheros de contrato (tipos y llamadas, y API falso) y los tests no cambien.
- Ninguna regla de negocio en el cliente: qué se puede editar, incluir o resolver lo dicen `editable`, `includable` y `resolvable`; el estado global y el bloqueo, `run.blocked` y `outcome`. El cliente solo decide qué ofrecer por permiso y estado del import, como ya hace `web-import`.
- Que el analista nunca pierda trabajo sin saberlo: confirmación antes de re-ejecutar con cambios manuales o con revisión, y antes de cambiar una inclusión sobre un import revisado.

**Non-Goals:**
- Actualizaciones optimistas (D7).
- Tiempo real entre pestañas o usuarios: lo que cambie otra persona se ve al releer o como `409` (D3).
- Resumen previo por ciclo (#13).

## Decisions

### D1. El bloque de validaciones va dentro del paso Analysis, entre las advertencias y la tabla de filas
`AnalysisStep` monta `<ValidationsSection>` (de `features/validations/`) después de `Warnings` y antes de `RowsTable`. Así quedan, de arriba abajo, contadores, aviso de canales, advertencias del análisis, corrida y validaciones con su decisión de conjunto, y por último las filas.
- **Por qué no debajo de la tabla**, como decía el comentario de `web-import` D9: la tabla pinta 50 filas por página, y Continue y el aviso de bloqueo quedarían a varias pantallas de distancia. El "primero las filas no asociadas" del README §1.3 lo cubren los contadores (`Unmatched` y `Ambiguous` en ámbar, con enlace al filtro de la tabla), que siguen arriba.
- *Alternativa descartada*: un cuarto paso `validations` en `StepTabs`. README §1.3 las trata como una sola pantalla (**Analysis & Validations**), el paso no corresponde a ningún estado del import (`defaultStep` tendría que inventar uno) y separaría la decisión de las filas que la justifican.
- `features/validations/` es carpeta propia, como el módulo `validation` del backend, y `imports` solo la monta. Ningún componente de `validations` importa de `imports` salvo `permissions.ts`, `CancelImportDialog` y las claves de consulta del import.

### D2. Contrato aislado en dos ficheros hasta el rebase sobre #9
- **`features/validations/contract.ts`**: los tipos de "Contrato para #10" copiados tal cual (`ValidationRunView`, `ValidationResultView`, `ValidationIssueSummary`, `ValidationIssueDetail`, `OccurrenceView`, `IssueHistoryEntry`, `RowLocation`, `StatusRef`, `UserRef`, cuerpos y `details` de error), y las siete llamadas (`getValidationRun`, `runValidations`, `listValidationIssues`, `getValidationIssue`, `resolveIssue`, `setOccurrenceInclusion`, `reviewImport`). Las llamadas usan un `fetch` de `createAuthFetch(session)` con `apiOrigin()` y lanzan el mismo `ApiError`. Es **el único fichero** que conoce rutas y formas. El resto del código importa de él, y su cabecera lo marca como temporal hasta #9. Cada campo de fecha lleva un tipo marca, `BusinessDate` o `AuditInstant` (D11), que es el único que aceptan los formateadores. Así ningún componente puede pasar una fecha de negocio al formateador de auditoría ni al revés: no compila. Los enums se reutilizan de `@recon/shared` (`ValidationCode`, `ValidationOutcome`, `IssueType`, `IssueScope`, `OccurrenceSource`, `MissingRange`, `Cycle`, `ImportStatus`, `BatchStatus`, `TransactionStatusCode`).
- **`test/msw/validations.ts`**: el API falso de las siete rutas, con su almacén, sus fixtures y sus ayudas de test (`seedValidationRun`, `validationRequests`, `holdNextValidation`, `failNextValidation`), tipado con `contract.ts`. `handlers.ts` solo lo registra.
- **En el rebase** (último grupo de tareas): `contract.ts` pasa a alias de `ApiResponse<…>` y a llamadas `api.GET/POST/PATCH` con los tipos generados, sin cambiar los nombres que exporta, y el falso se tipa con los tipos generados. Si #9 publica esquemas Zod de respuesta en `@recon/shared`, un test del falso hace `safeParse` de cada fixture para detectar desvíos. Los tests de componentes no cambian.
- *Alternativa descartada 1*: añadir a mano las rutas a `docs/openapi.yaml` y regenerar el cliente. El fichero lo genera `openapi:export` desde el backend y CI (`openapi:check`) fallaría, y además chocaría con el mismo fichero de #9 al fusionar.
- *Alternativa descartada 2*: llamar a `api` con rutas forzadas por `as`. Esparce casts por cada consulta y mutación, y el rebase tendría que encontrarlos uno a uno.
- *Alternativa descartada 3*: validar las respuestas con esquemas Zod propios del frontend. Duplicaría los que #9 pone en `@recon/shared` y se quedarían huérfanos en el rebase.

### D3. Estado de servidor
- Claves:
  - `validationRunKey(importId) = ['imports', importId, 'validations']`;
  - `validationIssuesKey(importId, { validationCode, page }) = ['imports', importId, 'validations', 'issues', { validationCode, page }]`;
  - `validationIssueKey(issueId) = ['validation-issues', issueId]`.
  
  Colgar las dos primeras del import permite invalidarlas juntas sin tocar el detalle (`exact` en `importKey`) ni las filas.
- La corrida usa `staleTime: 30 s` y no se relee al enfocar, igual que el detalle del import. La lista usa `placeholderData: keepPreviousData`, como `RowsTable`. El detalle del hallazgo se pide al abrir el drawer.
- **Respuestas de las escrituras**:
  - `POST validations` y `POST review` devuelven `ValidationRunView`. Se escribe con `setQueryData(validationRunKey)` y se invalidan las listas y los hallazgos abiertos (`['validation-issues']`), porque la corrida pudo cambiar.
  - Los dos `PATCH` devuelven `ValidationIssueDetail`. Se escribe con `setQueryData(validationIssueKey)` y se invalidan la corrida (por `manualChangeCount`, `importStatus` y `lastInvalidatedReview`) y las listas (por `includedCount` y `resolutionStatus`).
- **Estado del import**: si la respuesta trae un `importStatus` distinto del `status` del detalle en caché (`validated` ↔ `analyzed`), se invalida `importKey(importId)` con `exact` (un `GET` del detalle) para que cabecera, Cancel y permisos se pongan al día. *Descartado*: parchear `status` en la caché a mano, porque copia estado del servidor (`updatedAt`) y puede divergir. *Descartado también*: invalidar siempre, porque cada `GET` del detalle relee los `.xlsx` (`web-import` D3) y en la mayoría de las respuestas el estado no cambia.
- **`409` de estado** (`import_changed`, `import_not_analyzed`, `import_not_editable`, `validation_run_superseded`, `validation_run_required`, `blocking_validation_issue`, `issue_already_resolved`, `occurrence_not_includable`): mensaje de `strings.ts` (con `details` cuando el texto lo usa) y relectura de lo que afecta: corrida, listas, el hallazgo abierto y, si cambia el estado, el detalle del import. Otro error o un fallo de red: mensaje genérico con **Retry**, sin relectura.

### D4. Ejecutar la corrida
- `useRunValidations(importId)`: mutación con una guarda síncrona (`useRef`) además de `isPending`, como `useAnalyze`, para que dos clics en el mismo tick no lancen dos `POST`. Mientras corre, Run y Continue están deshabilitados y una región `aria-live="polite"` dice `Running the validations…`. #9 mide menos de 2 s en local, así que basta un estado indeterminado.
- **Confirmación previa** (`alert-dialog`) solo si `run.manualChangeCount > 0` o `importStatus === 'validated'`. El texto se compone con las dos frases de la spec, la que aplique o ambas. Sin ninguna de las dos condiciones, el `POST` sale directo, porque un diálogo en cada corrida enseñaría a confirmar sin leer.
- `409 import_changed` → mensaje, se invalida la corrida y el detalle del import y Run vuelve a habilitarse. El usuario decide si repite: no se reintenta solo, porque el cambio pudo ser una revisión de otra persona (#9 D4). `409 import_not_analyzed` → mensaje con `details.status` y relectura del import, que con el estado nuevo deja de ofrecer Run.
- *Alternativa descartada*: ejecutar las validaciones automáticamente al terminar el análisis. README §1.3 dice que "el sistema nunca avanza solo", y con P6 de #9 una corrida automática borraría cambios manuales sin aviso.

### D5. Tabla de validaciones y lista de hallazgos
- **Tabla de validaciones**: `table` de shadcn sin TanStack, porque son ocho filas fijas sin paginación ni orden. Se pinta en el orden de `results`, sin reordenar en el cliente. Cada fila con `issueCount > 0` es un botón (`aria-pressed` si está elegida) que pone `validation=<code>` en la búsqueda. Las etiquetas de `validationCode`, `outcome` y de las claves de `breakdown` viven en `strings.ts`, y el desglose omite las claves con 0 (`APP 3 · R 3`).
- **Estado global**: `run.blocked` → `Blocked`; si no, `Warning` en algún resultado → `Warnings`; si no, `Passed`. Es una agregación para presentar, no una regla: el bloqueo lo da el API.
- **Lista**: TanStack Table en `manualPagination` con `pageCount = ceil(total / 50)`, como `RowsTable`. Filtra por `validationCode` y no por `type` o `scope`, porque la tabla de validaciones es la entrada y #9 ya ofrece ese filtro. Columnas: ID (`transactionIdRaw ?? transactionId`, monoespaciada, texto tal cual), ciclo, tipo · alcance, estado reportado → estado del gateway, rango (faltantes), `includedCount / occurrenceCount` (con `includedByDefaultCount` en el `title`) y resolución. Cada fila es un botón que pone `issue=<issueId>`.
- **Búsqueda de la ruta**: `validateImportSearch` (en `imports/validate-search.ts`) añade `validation?: ValidationCode`, `ipage?: number` e `issue?: number`. Los valores inválidos se descartan, igual que `match` y `page`. Cambiar de validación quita `ipage` e `issue`. Se usa `ipage` y no `page` porque `page` ya es de la tabla de filas.
- *Alternativa descartada*: una sola tabla con todos los hallazgos y filtros por columna. Mezcla faltantes (sin apariciones) con duplicados (con apariciones) y pierde la lectura "por validación" de HU2 y del issue.

### D6. Drawer del hallazgo
- Instalar `sheet` es la primera tarea del grupo del drawer (grupo 4), y `switch` y `textarea` la primera del grupo de acciones (grupo 5). Ningún componente se añade antes de que lo use un test en rojo.
- `sheet` de shadcn (Radix Dialog, lado derecho, `max-w-2xl`): foco atrapado, Escape cierra y el foco vuelve al botón de la fila. Abierto según `issue` de la búsqueda, así que recargar o compartir el enlace lo reabre. Si `GET validation-issues/{id}` responde `404`, se cierra y quita `issue`.
- Contenido, de arriba abajo: cabecera (validación, tipo, ID, ciclo, estado reportado frente al del gateway, rango y `relevantDate` en faltantes, `source` en los hallazgos de una fila); apariciones; resolución; historial.
- **Apariciones**, en el orden del API (las del import primero). Ubicación `fileName · sheetName · row N`, o `Batch #batchNo · attempt attemptNo · accountName` con un `Badge` del estado del batch. Estado (`Unresolved status` si `status` es nulo, `CHB 2` si `excludeAmount`), `Included by default` / `Excluded by default`, el control o el texto de inclusión (D7) y `Changed by <user> · <fecha>`.
- **Historial**: lista ordenada tal como llega (la más antigua primero). `set_inclusion` → `<user> · <fecha> · <location> · excluded → included`, con la ubicación resuelta por `occurrenceId` sobre las apariciones. `resolve` → `<user> · <fecha> · resolved: "<note>"`.
- `run.isCurrent = false` (enlace viejo a un hallazgo de una corrida superada) → aviso `This finding belongs to a superseded run.` y sin controles, que el API ya entrega con `editable` y `resolvable` en `false`.
- *Alternativa descartada 1*: expandir la fila en la propia lista. Apariciones e historial no caben en una fila de tabla sin romper columnas, y README §1.3 habla de "abrir a un detalle".
- *Alternativa descartada 2*: una ruta propia `/validation-issues/$issueId`. Saca al analista de la lista y de la decisión, y el contexto del import (permisos, estado, Cancel) habría que reconstruirlo. Con `issue` en la búsqueda se gana lo mismo (enlace y recarga) sin otra pantalla.

### D7. Acciones del drawer
- **Inclusión**: `switch` de shadcn con nombre accesible `Included in settlement — <ubicación>`.
  - Con `editable && includable`, se puede activar y desactivar.
  - Con `editable && !includable`, se puede desactivar si está activo. Desactivado y sin poder activarse, queda deshabilitado con el texto genérico del motivo, enlazado por `aria-describedby`.
  - Con `!editable`, se muestra `Included` / `Excluded` como texto.

  Mientras el `PATCH` está en curso, todos los interruptores del hallazgo están deshabilitados, porque la regla de R depende del resto de apariciones.
- **Sobre un import `validated`**: antes del `PATCH`, `alert-dialog` con `Changing an inclusion invalidates the review: the import returns to analyzed.` Desistir deja el interruptor como estaba.
- **Sin actualización optimista**: el interruptor muestra el valor del servidor y un indicador mientras espera. *Descartado*: optimista con vuelta atrás. La regla de R y los `409` de estado hacen frecuente el retroceso, y una aparición que parpadea entre incluida y excluida confunde más que esperar un `PATCH` de decenas de ms.
- **Resolver**: formulario con React Hook Form y `zodResolver`, campo `textarea` `Note` y esquema `z.string().trim().min(1, …).max(500, …)`, el mismo límite que el cuerpo estricto de #9. Se envía la nota ya recortada. Solo se pinta con `resolvable`. Tras `200`, el formulario se sustituye por `Resolved by <user> · <fecha>` y la nota. `409 issue_already_resolved` usa `details.resolvedBy` y `details.resolvedAt` en el mensaje.
- *Alternativa descartada* para resolver: un `alert-dialog` con la nota. La nota es parte del registro del hallazgo, y tenerla en el propio panel, junto a los estados reportado y del gateway, es lo que el analista mira para escribirla.

### D8. Aviso de revisión invalidada
- Se muestra si `lastInvalidatedReview !== null` y (`run?.review == null` o `run.review.reviewedAt < lastInvalidatedReview.invalidatedAt`), que es la comparación que #9 D16 deja a #10. Texto según `reason`: `rerun` → `the validations ran again (run #newRunId)`; `inclusion_change` → `an inclusion was changed`. Va en un `alert` ámbar sobre la cabecera de la corrida.
- *Alternativa descartada*: mostrarlo solo en la sesión en que ocurrió (estado local tras la mutación). Lo perdería otra persona que abra el import, o el mismo analista al recargar, y el criterio 4 pide que la pantalla lo indique, no la mutación.

### D9. Decisión de conjunto y acceso a Settlement Review
- **Continue to settlement review** (`useReview`, también con guarda síncrona) envía `{ runId: run.runId }` de la corrida **pintada**, no una releída, para que lo aprobado sea lo que el analista vio (#9 D7). Se ofrece con `canProcess && importStatus === 'analyzed'`. Está deshabilitado sin `run`, con `run.blocked` o mientras corre una corrida. El motivo va en un párrafo enlazado por `aria-describedby`:
  - bloqueado → `provider_mismatch: cancel the import and process it under the correct provider.`, con enlace a los hallazgos de `provider_mismatch` (pone `validation=provider_mismatch`);
  - sin corrida → `Run the validations before continuing.`
  
  Con `blocking_validation_issue` desde el API (otra persona re-ejecutó), se relee y el botón queda deshabilitado con ese mismo texto.
- **Cancel and reprocess**: `CancelImportDialog` admite una etiqueta de botón (`label`). La barra de decisión lo usa con `Cancel and reprocess` y la cabecera sigue con `Cancel import`. Sin motivo: decidido en la revisión, y el motivo va en #47 (Entrega 3). *Descartado*: dejar solo el de la cabecera, porque con `provider_mismatch` la pantalla dice "cancela" y la acción quedaría lejos del aviso.
- **Ya `validated`**: en lugar de Continue, `Reviewed by <user> · <fecha>` (de `run.review`) y **Settlement Review**. La ruta vive en una constante de `features/validations/next-step.ts`, `SETTLEMENT_REVIEW: { to: … } | null = null`. Con `null` se pinta un `Button` deshabilitado con `Settlement Review is not available yet.`, igual que el menú pinta las pantallas sin `to` (`nav-config.ts`). #13 solo cambia esa constante por su ruta tipada. Un test fija que, con `null`, no hay ningún `<a>` hacia Settlement Review.
  - *Descartado 1*: enlazar ya a `/imports/$importId/settlement`, que hoy acaba en `NotFoundPage`.
  - *Descartado 2*: ocultarlo hasta #13. El criterio 3 pide que "la navegación ofrezca Settlement Review", y sin nada el analista no sabe que terminó su parte.
  - *Descartado 3*: una ruta provisional con una página "coming soon". Añade una ruta y unas migas que #13 reescribiría, para decir lo mismo que el botón deshabilitado con un clic más.

### D10. Permisos y solo lectura
- Run: `canProcess && importStatus ∈ {analyzed, validated}`. Continue: `canProcess && importStatus === 'analyzed'`. Cancel and reprocess: `cancellable` de `useImportAccess`. Es el mismo criterio de presentación de `web-import` D10, y el API responde `403`/`409` por su cuenta. Con `importStatus` se usa el de `ValidationRunView`, que llega con la corrida. El detalle del import se pone al día por D3.
- Drawer: solo `editable`, `includable` y `resolvable`, que ya incluyen el permiso del usuario (#9 D9). El cliente no comprueba `sourceType`, el ciclo ni el estado del import.
- `viewer` entra por enlace directo (la ruta no tiene `requires`) y ve todo sin botones de acción.

### D11. Fechas en hora de Nueva York (`ET`), con dos formateadores según el tipo de fecha
- **Tipos marca** en `lib/format.ts`, junto a los formateadores que los exigen, y reexportados por `contract.ts`: `type BusinessDate = string & { readonly __kind: 'business' }` y `type AuditInstant = string & { readonly __kind: 'audit' }`. Tras el rebase, `contract.ts` los aplica sobre los tipos generados por nombre de campo, a cualquier profundidad.
  - `BusinessDate`: `ranges.*.min/max`, `relevantDate` y, si llegan, `transactionDate`, `txnDate`, `eventDate` y las fechas de batch.
  - `AuditInstant`: `runAt`, `reviewedAt`, `invalidatedAt`, `changedAt`, `resolvedAt`, `at` del historial y `details.resolvedAt` de `issue_already_resolved`.
  
  Las llamadas de `contract.ts` aplican la marca al recibir; las fixtures del falso la aplican con dos ayudas (`businessDate()`, `auditInstant()`).
- **`lib/format.ts`**:
  - `DISPLAY_TIME_ZONE = 'America/New_York'` y `DISPLAY_ZONE_LABEL = 'ET'`.
  - `formatBusinessDate(d: BusinessDate)` → `2026-09-28 ET` y `formatBusinessDateTime(d: BusinessDate)` → `2026-09-28 00:00 ET`, con `Intl.DateTimeFormat` y `timeZone: 'UTC'` sobre el valor recibido. Es decir, **sin convertir**: los dígitos que llegan son ya la hora de Nueva York.
  - `formatAuditDateTime(d: AuditInstant)` → `Intl.DateTimeFormat` con `timeZone: DISPLAY_TIME_ZONE`, que convierte el instante UTC a la hora de Nueva York con su horario de verano: `2026-10-18T14:20:00.000Z` → `2026-10-18 10:20 ET` (EDT, −4 h) y `2026-11-02T15:00:00.000Z` → `2026-11-02 10:00 ET` (EST, −5 h; el cambio es el 1-nov-2026).
  - Las tres usan `hourCycle: 'h23'` y componen el texto con `formatToParts`, sin depender del idioma del navegador. El `title` de cada fecha es el mismo texto, sin el ISO crudo, para no enseñar una `Z` que no significa UTC.
- **Tests deterministas**: `lib/format.test.ts` fija `process.env.TZ` a una zona que no es Nueva York (por ejemplo `Asia/Tokyo`) para demostrar que no se usa la del proceso.
  - Negocio: `2026-09-28T00:00:00.000Z` → `2026-09-28 00:00 ET`.
  - Auditoría: los dos casos de EDT y EST de arriba.
  - Compilación: un `// @ts-expect-error` comprueba que una `AuditInstant` no se puede pasar a `formatBusinessDateTime`.
- *Descartado 1*: un solo formateador que convierta todo a Nueva York. Movería cuatro o cinco horas los rangos y `relevantDate`, que no son instantes UTC, y un rango del día 28 se vería empezando el 27 a las 20:00.
- *Descartado 2*: mostrar en UTC (el primer borrador de este design). Las de negocio aparecerían con una etiqueta falsa y las de auditoría en una hora que el analista no usa.
- *Descartado 3*: `toLocaleString` con la zona del navegador. Los tests dependerían de la máquina y de CI, y dos analistas en zonas distintas leerían horas distintas para el mismo registro.
- Deuda: cuando el API serialice las de negocio sin `Z` (#48), `formatBusiness*` dejan de necesitar `timeZone: 'UTC'`, y los tipos marca se conservan.

### D12. Tests de componentes con MSW
- **El falso** (`test/msw/validations.ts`) **no recalcula reglas de negocio**. No reimplementa ni el motor ni las guardas de #9.
  - **Lo que viene fijado en las fixtures** de cada escenario:
    - `results` (con `outcome`, `blocking`, `issueCount` y `breakdown`), `run.blocked` y los hallazgos;
    - `editable` e `includable` de cada aparición y `resolvable` de cada hallazgo;
    - la respuesta de cada `PATCH`, el **siguiente estado guionizado** por el escenario: el detalle que el API devolvería, o el `409` con su `code` y `details`. El falso no decide si una aparición se puede incluir: devuelve lo que el escenario declara.
  - **Lo único que modela** es lo que cambia entre peticiones:
    - el estado del import `analyzed ↔ validated` (escrito en `importRecord(id).status` de `imports.ts`);
    - la corrida superada al re-ejecutar (una corrida nueva desde la misma fixture, con `runId` nuevo);
    - `manualChangeCount`, que cuenta los `PATCH` guionizados aplicados en la corrida vigente y vuelve a 0 al re-ejecutar;
    - `lastInvalidatedReview`, al re-ejecutar o cambiar una inclusión sobre `validated`;
    - el historial: cada `PATCH` aplicado añade su entrada con el usuario que llama y su `AuditInstant`.
    
    Como consecuencia directa del contrato, no como regla propia, al resolver un hallazgo deja `resolvable` en `false` (ya no es `persistent`), y los hallazgos de una corrida superada se leen con todos los controles apagados, porque #9 exige la corrida vigente para `editable`, `includable` y `resolvable`.
  - **Fixtures base**, con los ids de `affectedIds` y los `defaults` de `expected.json`:
    - `batch-issues`: ocho resultados y 23 hallazgos (los conteos de `expected.json`), con una aparición `previous_batch` en los dos *across*;
    - `batch-blocked`: datos de la corrida real de #9 contra el seed (proposal hueco 5, resuelto en el rebase): `provider_mismatch` con `252570479111759`, diez faltantes APP en `missing_in_range` y el resto `passed`.
    
    Los hallazgos de una sola fila (`provider_mismatch`, `non_recorded_adjustment`, `status_mismatch`) van sin apariciones, con su fila en `source`, como los devuelve el API real.
  - **Variantes por escenario** sobre una fixture base. Por ejemplo, la de la reserva R declara un hallazgo R con dos apariciones, una incluida y otra que **llega con `editable: true, includable: false`**, y guioniza el `409 occurrence_not_includable { reason: 'reserve_already_included' }` para su `PATCH`.
  - Alcance y permiso, igual que el falso de imports: `viewer` → `403` en escrituras; fuera de alcance → `404`.
  - Tiene su propio test (`validations.test.ts`), como `imports.test.ts`, que cubre solo lo que modela: transiciones, superación, contador, invalidación, historial, guion de los `PATCH` y alcance.
  - *Descartado*: un falso que calcule `editable`/`includable`/`resolvable` y la regla de R como #9 D9. Sería una segunda implementación de las reglas en el frontend, divergiría en silencio de la del backend y los tests de la pantalla acabarían probando el falso. Con fixtures guionizadas, cada test dice qué devuelve el API y comprueba solo cómo lo pinta la pantalla.
- **Escenarios**: cada escenario de la spec es un test, con `renderApp('/imports/<id>?step=analysis', { as })` sobre `seedImport` + `seedValidationRun`. La Definición de hecho del issue pide expresamente los de la tabla de validaciones y los del Continue deshabilitado.
- **Rotura deliberada** una vez por pieza crítica: quitar la guarda síncrona (llegan dos `POST`); habilitar Continue sin mirar `run.blocked` (falla el escenario de `batch-blocked`); invertir la comparación de fechas del aviso (falla "Revisión nueva"); habilitar el interruptor sin mirar `includable` (falla "Reserva que no se puede incluir").
- **Sin integración ni E2E** mientras #9 está en curso: la base local es compartida. La prueba contra el API real va en el último grupo (D13).

### D13. Rebase sobre #9 (último grupo, espera al merge)
1. Rebase de `feat/web-validations` sobre `feature/entrega-2-MVP` con #9 fusionado. `docs/openapi.yaml` y `schema.gen.ts` llegan regenerados por #9. Si no, `pnpm --filter @recon/frontend api:generate`.
2. `contract.ts` → alias de `ApiResponse<…>`, `ApiResponse` ampliado a `patch` y a respuestas `201` (hoy solo mira `200` y no admite `patch`), y llamadas con `api`. Un cast como el de `asDetail` solo si `Readable<>` vuelve a perder propiedades de tipo `null`, como pasó en `web-import`.
3. El falso, tipado con los tipos generados y, si existen, contrastado con los esquemas Zod de `@recon/shared`.
4. `pnpm typecheck`, `pnpm lint`, `pnpm test`.
5. Prueba manual contra el API real con `batch-issues` (corrida, duplicado, incluir, resolver el NRA, continuar, re-ejecutar y ver el aviso) y `batch-blocked` (Continue deshabilitado, cancelar), con la base libre (proposal, insumo 2). Se contrastan los resultados de `batch-blocked` con el supuesto del falso y se ajusta el fixture si difiere. También se comprueba que los rangos y `relevantDate` muestran los mismos dígitos que la base guarda (sin desplazamiento) y que las fechas de auditoría salen en la hora de Nueva York del momento de la acción.
6. Smoke E2E existente (`pnpm test:e2e`) sigue en verde. No se amplía: la suite E2E de validaciones es de la Entrega 3.
7. **Capturas con Playwright**: `e2e/screenshots/web-validations.ts`, lanzado con un script raíz propio (`pnpm screenshots:web-validations`). No es un `.feature` ni está bajo el `defineBddConfig` del smoke, así que `pnpm test:e2e` no lo recoge, y CI no lo ejecuta.
   - Mismas protecciones que el smoke de `web-import`: usuario `analyst` del seed con `SEED_PASSWORD` cargada con `process.loadEnvFile` del `.env` raíz, que nunca se lee ni se imprime; campo de contraseña vaciado tras el login; `trace: 'off'` y `video: 'off'`; ninguna captura antes de que la pantalla del import esté cargada, y nunca de la pantalla de login.
   - Crea sus imports de `batch-issues` y `batch-blocked` por la pantalla y los cancela al terminar.
   - Guarda cinco PNG en `docs/wireframes/web-validations/`, cuatro a 1280 px y uno a 1024 px, y escribe en consola si la página se desplaza en horizontal a cada anchura:
     - `batch-issues-validations.png`: tabla de validaciones;
     - `batch-issues-duplicate-drawer.png`: drawer del duplicado con historial, tras incluir la segunda aparición;
     - `batch-issues-duplicate-drawer-1024.png`: el mismo drawer a 1024 px, para la anchura del panel y su título;
     - `batch-issues-invalidated-review.png`: aviso de revisión invalidada, tras continuar y re-ejecutar;
     - `batch-blocked-continue-disabled.png`: Continue deshabilitado con el motivo.
   - **Antes de ejecutarlo se avisa a la persona**, que quiere mirar la ejecución, y se lanza en modo con cabeza (`headless: false`).
   - *Descartado*: capturas a mano. No se pueden repetir tras un ajuste visual, y la persona tendría que reproducir el mismo recorrido cuatro veces.

### D14. Textos, teclado y anchura
- `features/validations/strings.ts` con todos los textos de la pantalla. Los de la spec van literales y los mensajes de error, por `code`.
- Teclado: filas de la tabla y de la lista como `button`; Enter y Espacio las abren; el drawer atrapa el foco y lo devuelve; los interruptores (Radix `switch`) responden a Espacio; los diálogos (Radix `alert-dialog`) se cierran con Escape sin actuar.
- Los botones deshabilitados llevan su motivo en texto visible enlazado con `aria-describedby`, no solo en un `title`.
- A 1280 px y 1024 px la página no se desplaza en horizontal: la lista se desplaza dentro de su tarjeta y el drawer ocupa `min(42rem, 100vw)`, con las clases de anchura escritas con los mismos variantes que las del sheet de shadcn para sustituirlas.
- **Esperas de los tests**: la espera global de `findBy` es la de Testing Library (1 s). Solo la primera espera tras `renderApp` en los tests de validaciones usa `OPENING` (5 s, `test/validation-screens.ts`). Medido en el rebase: el primer render del paso Analysis en un fichero en frío tarda ~750 ms hasta la tabla de validaciones aislado (~370 ms en caliente) y más de 1 s con la suite en paralelo, porque encadena me → import → corrida → hallazgo. La cascada propia del drawer, que pedía el hallazgo después de la corrida, se corrigió para pedirlo a la vez. *Descartado*: 5 s globales, que también alargaban las aserciones de toda la suite.

## Risks / Trade-offs

- [El contrato de #9 cambia antes del merge] → Solo se tocan `contract.ts` y el falso (D2). El último grupo lo detecta con `typecheck`, porque los tipos generados sustituyen a los copiados.
- [El falso de MSW se aleja del backend real] → Se tipa con el contrato, se contrasta en el rebase con los esquemas compartidos y se prueba a mano contra el API real (D13). Los resultados de `batch-blocked` que el oráculo no fija se copiaron de la corrida real.
- [Un segundo `authFetch` en `contract.ts`, además del de `api`] → Comparten la misma `session`, que coordina la renovación (`web-shell` D7). Desaparece en el rebase.
- [Invalidar la corrida tras cada `PATCH` añade un `GET validations`] → Es una lectura de la base sin releer archivos (decenas de ms) y mantiene `manualChangeCount` correcto para el aviso de D4.
- [El texto genérico de `includable = false` no dice cuál de los dos motivos aplica] → Hueco 3 del proposal. El `409` da el específico si el usuario lo intenta. Inferirlo en el cliente duplicaría la regla de R.
- [Continue y Run se derivan del estado del import en el cliente] → Igual que en `web-import` D10. Si el estado cambió en el servidor, el `409` relee y la pantalla se corrige (D3).
- [Sin E2E de validaciones hasta la Entrega 3] → Tests de componentes por escenario, prueba manual contra el API real en el rebase y capturas en el PR.
- [Las fechas de negocio llegan con `Z` y parecen instantes UTC] → Tipos marca `BusinessDate` / `AuditInstant` y un formateador para cada uno (D11): usar el equivocado no compila. La deuda de serialización queda en #48.
- [Las fixtures guionizadas dicen lo que el escenario cree que devuelve el API, que puede no ser lo que devuelve] → Se tipan con el contrato, se contrastan con los esquemas compartidos en el rebase y se prueban contra el API real (D13). Es el precio de no duplicar las reglas en el falso (D12).
- [El script de capturas maneja la contraseña del seed] → Mismas protecciones que el smoke (D13 paso 7), sin trace ni vídeo, y fuera de CI.

## Migration Plan

Sin migraciones ni cambios de API. Despliegue: el de la SPA. Rollback: revertir el PR; el backend no depende del frontend. Orden: los grupos 1–7 se fusionan solo después del grupo 8, porque el PR no se abre contra `feature/entrega-2-MVP` hasta que #9 esté fusionado y el rebase hecho.

## Open Questions

- Textos finales de botones y mensajes no fijados por la spec: se ajustan en la revisión visual sin cambiar specs.
