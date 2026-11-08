# Tasks — web-polish-e3

En la rama `fix/web-polish-e3`, con PR hacia `feature/entrega-3-MVP`.

- **No se tocan** `frontend/src/lib/format.ts`, `packages/shared` ni las fechas (#48).
- **Comprobación de cada grupo:** `pnpm lint`, `pnpm typecheck` y `pnpm --filter frontend test` (más `pnpm --filter backend test` en el grupo 3).
- **Corte:** cada grupo cierra con sus commits, en orden de prioridad. Lo que no esté fusionado el domingo 2026-11-08 por la noche queda fuera.

## 1. #110: valores inválidos de la dirección (D1)

- [x] 1.1 Tests primero, sin cambiar la implementación:
  - **`list-search.test.ts` y `validate-search.test.ts`:** para `validateSettlementListSearch`, `validateImportSearch` y `validateInProgressSearch`, el resultado tiene cada clave inválida presente con `undefined` (`'status' in result` y `result.status === undefined`), no solo `toEqual({})`;
  - **`SettlementList.test.tsx`:** con `?status=foo&dateField=foo&from=2026-02-30&page=abc`, la petición de la lista no lleva `status`, `dateField` ni `from` y lleva `page=1`;
  - **`in-progress/InProgressPage.test.tsx`:** con `?status=cancelled&mine=yes&providerId=201&page=abc`, la petición es `GET /imports?page=1&pageSize=50`;
  - **`analysis/RowsTable.test.tsx`:** con `?step=analysis&match=weird&page=abc`, la petición de filas no lleva `match`;
  - **`validations/IssuesList.test.tsx`:** con `?validation=foo&ipage=abc&issue=abc`, no se pide `validation-issues` con `validationCode=foo` y no hay drawer.

  Verificar que cada test falla porque la petición lleva el valor inválido. Si alguno no falla, quitar ese caso del change y decirlo (design, Risks)
- [x] 1.2 Commit: `test(web): valores inválidos de la dirección en Settlement List, Analysis e In Progress, en rojo (#110)`
- [x] 1.3 Devolver todas las claves en los tres validadores, con el comentario de `fees-search.ts`, y borrar sus `dropUndefined`. Verificar que los tests de 1.1 y los de siempre pasan, más `pnpm lint` y `pnpm typecheck`
- [x] 1.4 Commit: `fix(web): los valores inválidos de la dirección no llegan a la consulta del API (#110)`

## 2. #140: canal sin cuenta principal (D2)

- [x] 2.1 Tests primero:
  - **`ChannelNotice.test.tsx`:** `assigned_to_other_account` con `otherAccount = null` muestra `RAM-03 has no primary account` con su nota y no `another merchant`. El caso de otro merchant (`outOfScope`) sigue diciendo `… is primary in an account of another merchant`;
  - **`settlements/merged-contract.test.tsx`** (donde ya estaba el caso `otherAccount = null`, con el texto antiguo): `channelsToAssign` con `RAM-07` `assigned_to_other_account` y `otherAccount = null` muestra `RAM-07 · no primary account`.

  Verificar que fallan
- [x] 2.2 Commit: `test(web): canal sin cuenta principal en Analysis y Settlement Review, en rojo (#140)`
- [x] 2.3 `noPrimary` en `imports/strings.ts` y `settlements/strings.ts`, `describeAssignment` y `describe` con el caso `null`, y `anotherAccount` borrado. Verificar los tests
- [x] 2.4 Commit: `fix(web): un canal sin cuenta principal ya no se atribuye a otro merchant (#140)`

## 3. #125: etiqueta de la liberación por ajuste (D4)

- [x] 3.1 Tests primero, con la etiqueta nueva:
  - **backend:** `payable-breakdown.test.ts` y `summary-csv.test.ts` (`Reserve released on adjustment` en las dos filas del CSV y ninguna `on chargeback`);
  - **frontend:** `preview.test.tsx`, `SettlementSummary.test.tsx` y `SummaryMovements.test.tsx`.

  Verificar que fallan con la etiqueta antigua
- [x] 3.2 Commit: `test(settlement): etiqueta de la liberación de reserva por ajuste, en rojo (#125)`
- [x] 3.3 Implementar y verificar los tests de 3.1, `pnpm --filter backend test` y `pnpm --filter frontend test`:
  - **backend:** `payable-breakdown.ts`, `exports/summary-csv.ts` y `test-support/example-view.ts`;
  - **frontend:** `settlements/strings.ts` (`payableLines.reserve_early_released`, `summary.reserveLines.early` y la `early` de Movements) y la fixture de MSW (`test/msw/settlements.ts`);
  - **README:** el ejemplo de `payableBreakdown` de §4 y la frase de §1.2 que decía que la línea seguía llamándose "on chargeback".

  Comprobar con `rg -i "released on chargeback"` que solo quedan apariciones en `openspec/changes/archive/`, en este change, en la spec principal (la cambia el archive), en `prompts.md` (historia) y en un test de `packages/shared` que usa la etiqueta como dato (zona del #48, sin tocar)
- [x] 3.4 Commit: `fix(settlement): la liberación anticipada de la reserva se llama de ajuste en el summary (#125)`

## 4. #139: una sola frase de cuenta equivocada (D3)

- [x] 4.1 Test primero en `components/strings.test.ts`: las claves de cuenta equivocada de `imports`, `settlements` y `validations` empiezan por `strings.wrongAccount` de `components/strings.ts`, y la de `validations` sigue con su frase de acción. Verificar que falla (todavía no existe `strings.wrongAccount`)
- [x] 4.2 Commit: `test(web): frase común de cuenta equivocada, en rojo (#139)`
- [x] 4.3 Añadir `wrongAccount` a `components/strings.ts`. Las tres features lo usan, y `validations` tiene la frase de acción en su propia clave. Verificar que el test de 4.1 y los RTL que comparan el literal pasan sin tocarlos
- [x] 4.4 Commit: `refactor(web): el texto de cuenta equivocada se define una sola vez (#139)`

## 5. Capturas, PR y CI (D5)

- [x] 5.1 **Con turno de base de la persona y `pnpm dev` levantado desde esta carpeta, sin procesar nada:** las tres capturas de D5 en `docs/wireframes/web-polish-e3/`, a 1280 px y con `analyst`. Comprobar a la vista:
  - `Reserve released on adjustment` en el desglose;
  - `Released on adjustment` en las reservas y en **Reserves**;
  - la lista cargada con `status=foo`.

  Soltar la base y avisar. Commit: `docs(wireframes): capturas de web-polish-e3 (#110, #125)`
- [ ] 5.2 Push y PR hacia `feature/entrega-3-MVP` con la plantilla, con "Closes #110, #140, #139, #125" y el aviso de que **cambia una etiqueta del CSV del summary** que se entrega al merchant. Vigilar el CI con `gh --jq` hasta que esté verde

## Workflow follow-up

- `/opsx:verify` y review-diff en una sesión nueva.
- `/opsx:archive web-polish-e3` después del merge.
