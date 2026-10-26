# Spec Delta

## Purpose
Permite medir de forma objetiva la precisión y la cobertura del motor de conciliación con pares de archivos POS/banco cuyo resultado correcto se conoce de antemano.

## ADDED Requirements

### Requirement: Generación de pares POS/banco con casos controlados
El generador SHALL producir, para cada escenario solicitado, un archivo de ventas POS y un extracto bancario en formato CSV y XLSX que contengan únicamente casos de ese escenario.

#### Scenario: Escenarios disponibles
- **WHEN** se solicita la lista de escenarios
- **THEN** incluye al menos: cruces exactos, desfase de fechas, depósitos por lote, depósitos netos de comisión y retención, duplicados y transacciones huérfanas en cada lado

#### Scenario: Dataset estándar mixto
- **WHEN** se genera el dataset estándar
- **THEN** combina todos los escenarios en proporciones documentadas y suma al menos 1.000 ventas POS

### Requirement: Resultado esperado verificable
Cada dataset generado SHALL ir acompañado de un archivo de resultado esperado que indique, para cada venta y cada movimiento, con qué contraparte debe cruzar y mediante qué nivel, o que no tiene contraparte.

#### Scenario: Cálculo de métricas
- **WHEN** se comparan los cruces producidos por el motor con el resultado esperado
- **THEN** es posible calcular precisión (cruces correctos sobre cruces realizados) y cobertura (transacciones cruzadas sobre total) por escenario

### Requirement: Datos sintéticos sin información sensible
Los datasets SHALL contener únicamente datos ficticios: nunca números de tarjeta completos reales ni datos personales.

#### Scenario: Columna de tarjeta
- **WHEN** se inspecciona la columna de tarjeta del archivo POS generado
- **THEN** contiene valores enmascarados con solo los últimos 4 dígitos visibles

### Requirement: Generación reproducible
El generador SHALL producir el mismo dataset cuando se ejecuta con la misma semilla aleatoria.

#### Scenario: Misma semilla
- **WHEN** se ejecuta el generador dos veces con la misma semilla y los mismos parámetros
- **THEN** los archivos resultantes son idénticos
