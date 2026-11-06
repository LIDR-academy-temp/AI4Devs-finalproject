# Design — web-rows-table-compact

## Context

En la rama `fix/web-rows-table-1024` ya están hechos, con sus tests:

- el archivo se parte de verdad (`whitespace-normal`);
- anchos fijos `w-28` para el archivo y `w-24` para el resultado;
- importe y moneda en la columna **Amount**;
- relleno `px-1.5 xl:px-2` en cabeceras y celdas.

Con todo eso la tabla cabe a 1024 px en las cuatro pantallas de `web-ambiguous-rows`, pero con 1 px de margen. La columna **Row** mide unos 40 px con su relleno.

## Goals / Non-Goals

**Goals:** al menos 20 px de margen a 1024 px en las cuatro pantallas, sin partir cifras ni IDs.

**Non-Goals:** cambiar otras columnas o su orden, y medir otras tablas.

## Decisions

**D1. La fila va en la línea de la hoja.** La primera línea de la celda es la hoja en negrita seguida de `· row N` en gris (`APP · row 2`), en una pieza que no se parte. El archivo sigue debajo, como hasta ahora. La cabecera sigue siendo `Sheet · file`, porque la celda ya dice `row`. La hoja va en su propio elemento, para que el script de capturas siga leyéndola sin el número. Alternativa descartada: poner la fila debajo del archivo, porque añade una línea por fila a una tabla que ya es alta.

**D2. El margen se mide al verificar, no en el script.** El script sigue fallando con cualquier desborde. Los 20 px se comprueban una vez, con la medida temporal que ya se usó (el ancho `min-content` de la tabla frente a su tarjeta), y se anotan en el PR. No se versiona porque la medida dio cifras incoherentes sin la fila sintética. Fijar un umbral en el script lo haría frágil ante cambios ajenos a esta tabla.

**D3. Una hoja legacy larga se parte dentro del ancho fijo.** Los archivos legacy nombran sus hojas libremente, y Excel admite hasta 31 caracteres (`Transactions approved by issuer`). Con la primera línea sin partir, ese nombre no cabe en los 112 px de `w-28` y se pinta encima del ID, sin que la tabla gane scroll ni el script lo mida. El nombre de la hoja se parte (`whitespace-normal` y `break-words`), el espacio entre la hoja y su fila también es un punto de corte, y `· row N` va en su propio elemento con `whitespace-nowrap`, para que el número nunca se separe de `row`. Alternativa descartada: ensanchar la celda (`min-w-28`), porque con hojas largas la tabla volvería a desbordar a 1024 px, que es el #132. Hallazgo del review-diff de la #136.

## Risks / Trade-offs

- La fila ya no se puede leer de un vistazo por columna. Se compensa con que va pegada a la hoja, que es lo que la identifica.
- Si con D1 no se llega a 20 px, el siguiente paso sería estrechar más el archivo, y se discutiría antes de hacerlo.
