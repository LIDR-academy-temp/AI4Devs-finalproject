# Tasks — web-rows-table-compact

En la rama `fix/web-rows-table-1024` (#132), con PR hacia `feature/entrega-3-MVP`. Solo frontend, e2e y docs: no se tocan el backend, `packages/shared`, el contrato ni la colección Bruno. Sin migración ni seed.

## 1. Lo ya hecho en la rama

- [x] 1.1 Resultado y advertencias partidos entre palabras; ID e importe sin partirse. Verificado con `RowsTable.test.tsx` ("wraps the result and the warnings…"). Commits `0244286` (test) y `d1d1058` (fix, con el script sin la excepción de #132 y la nota de `docs/wireframes/README.md`)
- [x] 1.2 El archivo se parte de verdad (`whitespace-normal`). Verificado con el test de hoja y archivo. Commits `f5c638f` (test) y `91b1f7c` (fix)
- [x] 1.3 Anchos fijos `w-28` (archivo) y `w-24` (resultado), e importe y moneda en la columna **Amount**. Verificado con "shows the amount and its currency in one column…". Commits `7d5a4eb` (test) y `c419c72` (fix)
- [x] 1.4 Relleno `px-1.5 xl:px-2` en cabeceras y celdas. Verificado con el script: cabe a 1024 px con 1 px de margen. Commit `3f8dc97`

## 2. La fila con la hoja (D1)

- [ ] 2.1 Tests primero en `RowsTable.test.tsx` (spec "Hoja y archivo de cada fila"):
  - la tabla no tiene cabecera `Row`;
  - la celda `Sheet · file` muestra `APP · row 2` en una pieza `whitespace-nowrap`, con la hoja en su propio elemento;
  - el archivo sigue debajo, entero y con tooltip.

  Ajustar el test de hoja y archivo a la nueva estructura. Verificar que fallan
- [ ] 2.2 Implementar D1 en `RowsTable.tsx` y en `strings.ts`: sale `columns.row` y entra el texto de la fila. Verificar con `pnpm --filter frontend exec vitest run src/features/imports` y con `pnpm lint` y `pnpm typecheck`
- [ ] 2.3 Commit: `test(web): el número de fila va con la hoja en la tabla de filas` y `fix(web): la fila con la hoja y sin columna propia (#132)`

## 3. Capturas y margen

- [ ] 3.1 Comprobar que `e2e/screenshots/web-ambiguous-rows.ts` sigue leyendo solo la hoja de la primera celda, y ajustarlo si no. Verificar con `pnpm --filter e2e typecheck`
- [ ] 3.2 Con turno de base de la persona (`pnpm db:up`, `pnpm db:seed` y `pnpm dev` levantados por ella), ejecutar `pnpm screenshots:web-ambiguous-rows`. Verificar:
  - que todas las medidas dicen `fits`;
  - que hay al menos 20 px de margen a 1024 px en las cuatro pantallas, con la medida temporal de D2 (sin commit);
  - las ocho capturas, mirándolas una a una.
- [ ] 3.3 Actualizar `docs/wireframes/README.md` (la fila con la hoja, la columna **Amount**) y anotar el margen medido. Commit: `docs(web): capturas de web-ambiguous-rows a 1280 y 1024 px (#132)`

## 4. PR

- [ ] 4.1 Push y PR hacia `feature/entrega-3-MVP` con "Closes #132", con este change y las medidas. Vigilar el CI con `gh --jq` hasta que esté verde

## Workflow follow-up

- Review-diff en una sesión nueva.
- `/opsx:archive web-rows-table-compact` después del merge.
