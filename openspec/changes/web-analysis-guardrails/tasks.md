# Tasks — web-analysis-guardrails

En la rama `feat/web-analysis-guardrails` (#131), con PR hacia `feature/entrega-3-MVP`. Solo frontend, e2e y docs, dentro de `features/imports/analysis` y `test/msw`. No se tocan `features/validations` ni `features/settlements` (#53), ni el backend, `packages/shared`, el contrato o la colección Bruno. Sin migración ni seed.

Comando de tests de la carpeta: `pnpm --filter frontend exec vitest run src/features/imports`.

## 1. Fakes que devuelven lo que el API puede devolver (D5)

- [x] 1.1 Añadir `OTHER_PROVIDER_NOTE` a `test/msw/import-fixtures.ts` con el texto exacto de `backend/src/modules/imports/domain/channel-notice.ts`. En `analyze()` de `test/msw/imports.ts`, marcar con `otherProvider: true` y esa nota cada canal `outOfScope` o de otro proveedor que la cuenta del import. Añadir a `test/msw/imports.test.ts` un caso que lo compruebe: `batch-blocked` en `ProviderB-Main` da RAM-01 con `otherProvider` y la nota ajena, y `batch-clean` ningún `otherProvider`. Verificar que el caso falla antes del cambio y pasa después
- [x] 1.2 Corregir los fixtures escritos a mano de `AnalysisStep.test.tsx` (canal oculto con `otherProvider` y nota ajena; RAM-03 con la nota de cuenta principal), y sembrar `legacy-provider` en `ProviderC-Alt` en "does not appear when every channel is assigned". Verificar con `pnpm --filter frontend test`: la suite entera, incluidos validations y settlements. Si falla algún test de esas dos carpetas, parar y avisar sin tocarlo
- [x] 1.3 Commit: `test(web): el fake del análisis marca los canales de otro proveedor como el API`

## 2. Desglose y aviso de cuenta equivocada en los contadores (D1, D2)

- [x] 2.1 Tests primero, en `analysis/Counters.test.tsx` nuevo (spec "Resultado del análisis: filas sin asociar por motivo" y "aviso de cuenta equivocada"):
  - `seedImport('batch-clean', { unmatched: 'id_format' })`: dentro de la sección `Unmatched`, un solo `listitem` `ID does not fit any gateway` con el mismo número que la tarjeta;
  - `batch-issues`: solo `No match 1`;
  - una fila `no_match` y otra `id_format`: los dos en ese orden, sin motivos en 0;
  - `batch-clean`: sin lista;
  - el aviso `Wrong account?` con el texto literal de D2, para `analyst`, para `viewer` y en un import cancelado;
  - sin el aviso con `no_match` y con `batch-clean`.

  Verificar que fallan
- [x] 2.2 Commit: `test(web): desglose de no asociadas y aviso de cuenta equivocada en Analysis`
- [x] 2.3 Implementar D1 y D2 en `Counters.tsx` y `strings.ts` (`analysis.counters.byReason`, `wrongAccountLabel`, `wrongAccount`). Verificar con el comando de la carpeta, `pnpm lint` y `pnpm typecheck`. Romper a propósito el orden de los motivos una vez y comprobar que el test falla
- [x] 2.4 Commit: `feat(web): desglose de no asociadas por motivo y aviso de cuenta equivocada en Analysis (#131)`

## 3. Canales de otro proveedor (D3, D4)

- [x] 3.1 Tests primero, en `analysis/ChannelNotice.test.tsx` nuevo (spec "Resultado del análisis: canal de otro proveedor" y el requisito modificado del aviso de canales):
  - `batch-blocked` en `ProviderB-Main`: el `listitem` de RAM-01 dice `RAM-01 belongs to another provider`, `1 row` y la nota ajena, lleva `data-other-provider` y no contiene `is primary in`, `is not assigned yet` ni `will become`;
  - el canal oculto: `Channel 2001 (another merchant)` con su nota, sin datos del otro merchant;
  - un canal `otherProvider` y `assigned`: el aviso aparece;
  - RAM-03 del mismo proveedor: `RAM-03 is primary in ProviderA-EUR`.

  Mover a este archivo los casos del aviso de canales de `AnalysisStep.test.tsx` y dejar allí solo el montaje del paso. Verificar que los nuevos fallan
- [x] 3.2 Commit: `test(web): canales de otro proveedor en el aviso de canales`
- [x] 3.3 Implementar D3 y D4 en `ChannelNotice.tsx` y `strings.ts` (`analysis.channels.otherProvider`). Verificar con el comando de la carpeta, `pnpm lint` y `pnpm typecheck`
- [x] 3.4 Commit: `feat(web): el aviso de canales distingue los canales de otro proveedor (#131)`

## 4. Capturas (D7)

- [x] 4.1 Escribir `e2e/screenshots/web-analysis-guardrails.ts` y su script `screenshots:web-analysis-guardrails` en `e2e/package.json` y en el `package.json` raíz. Verificar con `pnpm --filter e2e typecheck` y `pnpm lint`, sin ejecutarlo
- [x] 4.2 Commit: `chore(e2e): script de capturas de web-analysis-guardrails`
- [ ] 4.5 (D8, tras la primera pasada de la 4.3: la tabla de filas desbordaba 79 px a 1024 px con los IDs UUID de `batch-wrong-account`) Tests primero, en `analysis/RowsTable.test.tsx` (spec "Resultado del análisis: ID con guiones en la tabla de filas"):
  - un UUID: su `<span>` es `whitespace-normal`, sin `overflow-wrap` ni `break-all`, con `innerHTML` `df14616d-<wbr>4b26-<wbr>4ffb-<wbr>9984-<wbr>72717ebff6a6` y el texto entero;
  - un ID de 17 cifras: `whitespace-nowrap` y sin `<wbr>`.

  Verificar que el primero falla. Commit: `test(web): un ID con guiones se parte solo por los guiones en la tabla de filas`
- [ ] 4.6 Implementar D8 en `RowsTable.tsx`. Verificar con el comando de la carpeta, `pnpm lint` y `pnpm typecheck`. Romper a propósito el `<wbr>` una vez y comprobar que el test falla. Añadir al script de capturas la comprobación de que a 1280 px cada ID de la tabla de filas cabe en una línea. Commit: `fix(web): los IDs con guiones se parten por los guiones y la tabla de filas cabe a 1024 px (#131)`
- [ ] 4.3 **Con turno de base de la persona** (ella levanta `pnpm db:up`, `pnpm db:seed` y `pnpm dev`), ejecutar `pnpm screenshots:web-analysis-guardrails`. Verificar:
  - que todas las medidas dicen `fits` a 1280 y 1024 px, incluida la tabla de filas (#132);
  - que la captura de `batch-wrong-account` muestra `Unmatched 12` e `ID does not fit any gateway 12` (de `expected.json`) y el aviso;
  - que la de `batch-blocked` muestra `RAM-01 belongs to another provider` con la nota ajena;
  - que los dos imports quedan `cancelled`;
  - las seis capturas, mirándolas una a una.
- [ ] 4.4 Añadir la sección de `web-analysis-guardrails` a `docs/wireframes/README.md`. Commit: `docs(web): capturas de web-analysis-guardrails a 1280 y 1024 px (#131)`

## 5. PR

- [x] 5.1 Issues de seguimiento abiertos y anotados en el design: #139 (unificar el texto de cuenta equivocada, D2) y #140 (canal sin principal mostrado como de otro merchant). Va en el commit de la tarea 1.3
- [ ] 5.2 Push y PR hacia `feature/entrega-3-MVP` con la plantilla, "Closes #131", las medidas y las capturas. Vigilar el CI con `gh --jq` hasta que esté verde

## Workflow follow-up

- Review-diff en una sesión nueva.
- `/opsx:archive web-analysis-guardrails` después del merge.
