# Design — import-in-progress

## Context

Motivación y alcance en `proposal.md`; comportamiento en los delta specs `import` y `web-shell`. Estado de partida:

- **Listado.** Solo existe `GET /accounts/{id}/imports` (servicio `listImports`, repositorio `listImports` con `visibleAccount(scope)`), sin paginar y sin nombres de la jerarquía. `GET /fees` ya resuelve el mismo problema (filtros merchant › proveedor › cuenta con `404` fuera del alcance, página `{ items, page, pageSize, total }`): `fee-query-service.ts` y `missingFilter` de `prisma-fee-query-repository.ts`.
- **Cancel.** `POST /imports/{id}/cancel` no tiene `body` en su esquema. `ImportService.cancel` audita `{ previousStatus, runId }`. `ReasonRequest` (de 1 a 500 caracteres, recortado, `strictObject`) vive en `packages/shared/src/settlement.ts` y lo usan undo y unpay.
- **Readiness.** `assessReadiness` (dominio, puro) evalúa el pareo efectivo de cada hoja y no sabe el estado del import ni `mappingConfirmed`; `analysisPreconditions` sí, y emite `confirmation` con el mensaje `The mapping of sheet "<hoja>" is not confirmed`. El frontend lo compensa con `unconfirmedSheets` en `ReadinessBar.tsx`, y el fake MSW (`frontend/src/test/msw/imports.ts`, `readinessOf`) es un port del dominio.
- **Frontend.** La entrada In Progress de `nav-config.ts` no tiene `to`. `CancelImportDialog` recibe `detail: ImportDetail` y lo usan el espacio del import y `features/validations/DecisionBar.tsx` (**Cancel and reprocess**). El selector merchant › proveedor › cuenta con comprobación de alcance es `useFeeScope` en `features/fees/FeeFilters.tsx`.
- **Restricciones.** No se modifican `backend/src/modules/{settlement,validation}` ni `frontend/src/features/{settlements,validations}` (sesión paralela de #62). Sin migración. Nada depende del estado de `batch-clean` (#111).

## Goals / Non-Goals

**Goals:**

- Un único endpoint de listado que sirva a In Progress y, más adelante, al Dashboard y a "Recently closed" (por eso `status` admite los seis estados).
- Que la readiness del API y el `422` de analyze digan lo mismo de las hojas sin confirmar, y que el frontend deje de derivarlo.
- Motivo de cancelación auditado sin tocar el modelo de datos.

**Non-Goals:**

- Índice nuevo para el listado (ver Riesgos).
- Mostrar el motivo de la cancelación en ninguna pantalla.
- Cambiar el comportamiento de **Cancel and reprocess** más allá de pedir el motivo, que hereda del diálogo compartido.

## Decisions

### D1. `GET /imports` en el módulo `imports`, con forma de `GET /fees`

Esquemas nuevos en `packages/shared/src/imports.ts`:

- `ImportListQuery` (`strictObject`): `status: ImportStatus.optional()`, `merchantId: IntId`, `providerId: IntId`, `accountId: z.uuid()` (los tres opcionales), `mine: z.enum(['true','false']).transform(...)` opcional (el mismo patrón que `AccountFeesQuery.transactional`), `page` (por defecto 1) y `pageSize` (de 1 a 500, por defecto 50).
- `ImportListItem = ImportSummary.extend({ account: { id, name }, provider: { id, name }, merchant: { id, name } })`, con las mismas claves `{ id, name }` que `FeeListItem`.
- `ImportListPage = { items, page, pageSize, total }`.

La ruta `GET /imports` usa `app.authenticate`, como `GET /accounts/{id}/imports`. El servicio `ImportService.listImportsInScope(scope, userId, query)` hace dos cosas:

1. Llama a `imports.missingFilter(scope, query)`, que replica el de fees dentro del repositorio de imports para no depender del módulo `fees`; si devuelve algo, lanza `NotFoundError`.
2. Llama a `imports.searchImports(scope, { statuses, merchantId, providerId, accountId, createdByUserId, page, pageSize })`. Sin `status`, `statuses` es `OPEN_IMPORT_STATUSES`; con `mine=true`, `createdByUserId` es el de quien llama.

El repositorio hace un `findMany` y un `count` con el mismo `where`:

- `account: visibleAccount(scope)` y `status in statuses`;
- el filtro de merchant como `account.provider.merchantId`;
- `orderBy [{ updatedAt: 'desc' }, { importId: 'asc' }]`, con `skip` y `take`;
- `select` del resumen más `account.name`, `account.provider.{providerId, name}` y `account.provider.merchant.{merchantId, name}`.

*Alternativas descartadas:*

- Ampliar `GET /accounts/{id}/imports`: sigue siendo de una cuenta, y In Progress cruza cuentas.
- Componer la lista en el navegador con una llamada por cuenta: N llamadas, y no hay listado global de cuentas.
- Un endpoint `/dashboard`: es otra pantalla y otro change.

### D2. Estados abiertos en el dominio

`OPEN_IMPORT_STATUSES` en `domain/import-state.ts` (`uploaded`, `mapped`, `analyzed`, `validated`). Coincide con `CANCELLABLE_STATUSES` pero es otra regla: "en curso" frente a "se puede cancelar". Un test fija que hoy son iguales, para que un cambio en una obligue a mirar la otra.

### D3. Motivo de cancelación con `ReasonRequest`, sin moverlo

La ruta declara `body: ReasonRequest`, importado de `@recon/shared`. No se mueve de `settlement.ts`, porque la sesión paralela edita ese archivo. `ImportService.cancel(scope, userId, importId, reason)` audita `{ previousStatus, runId, reason }`.

Fastify valida el cuerpo antes del `preHandler` de permisos (#72). Por eso un `viewer` sin cuerpo recibe `400`, no `403`, igual que hoy en unpay. El negativo de permiso en Bruno envía un motivo válido.

*Alternativa descartada:* una columna `Import.cancelReason`, que exigiría migración (descartada en el gate).

### D4. Readiness consciente de la confirmación

`assessReadiness(sheets, statuses, { requireConfirmation })`, donde `ReadinessSheet` gana `mappingConfirmed` y `requireConfirmation` es `status === 'mapped'`.

Para una hoja sin confirmar con `requireConfirmation`:

- se descartan los elementos `missing` de esa hoja;
- se añade uno `confirmation`, en su posición dentro del orden de las hojas;
- sus `notes` se conservan, porque ayudan a revisar la propuesta antes de confirmarla.

El elemento general `transactions` no cambia. El mensaje sale de una función compartida con `analysisPreconditions` (`unconfirmedSheetMessage`), así que el `422` y la readiness dicen lo mismo.

En `uploaded`, `requireConfirmation = false` y el resultado es el de hoy: el escenario "Plantilla lista para analizar" y el `409 import_not_mapped` con `canAnalyze = true` siguen valiendo.

*Alternativa descartada:* llamar a `analysisPreconditions` desde `detailOf` y fusionar resultados. Mezcla dos listas con criterios distintos y duplica el elemento `transactions`.

### D5. Frontend: In Progress

- **Ruta y permiso.** `/reconciliations/in-progress` con `requires: 'settlement.process'` y migas `Reconciliation › In Progress`. En `nav-config` la entrada gana `to`. Como New Reconciliation se marca activa en `/imports/...` y en `/reconciliations/new`, In Progress solo es activa en su ruta.
- **Dirección.** `validateInProgressSearch` va en `features/imports/validate-search.ts`. Se descartan los valores no válidos, como en el resto de pantallas, y `status` solo admite los cuatro estados abiertos.
- **Consulta.** `importListQuery(search)` con la clave `['import-list', params]` y `placeholderData: keepPreviousData`. La raíz es distinta de `['imports', id]` para que invalidar la lista no toque el detalle de ningún import.
- **Selector de alcance.** `useFeeScope` pasa a `features/accounts/scope-selection.ts` como `useScopeSelection`, y Fees lo importa desde ahí. Es un movimiento sin cambio de comportamiento y lo cubren los tests de Fees. *Alternativa descartada:* copiarlo, con lo que habría dos lógicas de alcance que mantener.
- **Tabla.** `InProgressPage` con tabla y `Pager` (`components/Pager.tsx`). Estado con `status-tone` (colores de estado de web-shell) y fechas con `lib/format`.

### D6. `CancelImportDialog` con motivo y reutilizable

- **Props.** La prop `detail: ImportDetail` pasa a `target: Pick<ImportDetail, 'importId' | 'accountId' | 'status'>`. Como `ImportDetail` cumple ese tipo, `DecisionBar.tsx` (validations) sigue compilando sin cambios.
- **Callback.** Se añade `onCancelled?` para que In Progress vuelva a pedir su lista.
- **Campo `Reason`.** Es un `Textarea` con `maxLength` 500 que empieza vacío cada vez que se abre. **Yes, cancel the import** está deshabilitado mientras el motivo recortado esté vacío. Se envía recortado.
- **Errores.** Se mantiene el tratamiento de hoy: el diálogo se cierra, se muestra el mensaje y, ante `409`, se recarga.
- **Mutación.** `useCancelImport(importId)` recibe el motivo e invalida además `['import-list']`.

No se reutiliza `features/settlements/ReasonDialog.tsx`: es de settlements, y moverlo tocaría la otra sesión.

### D7. `ReadinessBar` sin derivación

- Se borran `unconfirmedSheets` y `strings.readiness.unconfirmed`.
- **Analyze** se habilita con `status === 'mapped' && readiness.canAnalyze && !dirty`.
- El fake MSW porta D4 (`readinessOf` recibe el estado y `mappingConfirmed`).

### D8. Llamadas al cancel fuera del módulo (pendiente de confirmar)

El cuerpo obligatorio rompe cinco llamadas que hoy cancelan sin cuerpo, en archivos de las áreas de la otra sesión:

- `backend/test/integration/settlement-lifecycle.int.test.ts:662`
- `backend/test/integration/validation-review.int.test.ts:260` y `:272`
- `backend/test/integration/validation-runs.int.test.ts:530` y `:544`
- `frontend/src/features/validations/decision.test.tsx:201` (el test confirma el diálogo sin escribir motivo)

Propuesta:

- añadir el cuerpo `{ reason }` en cada llamada (una línea en cada una) y el paso de escribir el motivo en `decision.test.tsx`;
- todo en un commit aparte (`test: …`) al final, para rebasar fácil;
- avisar a la sesión de #62 de qué líneas toca.

No cambia ningún código de producción de esos módulos.

*Alternativa descartada:* aceptar la cancelación sin cuerpo durante una transición. Contradice el gate (motivo obligatorio).

### D9. Bruno

- **`10-smoke`**:
  - `Imports in progress`: feliz, `200` con `items`, `total` y la jerarquía.
  - Tres negativos de `400 validation_error`: estado inventado, `pageSize` de 501 y cancel sin motivo con un UUID cualquiera (el cuerpo se valida antes de buscar el import).
  - `- no token` (`401`) y `- viewer out of scope` (`?merchantId=2`, `404`).
  - `Cancel - viewer` envía `{ reason }` y sigue esperando `403`.
- **`20-flows/imports/17 Cancel`** envía un motivo.
- **Flujo nuevo `20-flows/in-progress`** (`analyst`), repetible sin sembrar:
  1. sube `Legacy_ProviderC-Alt_batch.xlsx` a `ProviderC-Alt` (la cuenta se resuelve por nombre);
  2. lo encuentra en `GET /imports?accountId=…` en `uploaded`;
  3. confirma la propuesta;
  4. añade `batch-split_part2.xlsx` y comprueba `canAnalyze = false` con elementos `confirmation`;
  5. lo encuentra con `?status=mapped&mine=true`;
  6. intenta cancelar sin motivo (`400`) y cancela con motivo (`200`);
  7. ya no sale en la lista por defecto y sí con `?status=cancelled`.

### D10. Capturas

`e2e/screenshots/import-in-progress.ts` (`pnpm screenshots:import-in-progress`), con las protecciones de los scripts anteriores: contraseña del `.env` de la raíz en tiempo de ejecución, sin traza ni vídeo, y medición de desbordes a 1280 y 1024 px.

Crea sus imports por el API:

- `batch-split_part1` en `ProviderA-USD` (se queda en `uploaded`);
- `legacy-provider` en `ProviderC-Alt`, confirmado y con `part2` añadido (`mapped` con hojas sin confirmar);
- `batch-split` completo en `ProviderA-USD`, analizado.

Captura In Progress (sin filtros, filtrada y vacía), el diálogo de cancelar con motivo y la barra de readiness con las hojas sin confirmar. Al terminar, cancela todo lo creado con motivo. No usa `batch-clean` ni valida (la validación sí depende del histórico).

## Risks / Trade-offs

- [El listado filtra por estado y por cuentas del alcance sin índice `(status, updatedAt)`] → El volumen es de cientos de imports al año. Si crece, un índice filtrado `WHERE status IN (…)` en una migración escrita a mano, en otro change.
- [**BREAKING**: un cliente que cancele sin cuerpo recibe `400`] → Los únicos clientes son el frontend, el smoke, Bruno y los tests, y se actualizan en el mismo PR. Backend y frontend se despliegan juntos (`scripts/deploy.sh`).
- [D8 toca archivos de test de la sesión paralela] → Commit aislado y de una línea por llamada, avisado; si la otra sesión llega antes a `main`, el rebase es trivial.
- [Los imports abiertos que dejan Bruno, las capturas o un test que falle ensucian In Progress] → Los flujos y las capturas cancelan lo que crean; los tests de integración filtran por los `importId` y las cuentas que crean, nunca por la lista entera.
- [Mover `useFeeScope` puede romper Fees] → Movimiento sin cambio de lógica; los tests de Fees son la red de seguridad y corren en el mismo grupo.

## Migration Plan

Sin migración ni seed. Despliegue normal (`scripts/deploy.sh build` + `up`). Rollback: revertir el PR; no deja datos que limpiar, porque los motivos se quedan en `AuditLog` como texto libre.
