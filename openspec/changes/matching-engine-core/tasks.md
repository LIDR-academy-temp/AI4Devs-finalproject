# Tasks

## 1. TK-12 · Motor de conciliación: pipeline de estrategias + nivel 1 (exacto)

- [x] 1.1 Definir tipos de dominio en `matching/engine/types.ts` (`PosTxn`, `BankMov`, `UnmatchedPool`, `MatchCandidate`, `ReconciliationConfig`) usando decimal.js para montos
- [x] 1.2 Implementar `MatchingEngine` que ejecuta estrategias en orden y retira del pool las transacciones cruzadas
- [x] 1.3 Modelo `StoreMapping` (migración), servicio y endpoints `GET/PUT /store-mappings` (carga Excel que reemplaza, filtrado por `companyId`) y normalizador de clave (`D001004` → `1004`)
- [x] 1.3b Implementar `ExactStrategy` con índice `Map` por `bankStoreCode|lote|referencia`, verificación de monto bruto y bloqueo por ambigüedad
- [x] 1.4 Implementar generación de explicación y confianza por cruce
- [x] 1.5 Tests unitarios: pipeline (exclusión entre niveles), exacto único, local sin mapear, sin lote/referencia, mismo clave con monto distinto, clave duplicada, dataset sintético exacto al 100 % sin falsos positivos
- [x] 1.6 Test de rendimiento: 10.000 × 10.000 en menos de 2 s

## 2. TK-13 · Motor nivel 2: tolerancia de fechas y monto neto esperado

- [x] 2.1 Implementar `computeExpectedNet(gross, feePercent, withholdingPercent)` con decimal.js y tests (2 %/1 %, 0 %, redondeos)
- [x] 2.2 Implementar `ToleranceStrategy`: índice por monto, búsqueda de bruto y neto en la ventana `[fecha, fecha + ventana]`, exclusión de movimientos anteriores a la venta
- [x] 2.3 Implementar la regla de confirmación: CONFIRMED solo con candidato único en ambos lados y `cardLast4` coincidente; resto PROPOSED con confianza según desfase
- [x] 2.4 Tests unitarios: dentro/fuera de ventana, movimiento anterior, neto dentro/fuera de tolerancia, único con/sin últimos 4, montos repetidos sin confirmación
- [x] 2.5 Medir precisión y cobertura por escenario con `samples/standard`, `expected.json` y los archivos de `docs/archivos_ejemplo`; registrar resultados en readme §2.6
- [x] 2.6 Actualizar readme §1.2 con la regla adoptada para el nivel 2 (decisión abierta nº 1 del PRD)

## 3. TK-14 · Ejecución asíncrona, persistencia transaccional y estadísticas

- [x] 3.1 Implementar `POST /reconciliations/{id}/run` con DTO de parámetros opcionales, validación de precondiciones (archivos importados, estado) y respuesta 202
- [x] 3.2 Implementar `ReconciliationRunner`: carga de transacciones PENDING/PROPOSED automáticas, conversión a tipos de dominio, invocación del motor
- [x] 3.3 Implementar persistencia en transacción: limpieza de cruces automáticos no aceptados, reposición a PENDING, inserción de `matches` y `match_items`, actualización de estados
- [x] 3.4 Implementar cálculo de `stats` con el esquema fijo y transición a COMPLETED; ante error rollback, FAILED y `stats.error`
- [x] 3.5 Recuperación al arrancar: conciliaciones en PROCESSING pasan a FAILED como "interrumpida"
- [x] 3.6 Tests de integración: 422 sin archivos, 409 en PROCESSING, ejecución completa con dataset sintético, fallo sin cruces parciales, re-ejecución conservando manuales y cambiando parámetros
- [x] 3.7 Frontend: botón "Ejecutar" con diálogo de parámetros, sondeo del estado cada 2 s, indicador de progreso y mensaje de error en FAILED

## 4. Cierre del change

- [ ] 4.1 Registrar la PR en readme §7 y los prompts relevantes en prompts.md
