# Design

## Context

Existen conciliaciones y autenticación. El readme §2.2 fija SheetJS, csv-parse y Multer; §6.2 (TK-10) detalla los normalizadores puros y la inserción por lotes de 1.000; §3 define `imported_files`, `pos_transactions` y `bank_movements`. Este es el change con más superficie de E2 (16 SP).

## Goals / Non-Goals

**Goals:**
- Normalizadores puros con tests exhaustivos de casos borde; son la base de la calidad del motor.
- Nunca persistir un PAN completo, ni siquiera en `rawData`.
- Flujo del asistente completo: subir → previsualizar → mapear → importar → ver resumen.

**Non-Goals:**
- Sugerencia de mapeo por IA y plantillas reutilizables (changes de E3).
- Lectura de PDF, archivos > 10 MB, varias hojas por archivo.

## Decisions

1. **Normalizadores como funciones puras en `imports/normalizers/`** (`parseDate`, `parseAmount`, `maskCard`, `normalizeText`) sin dependencia de Nest. Alternativa descartada: lógica dentro del servicio; impide testearla con tablas de casos.
2. **Enmascarado antes de construir `rawData`:** el parser aplica `maskCard` a toda celda que parezca un PAN (13-19 dígitos, con o sin separadores) en cualquier columna, no solo en la mapeada. Alternativa descartada: enmascarar solo la columna mapeada; un PAN en una columna "observaciones" acabaría persistido.
3. **Almacenamiento de archivos en disco local bajo `storage/<companyId>/<fileId>`** con interfaz `FileStorage` para sustituir por S3 después. Alternativa descartada: guardar el binario en PostgreSQL; infla la BD y complica backups.
4. **Preview y mapeo desacoplados de la importación:** `GET /files/{id}/preview` acepta `headerRow` como query y devuelve cabeceras + 20 filas; `POST /files/{id}/import` recibe `{ columnMapping, dateFormat, decimalSeparator, headerRow }`. Alternativa descartada: inferir todo en la subida; el usuario necesita corregir la fila de cabecera.
5. **Streaming para CSV y lectura completa para XLSX** (SheetJS no hace streaming; 10 MB en memoria es aceptable). Inserción con `createMany` en lotes de 1.000 dentro de una transacción interactiva de Prisma; en reimportación se borran primero las filas del mismo `fileId`.
6. **Débitos:** si hay columna de tipo mapeada, se interpreta por lista de valores (`D`, `DEBITO`, `DÉBITO`, `CARGO`…); si no, por signo negativo. Alternativa descartada: pedir siempre la columna; muchos extractos no la tienen.
7. **Errores de fila en `imported_files.errors` como `[{ row, field, reason }]`**, respuesta con los primeros 50 y conteo total. Alternativa descartada: tabla propia de errores; sobredimensionado para el MVP.
8. **Frontend:** componente `FileDropzone`, tabla de previsualización con un `Select` por columna (campos estándar según `sourceType`), validación local de obligatorios y duplicados de campo, y pantalla de resumen de importación con descarga de errores en CSV.

## Risks / Trade-offs

- [Formatos de fecha ambiguos (05/03)] → el usuario elige el formato explícitamente y la previsualización muestra la fecha interpretada de la primera fila.
- [Archivos XLSX con celdas combinadas o totales al pie] → `headerRow` configurable y las filas sin fecha ni monto se rechazan sin bloquear.
- [Rendimiento con 10 MB de XLSX] → medir con el dataset sintético; si supera 10 s, mover la importación a ejecución asíncrona reutilizando el patrón del motor.
- [Falsos positivos del detector de PAN sobre referencias largas numéricas] → se enmascara igualmente; perder dígitos de una referencia es preferible a persistir un PAN. Documentar en la UI.

## Open Questions

- Lista definitiva de valores que identifican débito en la columna de tipo (empezar con una lista configurable por constante).
- **Archivos reales de ejemplo** (`docs/archivos_ejemplo/`, 1,0 y 1,6 MB; dentro del límite de 10 MB pero con 14.484 y 7.578 filas, por encima de las 5.000 de RNF-01: medir también con ellos):
  - POS (`Intranet_ejemplo.xlsx`, hoja `Detalle`): la columna `TARJETA` es en realidad el adquirente (DINERS, PRODUBANCO, GUAYAQUIL, PACIFICO), de modo que el archivo mezcla adquirentes; decidir si el mapeo permite un filtro por valor de columna (p. ej. solo DINERS) o si se importa todo. Sin código de autorización ni últimos 4 dígitos. Cabecera `AÑO` con encoding corrupto y textos con espacios de relleno (`normalizeText`).
  - Banco (`Liquidaciones_Diners_ejemplo.xlsx`, 42 columnas): fechas `yyyyMMdd`, tarjeta enmascarada con tabuladores, una fila por cuota (`Cuotas trasladadas`/`Total cuotas`), monto bruto (`Valor Bruto Cuota`) y neto (`Valor Pago Cuota`) con comisión y retenciones. No contiene débitos: el descarte por tipo/signo no se ejercita con este archivo.

## Decisiones tomadas durante la implementación

- **Código de local en el banco:** el cruce se hará por local + lote + referencia (decisión del usuario), así que `bank_movements` incorpora `store_code` y el campo estándar "Código de local" también está disponible para el extracto (el spec solo lo listaba para el POS). Migración `bank_store_code`.
- **Filas descartadas:** `imported_files.discarded_rows` registra los débitos descartados (no son errores). Migración `file_discarded_rows`.
- **Clave del mapeo:** `columnMapping` usa el índice de columna (base 0) como clave, no el nombre de cabecera, porque las cabeceras pueden estar vacías o repetidas.
- **Archivo con todas las filas inválidas:** queda en estado FAILED (con sus errores guardados) en lugar de IMPORTED con 0 filas.
- **Errores:** se guardan hasta 1.000 en `imported_files.errors`; la respuesta devuelve los 50 primeros y `GET /files/{id}` los guardados (el frontend los usa para el CSV).
- **SheetJS 0.20.3 desde el CDN oficial:** la versión de npm (0.18.5) está desactualizada y tiene vulnerabilidades conocidas; se procesan archivos subidos por usuarios.
- **Falsos positivos del detector de PAN:** cualquier secuencia de 13–19 dígitos contiguos (o separados por espacio o guion) se enmascara, también en columnas no mapeadas como tarjeta. Ejemplo real: la columna `DOCUMENTO` del POS (15 dígitos) queda enmascarada en `rawData`. Los montos con separador de miles (`1.234.567,89`) no se ven afectados.
- **Sin filtro por adquirente:** el POS de ejemplo mezcla adquirentes (columna `TARJETA`); se importa todo. Pendiente decidir si el mapeo admite un filtro por valor de columna (p. ej. solo DINERS).
- **Hora separada en el POS:** si el archivo trae la hora en otra columna (como el dataset sintético), no se combina con la fecha; la transacción conserva solo la fecha.
