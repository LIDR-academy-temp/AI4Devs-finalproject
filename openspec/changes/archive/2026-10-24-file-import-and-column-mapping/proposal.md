# Proposal

## Why

Todo el valor de Concilia empieza por leer correctamente dos archivos que vienen de sistemas distintos, con columnas, formatos de fecha y separadores decimales diferentes. Si la importación falla o normaliza mal, el motor cruza basura. Este change construye la entrada de datos completa del flujo principal (HU-03, HU-04, HU-05 sin IA; PRD RF-09..RF-15 y RF-18..RF-21).

## What Changes

- Subida de archivos CSV y XLSX (máx. 10 MB) a una conciliación, indicando si es POS o banco; detección de duplicados por hash; almacenamiento del archivo original.
- Vista previa de las primeras 20 filas con las cabeceras detectadas, para que el usuario mapee cada columna a un campo estándar de Concilia.
- Importación: aplicación del mapeo, normalización de fechas, montos, textos y tarjetas, descarte de débitos en extractos bancarios, inserción masiva y reporte de filas rechazadas con motivo sin bloquear el proceso.
- Interfaz del asistente (pasos 2 y 3): carga de archivo, vista previa, selector de campo por columna y resumen de importación.
- La sugerencia de mapeo por IA queda para `ai-column-mapping-suggestions` (E3): el selector arranca vacío.

## Capabilities

### New Capabilities
- `file-import`: recepción, validación y vista previa de archivos, mapeo de columnas a campos estándar e importación de filas con reporte de errores.
- `data-normalization`: conversión de los valores crudos (fechas, montos, textos, números de tarjeta) al formato interno con el que trabaja el motor.

### Modified Capabilities
<!-- ninguna -->

## Impact

- **HU:** HU-03, HU-04, HU-05 (criterios E2). **Tickets:** TK-08, TK-09, TK-10, TK-11. **RF:** RF-09..RF-15, RF-18..RF-21. **RNF:** RNF-01 (5.000 filas < 10 s), RNF-06 (sin PAN), RNF-07 (validación de archivos), RNF-10 (importación transaccional).
- **Endpoints:** `POST /reconciliations/{id}/files`, `GET /files/{fileId}/preview`, `POST /files/{fileId}/import` (readme §4.1, §4.2).
- **Código:** `apps/api/src/imports/` (parser, mapeo, normalizadores), almacenamiento de archivos, `apps/web/src/features/imports/`.
- **Tablas:** `imported_files`, `pos_transactions`, `bank_movements` (readme §3).
- **Dependencias nuevas:** `multer`, `xlsx` (SheetJS), `csv-parse`, `decimal.js`, `date-fns`.
- Depende de `reconciliation-management`.
