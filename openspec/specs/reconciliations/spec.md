# reconciliations Specification

## Purpose
Organiza el trabajo de cada cierre en conciliaciones con nombre, período y parámetros de cruce, y permite consultar su estado y avance.

## Requirements

### Requirement: Creación de una conciliación
El sistema SHALL permitir a un usuario autenticado crear una conciliación indicando nombre, fecha de inicio y fecha de fin; la conciliación nace en estado DRAFT y asociada a la empresa y al usuario creador.

#### Scenario: Datos válidos
- **WHEN** el usuario envía nombre, fecha de inicio y fecha de fin coherentes
- **THEN** se crea la conciliación en estado DRAFT con porcentaje conciliado vacío y aparece en el listado

#### Scenario: Nombre vacío
- **WHEN** el usuario envía la conciliación sin nombre o con nombre en blanco
- **THEN** se rechaza con un error de validación que identifica el campo

### Requirement: Validación del período
El sistema SHALL rechazar un período cuya fecha de fin sea anterior a la fecha de inicio.

#### Scenario: Fin anterior a inicio
- **WHEN** la fecha de fin es anterior a la fecha de inicio
- **THEN** se muestra un error de validación y no se crea la conciliación

#### Scenario: Período de un solo día
- **WHEN** la fecha de inicio y la de fin son iguales
- **THEN** la conciliación se crea correctamente

### Requirement: Parámetros del motor con valores por defecto
Cada conciliación SHALL almacenar sus parámetros de cruce: ventana de días (por defecto 3), tolerancia de monto (0,05), porcentaje de comisión (0), porcentaje de retención (0) y agrupación habilitada (sí); el usuario puede modificarlos al crearla.

#### Scenario: Parámetros omitidos
- **WHEN** el usuario crea la conciliación sin indicar parámetros
- **THEN** la conciliación guarda los valores por defecto

#### Scenario: Parámetros fuera de rango
- **WHEN** el usuario indica una ventana de días negativa, una tolerancia negativa o un porcentaje fuera de 0 a 100
- **THEN** se rechaza con un error de validación que identifica el parámetro

### Requirement: Listado de conciliaciones
El sistema SHALL listar las conciliaciones de la empresa del usuario mostrando nombre, período, estado, porcentaje conciliado y fecha de creación, ordenadas de la más reciente a la más antigua, con paginación y filtros por estado y por período.

#### Scenario: Listado por defecto
- **WHEN** el usuario abre el listado sin filtros
- **THEN** ve la primera página de conciliaciones de su empresa ordenadas por fecha de creación descendente

#### Scenario: Filtro por estado
- **WHEN** el usuario filtra por estado COMPLETED
- **THEN** solo aparecen conciliaciones en ese estado

#### Scenario: Filtro por período
- **WHEN** el usuario filtra por un rango de fechas
- **THEN** solo aparecen conciliaciones cuyo período se solapa con el rango

### Requirement: Detalle de una conciliación
El sistema SHALL devolver el detalle de una conciliación de la empresa del usuario con sus datos, parámetros, estado, archivos asociados y estadísticas cuando existan.

#### Scenario: Detalle existente
- **WHEN** el usuario abre una conciliación de su empresa
- **THEN** ve nombre, período, parámetros, estado y, si ya se ejecutó, el resumen de resultados

#### Scenario: Conciliación de otra empresa
- **WHEN** el usuario solicita el identificador de una conciliación de otra empresa
- **THEN** la respuesta es la de un recurso inexistente

### Requirement: Ciclo de vida de estados
Una conciliación SHALL encontrarse en uno de los estados DRAFT, PROCESSING, COMPLETED, FAILED o CLOSED, y solo SHALL admitir las transiciones DRAFT→PROCESSING, PROCESSING→COMPLETED, PROCESSING→FAILED, FAILED→PROCESSING, COMPLETED→PROCESSING y COMPLETED→CLOSED.

#### Scenario: Transición no permitida
- **WHEN** se intenta pasar una conciliación de DRAFT a COMPLETED directamente
- **THEN** la operación se rechaza y el estado no cambia

#### Scenario: Cierre
- **WHEN** el usuario cierra una conciliación en estado COMPLETED
- **THEN** pasa a CLOSED y deja de admitir nuevas ejecuciones o cruces
