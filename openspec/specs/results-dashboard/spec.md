# results-dashboard Specification

## Purpose
Muestra al analista y al jefe financiero el estado de una conciliación: cuánto está conciliado, cuánto queda pendiente en número y monto, y el detalle de cada partida y cada cruce.

## Requirements

### Requirement: Indicadores principales
El panel SHALL mostrar para la conciliación: total de ventas POS y total de movimientos bancarios en número y monto, número y porcentaje de transacciones conciliadas, pendientes de cada lado en número y monto, propuestas, excepciones y diferencia total en monto.

#### Scenario: Conciliación ejecutada
- **WHEN** el usuario abre una conciliación en estado COMPLETED
- **THEN** ve las tarjetas con todos los indicadores calculados en la última ejecución

#### Scenario: Conciliación sin ejecutar
- **WHEN** el usuario abre una conciliación en DRAFT con archivos importados
- **THEN** ve totales de ventas y movimientos importados y los indicadores de cruce vacíos

### Requirement: Pestañas por estado
El panel SHALL organizar el detalle en pestañas Conciliadas, Pendientes POS, Pendientes banco, Propuestas y Excepciones, cada una con el número de elementos que contiene.

#### Scenario: Navegación por pestañas
- **WHEN** el usuario cambia a la pestaña Pendientes banco
- **THEN** ve únicamente movimientos bancarios en estado PENDING

#### Scenario: Contadores
- **WHEN** se crea un cruce manual
- **THEN** los contadores de Conciliadas y de Pendientes se actualizan sin recargar la página

### Requirement: Detalle de cada cruce
Cada cruce listado SHALL mostrar el nivel o método que lo generó, la confianza, la cardinalidad, los totales de cada lado, la diferencia, la explicación y, si aplica, quién lo creó o confirmó y cuándo.

#### Scenario: Cruce automático
- **WHEN** el usuario expande un cruce de nivel exacto
- **THEN** ve las transacciones de ambos lados, método EXACT, confianza 1,0 y diferencia 0

#### Scenario: Cruce manual
- **WHEN** el usuario expande un cruce manual
- **THEN** ve además el nombre del usuario que lo creó, la fecha y la nota

### Requirement: Filtros y paginación en los listados
Los listados de transacciones y de cruces SHALL admitir filtros por rango de fechas, rango de monto, marca de tarjeta y método de cruce, y SHALL estar paginados con tamaño de página configurable hasta 100.

#### Scenario: Filtro por monto
- **WHEN** el usuario filtra pendientes POS entre 100 y 200
- **THEN** solo aparecen ventas pendientes con monto en ese rango

#### Scenario: Filtro por método
- **WHEN** el usuario filtra conciliadas por método TOLERANCE
- **THEN** solo aparecen cruces generados por el nivel de tolerancia

#### Scenario: Paginación
- **WHEN** hay 2.500 ventas pendientes y el tamaño de página es 50
- **THEN** el usuario puede navegar 50 páginas y ve el total de elementos

### Requirement: Datos de cada transacción
Cada venta o movimiento listado SHALL mostrar fecha, monto, últimos 4 dígitos, marca, código de autorización, lote, referencia, estado y, bajo demanda, la fila original del archivo.

#### Scenario: Fila original
- **WHEN** el usuario abre el detalle de una venta pendiente
- **THEN** ve los valores de todas las columnas originales del archivo y el número de fila
