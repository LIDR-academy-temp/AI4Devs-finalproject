# ADR-008 · Lector `.xlsx` propio que lee todo como texto

- **Estado:** Aceptado (Entrega 2, cambio de rumbo)
- **Decisores:** autor del proyecto, en el gate de `import-upload-mapping` (PR #33)

## Contexto

El README §2.2 preveía leer los archivos con SheetJS. Hay dos requisitos que mandan:

- **Los IDs nunca pasan por `number`.** Los numéricos tienen 15 o 16 dígitos, y por encima de 15 se pierde precisión.
- **Un archivo del usuario no puede agotar la memoria** al descomprimirse.

## Opciones consideradas

1. **SheetJS (`xlsx`).** La versión de npm (0.18.5) arrastra CVE-2023-30533 y CVE-2024-22363 sin corregir. Las versiones corregidas solo se distribuyen desde el CDN del fabricante, fuera del lockfile auditable.
2. **ExcelJS.** Convierte toda celda numérica a `number` y descomprime `sharedStrings.xml` entero sin tope.
3. **Un lector OOXML propio** sobre `fflate` (zip en streaming) y `saxes` (SAX), que solo entiende lo que la plantilla necesita.

## Decisión

Opción 3, con versiones exactas de `fflate` y `saxes`, y con una puerta de salida aprobada de antemano: si el lector no quedaba en verde contra las cinco muestras y un `.xlsx` guardado por Excel de escritorio, se volvía a ExcelJS más detección de precisión. Quedó en verde.

## Consecuencias

- Todas las celdas llegan como texto, tal cual están en el XML. Los importes pasan a `Decimal` desde ese texto. Si una celda ya llega con la precisión perdida, se detecta y se avisa, nunca se oculta.
- Hay límites propios de descompresión, columnas y filas. El review encontró una referencia de celda gigante (`ZZZZZ1`) que eludía el límite de columnas, y se corrigió en el PR.
- Son unas 300 líneas de código propio que hay que mantener, con sus tests.

## Referencias

`backend/src/modules/imports/infrastructure/xlsx/`; design de `import-upload-mapping` (D1, D2); README §7, tramo 2.
