# Tasks

## 1. TK-15 · API de resumen y listados con filtros y paginación

- [ ] 1.1 Implementar `GET /reconciliations/{id}/pos-transactions` y `GET /reconciliations/{id}/bank-movements` con filtros (estado, fechas, monto, marca) y paginación
- [ ] 1.2 Implementar `GET /reconciliations/{id}/matches` con filtros (método, estado) e inclusión de las transacciones de cada lado
- [ ] 1.3 Exponer `stats` en el detalle de la conciliación con el esquema fijo y añadir `recomputeStats` con agregaciones SQL
- [ ] 1.4 Tests de integración de los tres listados: filtros, paginación, aislamiento por empresa

## 2. TK-16 · Panel de resultados con KPIs y pestañas

- [ ] 2.1 Implementar `KpiCards` (totales, porcentaje conciliado, pendientes por lado, propuestas, excepciones, diferencia total)
- [ ] 2.2 Implementar pestañas Conciliadas, Pendientes POS, Pendientes banco, Propuestas y Excepciones con contadores
- [ ] 2.3 Implementar `DataTable` reutilizable con paginación en servidor, filtros por fecha, monto, marca y método, y detalle expandible (fila original, datos del cruce)
- [ ] 2.4 Botones Confirmar / Rechazar en la pestaña Propuestas (versión básica; la tarjeta enriquecida llega en `ai-match-suggestions`)
- [ ] 2.5 Tests de componentes: KPIs con y sin ejecución, cambio de pestaña, filtros

## 3. TK-17 · Conciliación manual y deshacer cruce (API + UI)

- [ ] 3.1 Añadir columna `active` a `match_items` e índices únicos parciales por transacción POS y por movimiento bancario (migración)
- [ ] 3.2 Implementar `MatchesService.createManual` en transacción: validación de pendientes y exclusividad, cálculo de totales y diferencia, cruce MANUAL CONFIRMED, estados MATCHED, `recomputeStats`
- [ ] 3.3 Implementar `MatchesService.confirm` y `reject` para cruces PROPOSED (`PATCH /matches/{matchId}`) y `undo` (`DELETE /matches/{matchId}`) con reposición a PENDING y rechazo en CLOSED
- [ ] 3.4 Registrar usuario y fecha en `createdById` / `confirmedById` y preparar el gancho de auditoría (lo completa `exception-management-and-audit`)
- [ ] 3.5 Tests de integración: cruce N:1 con diferencia, 409 por transacción ocupada, concurrencia (dos peticiones simultáneas), deshacer automático y manual, confirmar y rechazar propuesta, rechazo en CLOSED
- [ ] 3.6 Frontend: `ManualMatchView` con dos tablas con selección múltiple, `DifferenceBar` en vivo, diálogo de confirmación si diferencia ≠ 0, campo de nota
- [ ] 3.7 Frontend: acción Deshacer en cada cruce de la pestaña Conciliadas con confirmación e invalidación de listados y KPIs
- [ ] 3.8 Tests de componentes: sumas y diferencia en vivo, botón deshabilitado sin selección en un lado, flujo de confirmación

## 4. Cierre del change

- [ ] 4.1 Registrar la PR en readme §7 y los prompts relevantes en prompts.md
