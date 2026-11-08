# Proposal

## Why

La revisión visual de la pantalla Analysis (#157) encontró tres problemas de presentación. La tarjeta de rangos sale pegada a la izquierda con un hueco grande a su derecha. Los tres contadores informativos de Validations son texto suelto, y sus explicaciones de dos líneas alargan la cabecera. Y en la tabla de filas, el nombre del archivo se parte en cuatro líneas en cada fila, así que la tabla se hace muy larga. Cada uno contradice una frase de las specs vivas, así que hay que cambiar la spec antes que el código. El plazo es el congelado de código del lunes 9-nov a las 18:00.

## What Changes

- **Tarjeta de rangos centrada.** `Date ranges used by the validations` queda centrada horizontalmente en la sección Validations y conserva el ancho de su contenido. Revierte la alineación a la izquierda de `ui-polish` D9; el resto de D9 sigue igual.
- **Contadores en tarjetas.** `Pending in range`, `Undated adjustments` y `Undated candidates` pasan a tarjetas con el marco de las de `Counters` (`Rows read`, `Matched`…): etiqueta pequeña atenuada y número grande. Van en tres columnas desde `sm` y en una por fila en pantallas estrechas. Nunca cambian de tono, aunque el valor sea mayor que 0. El marco se extrae a un componente común en vez de copiar clases.
- **Explicación en un tooltip.** La explicación de cada contador pasa a un tooltip, detrás de un botón de información junto a la etiqueta. Los textos son los de hoy. El botón se alcanza con teclado y tiene nombre accesible (`About Pending in range`), y la explicación queda asociada para lectores de pantalla aunque el tooltip esté cerrado. La explicación está una sola vez en la tarjeta: el texto que describe el botón es el mismo que se lee al recorrer la tarjeta. La nota "ninguno es un hallazgo" sigue visible. Es el primer uso de `components/ui/tooltip`. Revierte `ui-polish` D10 (explicación a la vista; el tooltip era su alternativa descartada).
- **Archivo en una línea en la tabla de filas.** En la columna `Sheet · file`, la primera línea sigue siendo `APP · row 2`. Debajo va el nombre entero del archivo en una sola línea, que puede pasar por debajo de las columnas vecinas sin pisar su texto (ni un UUID partido, ni una hoja larga, ni las candidatas y los botones **Choose** de una fila ambigua), con el nombre completo como tooltip. Un nombre más largo que la fila se corta con "…". La tabla sigue cabiendo a 1024 px (#132). Revierte `ui-polish` D7 y el commit `91b1f7c` del #132, que partieron el nombre en líneas. Siguen vigentes el ancho fijo de la columna, la hoja larga partida dentro de ese ancho (`web-rows-table-compact` D3) y el ID con guiones partido solo por los guiones (`web-analysis-guardrails` D8).
- **Capturas.** Un script nuevo de capturas a 1280 y 1024 px mide el desborde de la página y de cada tabla, y además el centrado, el archivo en una línea y que no pise otras columnas.

Fuera de alcance: mostrar el archivo una sola vez cuando el import tiene un solo archivo (no se hace), las columnas nuevas de la tabla de rangos (#86, #87), la unificación general de componentes de #90 (más allá del marco de tarjeta) y cualquier cambio de API, esquema o datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `validation`: MODIFIED "Pantalla Analysis & Validations: cabecera de la corrida" (tarjeta de rangos centrada, contadores en tarjetas y explicación fuera de la vista). ADDED "Pantalla Analysis & Validations: tarjetas de la cabecera" y "Pantalla Analysis & Validations: explicación de los contadores en un tooltip".
- `import`: MODIFIED "Resultado del análisis: tabla de filas" (el archivo en una línea y no partido). ADDED "Resultado del análisis: archivo en una línea en la tabla de filas" (no pisa otras columnas, se corta con "…" y la tabla sigue cabiendo a 1024 px).

## Impact

- Frontend:
  - `components/DateRangesTable.tsx`
  - `features/validations/RunHeader.tsx` y su `strings.ts` (etiqueta del botón)
  - `features/imports/analysis/Counters.tsx` y `RowsTable.tsx`
  - un componente nuevo para el marco de tarjeta y otro para el botón de información con tooltip, en `components/`
  - tests: `DateRangesTable.test.tsx`, `ValidationsSection.test.tsx`, `RowsTable.test.tsx` y los de los componentes nuevos
- E2E: `e2e/screenshots/web-analysis-polish.ts`, su script en los `package.json` y las capturas en `docs/wireframes/web-analysis-polish/`.
- Sin cambios de API, esquema, datos sembrados, colección Bruno ni dependencias: `radix-ui` ya está instalado.
