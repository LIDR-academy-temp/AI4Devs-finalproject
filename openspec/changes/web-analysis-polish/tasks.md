# Tasks — web-analysis-polish

En la rama `feat/web-analysis-polish` (#157), con PR hacia `feature/entrega-3-MVP`. Solo frontend, e2e y docs: no se tocan el backend, `packages/shared`, el contrato, el esquema, los datos sembrados ni la colección Bruno. Sin migración ni seed.

Comando de tests del frontend: `pnpm --filter frontend test <ruta>` (`pnpm --filter frontend exec vitest run` no encuentra `vitest` en esta máquina). La suite entera: `pnpm --filter frontend test`.

## 1. Marco de tarjeta común (D2)

- [x] 1.1 Tests primero, en `components/StatCard.test.tsx`:
  - la tarjeta es una `region` con el nombre de su etiqueta;
  - muestra la etiqueta y el valor;
  - el hueco `info` sale junto a la etiqueta;
  - sin `tone` no tiene `data-state`;
  - con `tone="warning"` tiene `data-state="warning"`;
  - `size="compact"` no cambia el nombre ni el valor.

  Verificar que fallan (el módulo no existe).
- [x] 1.2 Commit: `test(web): marco de tarjeta común para los contadores`
- [x] 1.3 Implementar `components/StatCard.tsx` y pasar las seis tarjetas de `features/imports/analysis/Counters.tsx` a usarlo, sin cambiar lo que pintan. Verificar:
  - pasan `StatCard.test.tsx` y, sin tocarlos, `Counters.test.tsx` y `AnalysisStep.test.tsx` (`pnpm --filter frontend exec vitest run src/components src/features/imports/analysis`);
  - `pnpm lint` y `pnpm typecheck`.
- [x] 1.4 Commit: `refactor(web): las tarjetas de Counters usan el marco común StatCard`

## 2. Botón de información con tooltip (D4)

- [x] 2.1 Tests primero, en `components/InfoTip.test.tsx`, con `user-event`:
  - Tab llega a un botón con el nombre `About Pending in range`;
  - al recibir el foco, `getByRole('tooltip')` tiene la explicación;
  - Escape lo cierra y `document.activeElement` sigue siendo el botón;
  - `hover` lo abre;
  - con el tooltip cerrado, el botón tiene la explicación como descripción accesible (`toHaveAccessibleDescription`).

  Verificar que fallan.
- [x] 2.2 Commit: `test(web): botón de información con tooltip accesible con teclado`
- [x] 2.3 Implementar `components/InfoTip.tsx` (primer uso de `components/ui/tooltip`, con `TooltipProvider` local e icono `Info` de `lucide-react`). Verificar que pasa `InfoTip.test.tsx`.
- [ ] 2.4 Rotura deliberada, para anotarla en el PR:
  1. quitar el `aria-describedby` propio y poner `tabIndex={-1}` en el botón;
  2. comprobar que fallan los tests de descripción y de teclado;
  3. restaurar con `cp` desde una copia en el scratchpad, nunca con `git checkout`.
- [ ] 2.5 Commit: `feat(web): botón de información con tooltip (InfoTip)`

## 3. Cabecera de Validations: rangos centrados y contadores en tarjetas (D1, D3)

- [ ] 3.1 Tests primero:
  - **`components/DateRangesTable.test.tsx`**: la tarjeta tiene `mx-auto` y conserva `w-fit`. Se sustituye la aserción de alineación a la izquierda.
  - **`features/validations/ValidationsSection.test.tsx`**, con `batch-issues`:
    - el helper `counters()` lee cada contador por su `region` (`Pending in range`, `Undated adjustments`, `Undated candidates`): el valor y la descripción accesible de su botón `About …`, que es la explicación de hoy;
    - ninguna tarjeta tiene `data-state`, tampoco `Undated adjustments 1`;
    - el texto de cada explicación aparece una sola vez dentro de su región, con el tooltip cerrado y abierto (`within(region).getAllByText(...)` con longitud 1);
    - la nota `Informative: none of them is a finding.` está a la vista;
    - Tab hasta `About Pending in range` muestra el tooltip, y Escape lo cierra con el foco en el botón;
    - con `batch-blocked`, siguen sin aparecer los rangos.

  Verificar que fallan.
- [ ] 3.2 Commit: `test(web): rangos centrados y contadores de Validations en tarjetas con tooltip`
- [ ] 3.3 Implementar:
  - `mx-auto` en `DateRangesTable`;
  - en `RunHeader`: rejilla `grid gap-3 sm:grid-cols-3` de `StatCard` sin tono, cada una con `InfoTip` en `info`, que trae el único `span` `sr-only` con la explicación (`RunHeader` no pinta otra copia); nota a la vista; `gap-4`;
  - `strings.header.about(label)` en `features/validations/strings.ts`.

  Actualizar los comentarios que citan `ui-polish` D9 y D10 para que remitan a este design. Verificar con `pnpm --filter frontend exec vitest run src/components src/features/validations`, `pnpm lint` y `pnpm typecheck`.
- [ ] 3.4 Correr la suite entera del frontend (`pnpm --filter frontend test`): los contadores dejaron de ser un `<dl>`. Si falla un test ajeno a este change, parar y avisar sin tocarlo.
- [ ] 3.5 Commit: `feat(web): rangos centrados y contadores de Validations en tarjetas con tooltip`

## 4. Archivo en una línea en la tabla de filas (D5)

- [ ] 4.1 Tests primero, en `features/imports/analysis/RowsTable.test.tsx`:
  - **"shows the sheet and row of each row in one line, then its whole file name"** (`batch-split`): el archivo tiene `absolute` y `truncate`, `title` igual a su texto, y no tiene `whitespace-normal` ni `[overflow-wrap:anywhere]`; su `<tr>` tiene `relative` y todas sus celdas tienen `pb-6`; la primera línea sigue siendo `APP · row 2`, con la hoja en su elemento;
  - **la fila con UUID y la fila con `Transactions approved by issuer`**: la misma estructura (archivo fuera de flujo, `relative` en la fila, `pb-6` en cada celda), y se conservan las aserciones de D3 y D8;
  - **una fila ambigua con candidatas y botón Choose** (`analyst`, import `analyzed`): `relative` en su `<tr>` y `pb-6` en todas sus celdas, también en la de `Result` con `AmbiguousCandidates`;
  - **la fila de cabecera**: su `<tr>` no tiene `relative` y ningún `columnheader` tiene `pb-6`.

  Verificar que fallan.
- [ ] 4.2 Commit: `test(web): el nombre del archivo de cada fila va en una línea al pie de la fila`
- [ ] 4.3 Implementar D5 en `RowsTable.tsx`: `relative` en la `TableRow` de las filas de datos del `tbody` (no en la de cabecera), `pb-6` en cada `TableCell` de esas filas, y el `span` del archivo con `absolute bottom-2 left-1.5 right-1.5 xl:left-2 xl:right-2 truncate` y `title`. Sustituir el comentario de la columna (D7, #132) por la razón de D5. Verificar con `pnpm --filter frontend exec vitest run src/features/imports`, `pnpm lint` y `pnpm typecheck`.
- [ ] 4.4 Commit: `fix(web): el nombre del archivo de cada fila en una sola línea sin pisar otras columnas`

## 5. Capturas a 1280 y 1024 px con la medida de desborde (D7)

- [ ] 5.1 Escribir `e2e/screenshots/web-analysis-polish.ts` a partir de `web-analysis-guardrails.ts`. **Tope: 90 minutos.**
  - **flujo**: `batch-issues` en `ProviderB-Main` (analizado y validado), `batch-wrong-account` y `batch-split` en `ProviderA-USD` (analizados), cada uno cancelado antes del siguiente;
  - **imprescindible**, por este orden:
    1. desborde de la página y de cada tabla;
    2. margen de la tabla de filas a 1024 px;
    3. el archivo en una línea, sin intersecar el texto de otras celdas y dentro del contenedor;
    4. la fila sintética en la página (hoja larga y nombre de 150 caracteres), cortada;
  - **capturas**: la cabecera, el tooltip abierto con teclado, las tablas y la fila ambigua interceptada (técnica de `web-ambiguous-rows.ts`) con el foco en su último **Choose**, a 1280×900 y 1024×768;
  - imprimir siempre las medidas 1 y 2;
  - **secundario**: el centrado ±1 px de la tarjeta de rangos y la misma `top` de las tres tarjetas. Si se pasa del tope, no se escriben: quedan como revisión a ojo en 5.4 y se anota en el PR.

  Añadir `screenshots:web-analysis-polish` a `e2e/package.json` y al `package.json` raíz. Verificar con `pnpm lint` y `pnpm typecheck`.
- [ ] 5.2 Commit: `test(e2e): script de capturas de web-analysis-polish con medidas de desborde`
- [ ] 5.3 Con `pnpm db:up` y `pnpm dev` levantados, la persona ejecuta en la sesión `! pnpm screenshots:web-analysis-polish`, para que la salida quede a la vista. Verificar que termina sin hallazgos y que deja 14 capturas en `docs/wireframes/web-analysis-polish/`: siete pantallas por dos anchos (cabecera, tooltip y filas de `batch-issues`; filas de `batch-wrong-account`; filas de `batch-split`, la fila sintética y la fila ambigua con el foco en **Choose**).
- [ ] 5.4 Revisar las capturas a ojo, a 1280 y a 1024 px:
  - rangos centrados y con el ancho de su tabla;
  - tres tarjetas en una fila, sin ámbar y separadas de los rangos y de la tabla de validaciones (si quedan pegadas a la tabla, ajustar el hueco y volver a 5.3);
  - tooltip legible;
  - filas de dos líneas con el nombre entero;
  - UUID y hoja larga sin pisar el archivo;
  - nombre largo con "…";
  - el anillo de foco del último **Choose** de la fila ambigua no tapa el nombre del archivo;
  - si las medidas secundarias de 5.1 no se escribieron: centrado de los rangos y tarjetas en una fila, a ojo.

  Anotar para el PR las medidas que imprimió el script: desborde de la página y de cada tabla, y el margen de la tabla de filas a 1024 px.
- [ ] 5.5 Commit: `docs(wireframes): capturas de web-analysis-polish a 1280 y 1024 px`

## 6. Verificación y PR

- [ ] 6.1 Correr `pnpm lint`, `pnpm typecheck`, `pnpm --filter frontend test` y `openspec validate web-analysis-polish --strict`, y comprobar que todo pasa. Comprobar también que no hay texto en español en `.ts` ni `.tsx` y que los textos de la interfaz están en inglés.
- [ ] 6.2 Commit: `fix(web): correcciones de la verificación de web-analysis-polish`, solo si la verificación obligó a cambiar algo.
- [ ] 6.3 Abrir el PR hacia `feature/entrega-3-MVP` con la plantilla. Debe incluir:
  - las capturas y las medidas de 5.4;
  - la rotura deliberada de 2.4;
  - qué medidas secundarias de 5.1 quedaron como revisión a ojo, si alguna;
  - la tabla "Qué decisiones anteriores cambian" del design;
  - el riesgo de `position: relative` en `<tr>`;
  - `Refs #157`, porque el issue se cierra a mano, ya que la rama no es la principal.

  Verificar que la CI está en verde.

## Workflow follow-up

- `/review-diff` lo pide la persona en otra sesión.
- Tras la fusión: cerrar #157 a mano, `/opsx:verify` y `/opsx:archive`.
