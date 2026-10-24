# Spec Delta

## Purpose
Permite al analista resolver con criterio humano las partidas que el motor no pudo cruzar, y corregir cualquier cruce, manteniendo la misma trazabilidad que los cruces automáticos.

## ADDED Requirements

### Requirement: Selección con suma y diferencia en vivo
La vista de conciliación manual SHALL mostrar las ventas pendientes y los movimientos pendientes lado a lado, permitir seleccionar una o varias filas en cada lado y mostrar en todo momento la suma de cada lado y la diferencia.

#### Scenario: Selección múltiple
- **WHEN** el usuario selecciona tres ventas que suman 312,40 y un movimiento de 305,28
- **THEN** la barra muestra 312,40 a la izquierda, 305,28 a la derecha y diferencia −7,12

#### Scenario: Sin selección en un lado
- **WHEN** el usuario tiene seleccionadas filas solo en un lado
- **THEN** el botón de crear cruce está deshabilitado

### Requirement: Creación de un cruce manual
El sistema SHALL crear, a partir de al menos una venta y al menos un movimiento pendientes, un cruce de método MANUAL en estado CONFIRMED con la cardinalidad correspondiente, la diferencia calculada por el sistema, el usuario creador y una nota opcional.

#### Scenario: Cruce N:1 con diferencia
- **WHEN** el usuario confirma tres ventas contra un movimiento con nota "Depósito del lote 0452 neto de comisión"
- **THEN** se crea un cruce MANUAL, MANY_TO_ONE, CONFIRMED con la diferencia calculada y las cuatro transacciones pasan a MATCHED

#### Scenario: Diferencia distinta de cero
- **WHEN** las sumas de ambos lados no coinciden
- **THEN** el sistema pide confirmación mostrando la diferencia y, si el usuario confirma, crea el cruce con esa diferencia

#### Scenario: Nota demasiado larga
- **WHEN** la nota supera 500 caracteres
- **THEN** se rechaza indicando el límite

### Requirement: Exclusividad de las transacciones
El sistema MUST rechazar la creación de un cruce que incluya una transacción que ya pertenezca a otro cruce en estado CONFIRMED o PROPOSED.

#### Scenario: Transacción ya cruzada
- **WHEN** el usuario intenta incluir una venta que ya está en un cruce confirmado
- **THEN** la operación se rechaza indicando qué transacción está ocupada y ningún cruce se crea

#### Scenario: Concurrencia
- **WHEN** dos usuarios intentan cruzar la misma venta al mismo tiempo
- **THEN** solo uno de los cruces se crea y el otro recibe el rechazo

### Requirement: Deshacer un cruce
El sistema SHALL permitir deshacer cualquier cruce de una conciliación no cerrada; sus transacciones vuelven a PENDING y la acción queda registrada con usuario y fecha.

#### Scenario: Deshacer cruce automático
- **WHEN** el usuario deshace un cruce de nivel exacto
- **THEN** la venta y el movimiento vuelven a PENDING, el cruce deja de aparecer en Conciliadas y los indicadores se recalculan

#### Scenario: Conciliación cerrada
- **WHEN** el usuario intenta deshacer un cruce de una conciliación en CLOSED
- **THEN** la operación se rechaza

### Requirement: Confirmar o rechazar una propuesta
El sistema SHALL permitir confirmar o rechazar un cruce en estado PROPOSED; al confirmar pasa a CONFIRMED con el usuario que lo confirmó, y al rechazar pasa a REJECTED y sus transacciones vuelven a PENDING.

#### Scenario: Confirmar propuesta
- **WHEN** el usuario confirma una propuesta del nivel de tolerancia
- **THEN** el cruce pasa a CONFIRMED con su nombre y fecha de confirmación y las transacciones pasan a MATCHED

#### Scenario: Rechazar propuesta
- **WHEN** el usuario rechaza una propuesta
- **THEN** el cruce pasa a REJECTED, las transacciones vuelven a PENDING y el mismo cruce no vuelve a proponerse en esa conciliación

### Requirement: Recálculo de indicadores
Toda creación, confirmación, rechazo o anulación de un cruce SHALL recalcular los indicadores de la conciliación.

#### Scenario: Tras un cruce manual
- **WHEN** el usuario crea un cruce manual de dos ventas
- **THEN** el porcentaje conciliado y los pendientes reflejan el cambio de inmediato
