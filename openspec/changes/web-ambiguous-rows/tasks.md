# Tasks — web-ambiguous-rows

Rama `feat/web-ambiguous-rows` creada desde `origin/feature/entrega-3-MVP` cuando #129 (archivo de `import-in-progress`) esté mergeado; PR hacia `feature/entrega-3-MVP`. Solo frontend, e2e y docs: no se tocan `backend/`, `packages/shared`, `docs/openapi.yaml`, `schema.gen.ts` ni la colección Bruno. Sin migración ni seed. De `features/validations` solo se importa `validationRunKey`.

## 1. Fake MSW del PATCH

- [x] 1.1 Tests primero en `frontend/src/test/msw/imports.test.ts` (design D5): con una fila de `makeAmbiguousRow`, el `PATCH` responde `200` con un cuerpo que pasa `ImportRowItem.parse` y la fila queda `matched` en `GET rows`; `viewer` → `403`; import invisible → `404`; import `validated` → `409 import_not_editable` con `details.status`; `rowNo=abc` o `{ gatewayId: 0 }` → `400`; fila inexistente → `404`; fila `matched` → `409 row_not_ambiguous` con `details.matchResult`; gateway que no es candidato → `400 validation_error` con `details.candidates`. En `validations.test.ts`: tras el `PATCH`, `GET validations` responde `run: null`. Verificar que fallan
- [x] 1.2 Implementar `makeAmbiguousRow` en `import-fixtures.ts` (la fila y, por candidata, el `ImportRowItem` resuelto), el handler `resolveRow` en `imports.ts` con `ResolveRowBody` y `ImportRowItem` de `@recon/shared`, y `supersedeCurrentRun` en `validations.ts`. Verificar con `pnpm --filter @recon/frontend test -- src/test/msw` que 1.1 pasa
- [x] 1.3 Commit: `test(web): fake del PATCH de filas ambiguas` y `test(web): el fake resuelve la fila y supera la corrida`

## 2. Modo de las candidatas por estado y permiso

- [x] 2.1 Tests primero en `analysis/RowsTable.test.tsx` (spec "Fila ambigua sin resolución posible", D1): el caso "offers no way to choose" pasa a `viewer` en `analyzed`; `analyst` en `validated` ve **Choose** deshabilitado, `aria-describedby` hacia `Run the validations again to choose a gateway: the import goes back to Analyzed.` y ningún `PATCH`; `analyst` en `cancelled` no ve botones; `analyst` en `analyzed` ve un **Choose** por candidata con su nombre accesible, también en la de `(another merchant)`. Verificar que fallan
- [x] 2.2 Implementar D1: `AmbiguousCandidates.tsx`, el contexto del modo, la prop `status` de `RowsTable` desde `AnalysisStep` y los textos en `strings.ts`. Verificar con `pnpm --filter @recon/frontend test -- src/features/imports/analysis` que 2.1 y los casos previos pasan
- [x] 2.3 Commit: `test(web): candidatas de una fila ambigua según estado y permiso` y `feat(web): botón Choose por candidata en las filas ambiguas (#38)`

## 3. Confirmar y resolver

- [x] 3.1 Tests primero en `analysis/resolve-row.test.tsx` (spec "Resolver una fila ambigua desde la pantalla", "Confirmación al resolver una fila ambigua" y "Después de resolver una fila ambigua"; D2–D4):
  - elegir y confirmar: cuerpo `{ gatewayId }` del `PATCH`, la fila sale como `Matched`, el contador `Ambiguous` baja en 1, mensaje de éxito y foco en el encabezado de filas;
  - sin corrida (`run = null`) el diálogo no menciona la corrida; con `seedValidationRun` la menciona y, tras confirmar, la sección muestra `No validation run yet.`;
  - candidata `outOfScope`: el diálogo la nombra `(another merchant)` sin canal, estado ni importe, y el `PATCH` lleva su `gatewayId`;
  - desistir con **Keep** no llama al `PATCH`;
  - `409 import_not_editable` (el fake pasa a `validated` entre abrir y confirmar) → mensaje con el estado y el control queda deshabilitado; `409 row_not_ambiguous` → mensaje y la fila se vuelve a pedir; `400` → mensaje; fallo de red con `failNext('resolveRow')` → mensaje genérico;
  - con el `PATCH` retenido (`holdNext`), todos los **Choose** y el confirmar están deshabilitados;
  - con `match=ambiguous` y la única ambigua en la última página, tras resolver se va a la página anterior.

  Verificar que fallan.
- [x] 3.2 Implementar `useResolveRow` en `mutations.ts` (D3), `ResolveRowDialog.tsx` con el aviso leído de la caché (D2), la región de mensajes, el foco y el ajuste de página en `RowsTable` (D4). Verificar con `pnpm lint`, `pnpm typecheck` y `pnpm test` que todo pasa
- [x] 3.3 Commit: `test(web): resolver una fila ambigua desde la tabla` y `feat(web): resolver filas ambiguas con confirmación y aviso de la corrida (#38)`

## 4. Capturas

- [x] 4.1 Script `e2e/screenshots/web-ambiguous-rows.ts` y `screenshots:web-ambiguous-rows` en `e2e/package.json` y en la raíz (D6): `batch-split` en ProviderA-USD, solo `GET rows` interceptado con `page.route`, capturas `ambiguous-row`, `resolve-dialog-no-run`, `resolve-dialog` y `ambiguous-row-validated` a 1280 px, medidas también a 1024 px (la tabla de filas, desborde conocido hasta #132, solo al log), diálogo cerrado siempre con **Keep**, import cancelado con motivo al final. Verificar ejecutándolo contra la app local (`pnpm db:up`, `pnpm db:seed` y `pnpm dev` los levanta la persona): deja las cuatro capturas en `docs/wireframes/web-ambiguous-rows/`, sin más desbordes, y ningún import queda abierto
- [x] 4.2 Añadir la carpeta a `docs/wireframes/README.md`: qué muestra cada captura, que la fila ambigua es sintética e inyectada en `GET rows` (el seed no produce ambiguas), que por eso el contador `Ambiguous` marca `0`, y la excepción a 1024 px con #132. Verificar a ojo cada captura y anotarlo en el PR
- [x] 4.3 Commit: `docs(web): capturas de la resolución de filas ambiguas`

## 5. Cierre

- [ ] 5.1 README §1.5: la resolución de ambiguas (#38) pasa a hecha; §1.3 si el mapa de pantallas lo menciona. `prompts.md` con las sesiones del change. Verificar releyendo
- [ ] 5.2 Comprobación integral: `pnpm lint`, `pnpm typecheck`, `pnpm test` y `openspec validate web-ambiguous-rows --strict`, en verde; `git diff --stat origin/feature/entrega-3-MVP` no toca `backend/`, `packages/` ni `api-collection/`
- [ ] 5.3 Commit: `docs: README y prompts de web-ambiguous-rows`

## Workflow follow-up

- PR hacia `feature/entrega-3-MVP` con la plantilla, que cierra la casilla de ambiguas de #38; CI vigilado con `gh pr checks --json … --jq`.
- `/opsx:verify` y `review-diff` en una sesión nueva.
- `/opsx:archive` en su propio PR.
