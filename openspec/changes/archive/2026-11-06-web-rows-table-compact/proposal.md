# Proposal — web-rows-table-compact

Issue #132. Solo frontend: ni el API ni el contrato cambian.

## Why

A 1024 px, la tabla de filas del paso Analysis no cabe en su tarjeta (167 px sin la fila ambigua y hasta 250 con ella). Con los textos partidos, anchos fijos para archivo y resultado, importe y moneda en una sola columna y menos relleno por debajo de `xl`, cabe, pero con solo 1 px de margen: cualquier nombre de gateway o importe algo más largo la vuelve a desbordar. Para tener margen hay que quitar una columna, y la spec enumera la fila como columna propia.

## What Changes

- El número de fila deja de ser una columna: va junto a la hoja, en la misma línea de la celda **Sheet · file** (`APP · row 2`), y el archivo sigue debajo.
- Importe y moneda van en una sola columna **Amount**, en una pieza que no se parte (`42.1000 USD`), con la moneda en gris. Ya está hecho en esta rama; la spec lo recoge.
- El requisito "Resultado del análisis: tabla de filas" se reescribe en menos de 500 caracteres con las dos cosas.
- El script `web-ambiguous-rows` lee la hoja de la nueva celda. Las capturas se versionan a 1280 y 1024 px, con al menos 20 px de margen a 1024.

**Fuera de alcance:** el orden y el contenido de las demás columnas, otras tablas y cualquier cambio en el backend.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `import`: el requisito "Resultado del análisis: tabla de filas" pone la fila con la hoja y el importe con su moneda.

## Impact

- **Frontend:** `features/imports/analysis/RowsTable.tsx` y su test, y `features/imports/strings.ts` (la columna `row` sale y entra el texto `· row N`).
- **Capturas:** `e2e/screenshots/web-ambiguous-rows.ts` (lectura de la hoja) y `docs/wireframes/web-ambiguous-rows/` con las capturas `-1024`.
- Va en la rama `fix/web-rows-table-1024`, en el mismo PR que cierra #132; se archiva tras el merge.
