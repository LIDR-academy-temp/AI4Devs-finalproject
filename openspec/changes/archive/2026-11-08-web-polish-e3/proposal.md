# Proposal

## Why

Cuatro arreglos pequeños de pantalla, pendientes de changes anteriores, que conviene cerrar antes de la entrega 3. Dos son errores visibles: valores inválidos de la dirección que llegan a la consulta del API (#110), y un canal sin cuenta principal que la pantalla atribuye a "otro merchant" (#140). Los otros dos son deuda de texto: una frase repetida en tres features (#139) y una etiqueta que dice "chargeback" cuando también la usan REF y RDR (#125).

## What Changes

- **#110, dirección inválida.** Settlement List, el espacio de trabajo del import (paso Analysis y lista de hallazgos) e In Progress descartan los valores inválidos de la dirección también en la consulta del API, como ya hace `/fees`. La dirección sigue llevando solo lo que está puesto. Ejemplos:
  - `/settlements?…&status=foo` pide la lista sin `status`;
  - `?match=weird` pide las filas sin `match`;
  - `?validation=foo` no pide hallazgos de `foo`;
  - en In Progress, `?status=cancelled` pide sin `status`.
- **#140, canal sin cuenta principal.** Cuando `channels` (Analysis) o `channelsToAssign` (Settlement Review) traen `assignment = "assigned_to_other_account"` con `otherAccount = null`, la pantalla deja de decir algo falso:
  - en Analysis dice `RAM-07 has no primary account`, en lugar de `… is primary in an account of another merchant`;
  - en Settlement Review dice `RAM-07 · no primary account`, en lugar de `… · primary account: another account`.

  La `note` del API no cambia, y el API tampoco.
- **#139, una sola frase de cuenta equivocada.** `The IDs do not fit any gateway of this account: the files may belong to another account.` pasa a estar definida una sola vez, en los textos de los componentes compartidos, y la usan Analysis, Settlement Review y el DecisionBar. El DecisionBar conserva aparte su frase de acción (`Cancel and reprocess under the right account.`). El texto que se ve no cambia.
- **#125, etiqueta de ajuste.**
  - La línea `reserve_early_released` pasa de **Reserve released on chargeback** a **Reserve released on adjustment** en tres sitios: la etiqueta del API (`payableBreakdown`), la fila del export `summary` y el desglose de la pantalla.
  - En el bloque de reservas del Settlement Summary y en la columna **Reserves** de Movements, `Released on chargeback` pasa a `Released on adjustment`.
  - **Cambia el CSV del summary que se entrega al merchant.** Cambia solo esa etiqueta, no las columnas, el orden ni los importes.
  - El nombre de la política (`release_on_chargeback`) y su etiqueta en Accounts (**Reserve policy on chargeback**) no cambian: renombrar la política exige una migración de la `CHECK`.

Fuera de alcance:
- `frontend/src/lib/format.ts`, los esquemas de `packages/shared` y las fechas, que son del #48. Ningún arreglo los necesita.
- Un valor nuevo de `assignment`, o un campo que diga "esta cuenta lo tuvo antes": tocaría el contrato de `shared`.
- Unificar los dos `EmptyBatchConfirmation` (de settlements y de validations).
- Volver a generar las capturas de changes ya archivados.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `settlement`:
  - la dirección inválida de Settlement List;
  - el canal sin cuenta principal en Settlement Review;
  - la etiqueta de la liberación por ajuste en el desglose del API, en el export `summary` y en el Settlement Summary (desglose, reservas y Movements).
- `import`:
  - el caso `otherAccount = null` en `channels` y su texto en el paso Analysis;
  - la dirección inválida de la tabla de filas y de In Progress.
- `validation`: la dirección inválida de la lista de hallazgos.

## Impact

- **Frontend:**
  - `features/settlements/list-search.ts` y `features/imports/validate-search.ts`;
  - `ChannelNotice.tsx` y `ChannelsToAssign.tsx`;
  - los `strings.ts` de `imports`, `settlements` y `validations`, y `components/strings.ts`;
  - las fixtures de MSW y los tests RTL de esas pantallas.
- **Backend:** solo dos etiquetas de texto del dominio (`payable-breakdown.ts` y `exports/summary-csv.ts`), con sus tests y `test-support/example-view.ts`. Sin cambios de API, esquema, migraciones ni seed.
- **Docs:**
  - el ejemplo de `payableBreakdown` de README §4;
  - tres capturas nuevas en `docs/wireframes/web-polish-e3/`, que necesitan turno de base pero no procesan nada.
- **Estimación:** unas 7 horas. Corte: si el domingo 2026-11-08 por la noche no está fusionado, lo que falte queda fuera, en este orden de prioridad: #110, #140, #125, #139.
