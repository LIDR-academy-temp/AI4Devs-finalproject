# Spec Delta

## Purpose
Conecta el motor con la conciliación: comprueba que hay datos, ejecuta sin bloquear al usuario, guarda los resultados de forma atómica y calcula el resumen que ve el analista.

## ADDED Requirements

### Requirement: Precondiciones para ejecutar
El sistema SHALL permitir ejecutar una conciliación solo si tiene al menos un archivo POS y un archivo bancario importados y no está en estado PROCESSING ni CLOSED.

#### Scenario: Falta un archivo
- **WHEN** el usuario pulsa ejecutar en una conciliación sin extracto bancario importado
- **THEN** se rechaza indicando qué fuente falta y el estado no cambia

#### Scenario: Ejecución en curso
- **WHEN** el usuario pulsa ejecutar mientras la conciliación está en PROCESSING
- **THEN** se rechaza indicando que ya hay una ejecución en curso

### Requirement: Ejecución asíncrona con indicador de progreso
Al solicitar la ejecución el sistema SHALL responder de inmediato, pasar la conciliación a PROCESSING y ejecutar el motor fuera de la petición; el usuario SHALL ver un indicador de progreso hasta que termine.

#### Scenario: Inicio de ejecución
- **WHEN** el usuario pulsa ejecutar con las precondiciones cumplidas
- **THEN** recibe confirmación de inicio, la conciliación aparece en PROCESSING y la interfaz muestra un indicador de progreso

#### Scenario: Parámetros en la ejecución
- **WHEN** el usuario modifica la ventana de días o la tolerancia al ejecutar
- **THEN** la ejecución usa esos valores y quedan guardados como parámetros de la conciliación

### Requirement: Persistencia atómica de resultados
Los cruces, los cambios de estado de las transacciones y las estadísticas de una ejecución SHALL guardarse todos o ninguno.

#### Scenario: Ejecución correcta
- **WHEN** el motor termina sin errores
- **THEN** los cruces quedan guardados, las transacciones cruzadas pasan a MATCHED o PROPOSED, las estadísticas se actualizan y la conciliación pasa a COMPLETED

#### Scenario: Error durante la ejecución
- **WHEN** ocurre un error al ejecutar o al guardar
- **THEN** no queda ningún cruce parcial, la conciliación pasa a FAILED y el usuario ve el motivo

### Requirement: Estadísticas de la conciliación
Al terminar la ejecución el sistema SHALL calcular y guardar: total de ventas y de movimientos en número y monto, cruzadas por nivel, pendientes de cada lado, propuestas, excepciones, porcentaje conciliado y diferencia total en monto.

#### Scenario: Resumen tras ejecutar
- **WHEN** la ejecución termina
- **THEN** el detalle de la conciliación muestra el porcentaje conciliado y los totales por estado y nivel

#### Scenario: Porcentaje conciliado
- **WHEN** 900 de 1.000 ventas están en cruces confirmados
- **THEN** el porcentaje conciliado es 90 %

### Requirement: Re-ejecución conservando el trabajo humano
El sistema SHALL permitir volver a ejecutar una conciliación en COMPLETED o FAILED; los cruces automáticos anteriores SHALL recalcularse, mientras que los cruces manuales, las propuestas aceptadas y las excepciones SHALL conservarse.

#### Scenario: Re-ejecución tras cruces manuales
- **WHEN** el usuario creó dos cruces manuales y vuelve a ejecutar
- **THEN** los dos cruces manuales siguen existiendo y los automáticos se regeneran sin tocar sus transacciones

#### Scenario: Re-ejecución tras cambiar parámetros
- **WHEN** el usuario amplía la ventana de días y vuelve a ejecutar
- **THEN** las ventas antes pendientes que ahora entran en la ventana quedan cruzadas o propuestas

### Requirement: Registro de la ejecución
Cada ejecución SHALL registrar quién la lanzó, cuándo empezó, cuándo terminó y con qué parámetros.

#### Scenario: Consulta del historial
- **WHEN** el usuario consulta el detalle de una conciliación ejecutada
- **THEN** ve fecha de la última ejecución, quién la lanzó y los parámetros usados
