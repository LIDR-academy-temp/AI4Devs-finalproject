# Tasks — import-in-progress

Rama `feat/import-in-progress` hacia `feature/entrega-3-MVP`. Sin migración ni seed. No se modifica código de producción de `settlement` ni `validation` (backend o frontend); los únicos archivos de esas áreas que se tocan son los tests de D8, en el grupo 9. Para filtrar un archivo de integración: `pnpm --filter @recon/backend exec vitest run --project integration <archivo>`.

## 1. Contrato compartido

- [x] 1.1 Tests primero en `packages/shared/src/imports.test.ts` para `ImportListQuery` (por defecto `page = 1` y `pageSize = 50`; `mine` `'true'`/`'false'` → booleano; rechaza `status=weird`, `mine=yes`, `merchantId=abc`, `accountId=123`, `page=0`, `pageSize=0` y `501`, y claves desconocidas), `ImportListItem` (`account`, `provider` y `merchant` con `{ id, name }`) e `ImportListPage`; comprobar que fallan
- [x] 1.2 Añadir los tres esquemas a `packages/shared/src/imports.ts` (design D1) y verificar que `pnpm --filter @recon/shared test` pasa
- [x] 1.3 Commit: `test(shared): esquemas del listado de imports en curso` y `feat(shared): consulta y página de GET /imports`

## 2. Readiness con hojas sin confirmar (#42)

- [x] 2.1 Tests primero en `domain/readiness.test.ts`: en `mapped`, una hoja sin confirmar da un solo `missing` `confirmation` en su posición, sin sus otros `missing`, conservando sus `notes`, y `canAnalyze = false`; en `uploaded` el resultado no cambia; con todo confirmado, `missing = []`. Romper uno a propósito y verlo fallar
- [x] 2.2 Implementar D4 en `readiness.ts` y extraer `unconfirmedSheetMessage`, compartida con `analysis-preconditions.ts`; pasar `mappingConfirmed` y `requireConfirmation` desde `detailOf` en `import-service.ts`. Verificar con `pnpm --filter @recon/backend test` que los tests de dominio y servicio pasan
- [x] 2.3 Integración en `backend/test/integration/import-analyze.int.test.ts` (o `imports.int.test.ts`, donde viva "Archivo añadido tras confirmar"): con `batch-split` part1 confirmado y part2 añadido, el `200` de añadir y el `GET` detalle traen `canAnalyze = false` y los mismos elementos `confirmation` que el `422` de analyze; tras confirmar todo, `missing = []`. Verificar con el filtro de integración
- [x] 2.4 Commit: `test(import): readiness con hojas sin confirmar` y `feat(import): la readiness del detalle nombra las hojas sin confirmar (#42)`

## 3. Motivo obligatorio al cancelar (#47)

- [x] 3.1 Tests primero: en `http/import-routes.analysis.test.ts`, un cuerpo ausente, `{}`, solo espacios, 501 caracteres o con un campo extra responde `400 validation_error` sin llamar al servicio; en `application/import-service.test.ts`, la auditoría `import.cancel` guarda `reason` recortado junto a `previousStatus` y `runId`. Verificar que fallan
- [x] 3.2 Implementar D3: `body: ReasonRequest` en la ruta y `reason` en `ImportService.cancel` y su auditoría. Verificar que los tests de 3.1 pasan
- [x] 3.3 Actualizar las llamadas al cancel del módulo `imports` en `backend/test/integration/import-analyze.int.test.ts` y añadir el escenario "Cancelar con motivo" (`batch-split` analizado → `detailJson.reason`) y "Sin motivo" (sin fila nueva de `AuditLog`). Verificar con el filtro de integración
- [x] 3.4 Commit: `test(import): motivo obligatorio al cancelar` y `feat(import): POST cancel exige y audita el motivo (#47)`

## 4. GET /imports

- [x] 4.1 Tests primero:
  - en `domain/import-state.test.ts`, `OPEN_IMPORT_STATUSES` coincide con `CANCELLABLE_STATUSES` (D2);
  - en `application/import-service.test.ts`, con el fake en memoria:
    - sin `status` solo salen los estados abiertos;
    - `mine` filtra por quien llama;
    - un merchant, proveedor o cuenta fuera del alcance da `NotFoundError`.

  Verificar que fallan.
- [x] 4.2 Implementar D1 y D2:
  - `OPEN_IMPORT_STATUSES`;
  - puertos `missingFilter` y `searchImports` en `application/ports.ts`, con su versión en el fake en memoria;
  - servicio `listImportsInScope`;
  - repositorio Prisma: `where` común, orden `updatedAt desc, importId asc`, `skip`/`take`, `count` y la jerarquía en el `select`;
  - ruta `GET /imports` con `app.authenticate`.

  Verificar que los tests unitarios pasan.
- [x] 4.3 Tests de rutas en `http/import-routes.test.ts`: `400` para los valores no válidos del escenario "Valores no válidos" y de paginación, y `401` sin token. Verificar que pasan
- [x] 4.4 Integración nueva `backend/test/integration/import-list.int.test.ts`, con los escenarios de los requisitos "Imports en curso", "Filtros de imports en curso" y "Paginación de imports en curso":
  - abiertos por defecto (`batch-split_part1` en `ProviderA-USD`, legacy en `ProviderC-Alt` y uno cancelado);
  - jerarquía, alcance de `viewer`, por cuenta y por estado, `mine` con un import de `admin`;
  - `404` iguales;
  - dos páginas sin repetidos;
  - el analizado con `rowsTotal = 783`.

  Las aserciones van sobre los `importId` creados en el test, nunca sobre la lista entera. Verificar con el filtro de integración.
- [x] 4.5 Commit: `test(import): listado de imports en curso` y `feat(import): GET /imports con filtros, alcance y paginación (#38)`

## 5. Contrato publicado, README y colección Bruno

- [x] 5.1 `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`; verificar que `pnpm openapi:check` queda limpio tras el commit y que `docs/openapi.yaml` trae `GET /imports` y el cuerpo obligatorio del cancel
- [x] 5.2 README §4:
  - fila nueva `GET /imports?status=&merchantId=&providerId=&accountId=&mine=&page=&pageSize=`;
  - fila del cancel con el cuerpo `{ reason }`, `400 validation_error` y `409 import_not_cancellable`.

  Verificar releyendo la tabla contra el delta spec.
- [x] 5.3 Bruno `10-smoke` (D9):
  - `Imports in progress`;
  - `Imports in progress - bad status`, `- bad page size`, `- no token` y `- viewer out of scope`;
  - `Cancel - no reason`;
  - `Cancel - viewer` con motivo.

  Verificar con `pnpm test:api:smoke` (con `pnpm dev` levantado).
- [x] 5.4 Bruno: `20-flows/imports/17 Cancel` con motivo, y flujo nuevo `20-flows/in-progress` (pasos de D9, cancela al final). Verificar con `pnpm test:api` dos veces seguidas sin sembrar entre medias
- [x] 5.5 Commit: `docs(api): GET /imports y motivo del cancel en el contrato, README y colección Bruno`

## 6. Fake MSW del API de imports

- [x] 6.1 Tests primero en `frontend/src/test/msw/imports.test.ts`:
  - `GET /imports` con filtros, alcance (`404`), orden y paginación;
  - el cancel sin motivo da `400`, y con motivo, `200`;
  - la readiness en `mapped` con hojas sin confirmar.

  Verificar que fallan.
- [x] 6.2 Implementar en `frontend/src/test/msw/imports.ts`:
  - el handler de `GET /imports`, que valida con `ImportListQuery` y responde con `ImportListPage`;
  - la validación del cuerpo del cancel con `ReasonRequest`;
  - el port de D4 en `readinessOf`.

  Verificar que `pnpm --filter @recon/frontend test` pasa en `test/msw`.
- [x] 6.3 Commit: `test(web): fake MSW de GET /imports, motivo del cancel y readiness`

## 7. Column Mapping sin derivar la readiness

- [x] 7.1 Ajustar los tests de `mapping/MappingStep.test.tsx` y `mapping/analyze.test.tsx` al escenario "Archivo añadido tras confirmar" modificado: las hojas de `part2` salen de `readiness.missing` del detalle. Verificar que fallan mientras siga la derivación
- [x] 7.2 Implementar D7 (borrar `unconfirmedSheets` y su texto; habilitar Analyze con `mapped && canAnalyze && !dirty`) y verificar que pasan los tests de `features/imports`
- [x] 7.3 Commit: `test(web): readiness de Column Mapping tomada del API` y `refactor(web): la barra de readiness deja de derivar las hojas sin confirmar (#42)`

## 8. Cancelar con motivo en el espacio del import

- [x] 8.1 Tests primero en `features/imports/cancel.test.tsx`:
  - Confirm deshabilitado con el motivo vacío o solo con espacios;
  - el motivo viaja recortado;
  - el campo está vacío al reabrir;
  - desistir no llama al API;
  - el `409` muestra el mensaje y recarga.

  Verificar que fallan.
- [x] 8.2 Implementar D6 en `CancelImportDialog` (prop `detail` estrechada, `onCancelled`, campo `Reason`) y en `useCancelImport` (motivo e invalidación de `['import-list']`), sin tocar `DecisionBar.tsx`. Verificar con `pnpm typecheck` y los tests de `features/imports`
- [x] 8.3 Smoke E2E: en `e2e/steps/import-smoke.steps.ts`, el paso de cancelar y la limpieza escriben un motivo antes de confirmar. Verificar con el comando del smoke contra la app local
- [x] 8.4 Commit: `test(web): motivo obligatorio en Cancel import` y `feat(web): Cancel import pide motivo (#47)`

## 9. Llamadas al cancel en tests de otras áreas (D8, con aviso a la sesión de #62)

- [x] 9.1 Añadir `{ reason }` a las cinco llamadas al cancel de `settlement-lifecycle.int.test.ts`, `validation-review.int.test.ts` y `validation-runs.int.test.ts`, y el paso de escribir el motivo en `features/validations/decision.test.tsx`. Sin otros cambios. Verificar con el filtro de integración de cada archivo y con los tests de `features/validations`
- [x] 9.2 Commit: `test: motivo en las cancelaciones de los tests de settlement y validation`

## 10. Pantalla In Progress y menú

- [x] 10.1 Mover `useFeeScope` a `features/accounts/scope-selection.ts` como `useScopeSelection` (D5) e importarlo desde Fees. Verificar que los tests de `features/fees` pasan sin cambios
- [x] 10.2 Tests primero:
  - `features/imports/in-progress/InProgressPage.test.tsx`:
    - lista y columnas, con `—` antes del análisis y `Merchant A › Provider A`;
    - estado vacío con enlace;
    - filtros en la dirección y vuelta a la página 1;
    - selector dependiente merchant › proveedor › cuenta;
    - `?merchantId=999` → `This selection is not available.` sin pedir la lista;
    - **Resume** a `/imports/<id>`;
    - **Cancel** con motivo, que vuelve a pedir la lista;
    - `409` → mensaje y recarga;
    - paginación.
  - `validate-search.test.ts`: la dirección de In Progress.
  - `app/layout/AppLayout.test.tsx`: In Progress como enlace para `analyst` y `admin`, y entrada activa solo en su ruta.

  Verificar que fallan.
- [x] 10.3 Implementar la ruta `/reconciliations/in-progress` (permiso, migas, `validateInProgressSearch`), `importListQuery`, `InProgressPage` con filtros, tabla, `Pager` y estado vacío, los textos en `features/imports/strings.ts` y el `to` de In Progress en `nav-config.ts`. Verificar con `pnpm lint`, `pnpm typecheck` y `pnpm test`
- [x] 10.4 Commit: `test(web): pantalla In Progress` y `feat(web): pantalla In Progress con filtros, Resume y Cancel (#38)`

## 11. Capturas

- [x] 11.1 Script `e2e/screenshots/import-in-progress.ts` y `screenshots:import-in-progress` en `e2e/package.json` y en la raíz (D10). Verificar ejecutándolo contra la app local: deja las capturas a 1280 y 1024 px en `docs/wireframes/import-in-progress/`, sin desbordes, y ningún import que creó queda abierto
- [x] 11.2 Añadir la carpeta a `docs/wireframes/README.md` y revisar cada captura contra el prototipo `png/InProgress.png` (sin "Recently closed"). Verificar a ojo y anotarlo en el PR
- [x] 11.3 Commit: `docs(web): capturas de In Progress, cancelar con motivo y readiness`

## 12. Cierre

- [x] 12.1 README:
  - §1.5: marcar como hechos In Progress (#38), el motivo al cancelar (#47) y la readiness (#42), y dejar abierta la resolución de ambiguas (change `web-ambiguous-rows`);
  - §1.3: mapa de pantallas si algo cambia.

  `prompts.md` con las sesiones del change. Verificar releyendo.
- [x] 12.2 Comprobación integral: `pnpm lint`, `pnpm typecheck`, `pnpm test`, la suite de integración completa, `pnpm openapi:check`, `pnpm test:api` y `openspec validate import-in-progress --strict`, todo en verde
- [x] 12.3 Commit: `docs: README y prompts de import-in-progress`

## Workflow follow-up

- PR hacia `feature/entrega-3-MVP` con la plantilla; CI vigilado con `gh pr checks --json … --jq`.
- `/opsx:verify` y `review-diff` en una sesión nueva.
- `/opsx:archive` en su propio PR, en la misma fila del README §7.
- Después: change `web-ambiguous-rows` (gate ya aprobado: sin tocar el backend, capturas con `GET rows` interceptado y nota en el README de wireframes).
