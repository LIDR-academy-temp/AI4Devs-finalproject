# Tasks

## 1. TK-08 · Endpoint de carga de archivos

- [x] 1.1 Crear `ImportsModule` e interfaz `FileStorage` con implementación en disco local
- [x] 1.2 Implementar `POST /reconciliations/{id}/files` con Multer: validación de extensión, MIME y tamaño (10 MB), `sourceType`, estado de la conciliación admitido
- [x] 1.3 Calcular SHA-256 y rechazar duplicados dentro de la misma conciliación (409 con el nombre del archivo existente)
- [x] 1.4 Registrar `imported_files` en estado UPLOADED con `totalRows` aproximado
- [x] 1.5 Tests de integración: formato inválido, tamaño excedido, duplicado, conciliación CLOSED, aislamiento por empresa

## 2. TK-09 · Parseo CSV/XLSX y vista previa

- [x] 2.1 Implementar `FileParser` con lectura de CSV (csv-parse, detección de delimitador) y XLSX (SheetJS, primera hoja)
- [x] 2.2 Implementar `GET /files/{fileId}/preview?headerRow=` devolviendo cabeceras, 20 filas y la lista de campos estándar según `sourceType`
- [x] 2.3 Aplicar enmascarado de PAN a la vista previa
- [x] 2.4 Tests unitarios del parser con archivos de `samples/` (CSV con `;` y `,`, XLSX con cabecera en fila 4)

## 3. TK-10 · Aplicación de mapeo, normalización y validación de filas

- [x] 3.1 Implementar normalizadores puros `parseDate`, `parseAmount`, `maskCard`, `normalizeText` con tablas de casos borde (fechas `dd/MM`/`MM/dd`, serie Excel, `1.234,56`/`1,234.56`, PAN completo, enmascarado, vacíos)
- [x] 3.2 Implementar DTO de importación `{ columnMapping, dateFormat, decimalSeparator, headerRow }` con validación de obligatorios (fecha, monto) y de campos repetidos
- [x] 3.3 Implementar `POST /files/{fileId}/import`: transformación fila a fila, descarte de débitos (por tipo o por signo), acumulación de errores `{ row, field, reason }`
- [x] 3.4 Inserción con `createMany` en lotes de 1.000 dentro de una transacción; en reimportación borrar antes las filas del mismo archivo; estado IMPORTED o FAILED
- [x] 3.5 Respuesta con `totalRows`, `validRows`, `errorRows`, `discardedDebits` y primeros 50 errores
- [x] 3.6 Tests de integración: importación mixta con errores, extracto con y sin desglose, débitos por signo y por columna, reimportación, fallo general sin filas parciales
- [x] 3.7 Test de rendimiento: 5.000 filas en menos de 10 s con el dataset sintético

## 4. TK-11 · UI de carga de archivos y mapeo de columnas

- [x] 4.1 Componente de carga con arrastrar y soltar, validación local de extensión y tamaño, y mensajes de error del servidor (formato, duplicado)
- [x] 4.2 Pantalla de vista previa con selector de fila de cabecera y tabla de 20 filas
- [x] 4.3 Selector de campo estándar por columna, selección de formato de fecha y separador decimal, validación de obligatorios y campos repetidos
- [x] 4.4 Pantalla de resumen de importación (totales, rechazadas, débitos descartados) con descarga de errores en CSV
- [x] 4.5 Integrar como pasos 2 (POS) y 3 (banco) del asistente de nueva conciliación y en el detalle de la conciliación
- [x] 4.6 Tests de componentes: validación de obligatorios, campos repetidos, resumen de errores

## 5. Cierre del change

- [ ] 5.1 Registrar la PR en readme §7 y los prompts relevantes en prompts.md
