# file-import Specification

## Purpose
Permite al analista cargar en una conciliación el reporte del POS y el extracto bancario de cualquier origen, indicar qué significa cada columna e importar las filas válidas con un informe claro de las rechazadas.

## Requirements

### Requirement: Recepción de archivos POS y bancarios
El sistema SHALL aceptar en una conciliación en estado DRAFT, COMPLETED o FAILED archivos con extensión .csv o .xlsx y tipo de contenido coherente, de hasta 10 MB, indicando si la fuente es POS o banco, y conservar el archivo original.

#### Scenario: Archivo válido
- **WHEN** el usuario sube un .xlsx de 3 MB marcado como POS
- **THEN** el archivo queda registrado en estado UPLOADED con su nombre original y número total de filas

#### Scenario: Formato no admitido
- **WHEN** el usuario sube un .pdf o un .xls antiguo
- **THEN** se rechaza con un mensaje que indica los formatos admitidos

#### Scenario: Tamaño excedido
- **WHEN** el archivo supera 10 MB
- **THEN** se rechaza con un mensaje que indica el tamaño máximo

#### Scenario: Conciliación cerrada
- **WHEN** el usuario intenta subir un archivo a una conciliación en estado CLOSED o PROCESSING
- **THEN** se rechaza indicando que la conciliación no admite cambios

### Requirement: Detección de archivos duplicados
El sistema SHALL calcular un hash del contenido de cada archivo y rechazar la subida si ya existe en la misma conciliación un archivo con el mismo hash.

#### Scenario: Mismo archivo dos veces
- **WHEN** el usuario sube un archivo idéntico a uno ya cargado en la conciliación
- **THEN** se rechaza como duplicado indicando el nombre del archivo ya existente

#### Scenario: Mismo archivo en otra conciliación
- **WHEN** el usuario sube a una conciliación un archivo idéntico a uno cargado en otra conciliación distinta
- **THEN** se acepta

### Requirement: Vista previa del archivo
El sistema SHALL mostrar, para un archivo subido, las cabeceras detectadas y las primeras 20 filas de datos tal como aparecen en el archivo, permitiendo indicar en qué fila están las cabeceras.

#### Scenario: Cabeceras en la primera fila
- **WHEN** el usuario abre la vista previa de un archivo cuya primera fila contiene las cabeceras
- **THEN** ve los nombres de columna y hasta 20 filas de ejemplo

#### Scenario: Cabeceras en otra fila
- **WHEN** el usuario indica que las cabeceras están en la fila 4
- **THEN** la vista previa se recalcula tomando esa fila como cabecera y las siguientes como datos

#### Scenario: Archivo con varias hojas
- **WHEN** el archivo .xlsx tiene más de una hoja
- **THEN** la vista previa usa la primera hoja y lo indica

### Requirement: Mapeo de columnas a campos estándar
El sistema SHALL permitir asignar a cada columna del archivo un campo estándar de Concilia o dejarla sin asignar, y MUST exigir que fecha y monto estén asignados antes de importar.

#### Scenario: Campos estándar disponibles para POS
- **WHEN** el usuario mapea un archivo POS
- **THEN** puede elegir entre fecha, monto, código de autorización, últimos 4 dígitos, marca, lote, terminal, código de local y referencia

#### Scenario: Campos estándar disponibles para banco
- **WHEN** el usuario mapea un extracto bancario
- **THEN** puede elegir entre fecha de contabilización, fecha valor, monto, monto bruto, comisión, retención, descripción, referencia, lote, código de autorización, últimos 4 dígitos y tipo de movimiento

#### Scenario: Falta un campo obligatorio
- **WHEN** el usuario intenta importar sin asignar fecha o monto
- **THEN** la importación se rechaza indicando el campo obligatorio ausente

#### Scenario: Campo asignado dos veces
- **WHEN** el usuario asigna el mismo campo estándar a dos columnas
- **THEN** se rechaza indicando el conflicto

### Requirement: Importación de filas con reporte de errores
Al confirmar el mapeo el sistema SHALL transformar cada fila al formato estándar, insertar las válidas y registrar las rechazadas con número de fila, campo y motivo, sin detener el proceso por filas inválidas.

#### Scenario: Importación mixta
- **WHEN** un archivo de 1.000 filas tiene 12 con fecha inválida y 3 con monto vacío
- **THEN** se importan 985 filas, el archivo queda en estado IMPORTED y el resumen indica 1.000 totales, 985 válidas y 15 rechazadas con sus motivos

#### Scenario: Primeros errores en la respuesta
- **WHEN** la importación rechaza más de 50 filas
- **THEN** la respuesta incluye el conteo total y el detalle de las primeras 50

#### Scenario: Reimportación
- **WHEN** el usuario corrige el mapeo y vuelve a importar el mismo archivo
- **THEN** las filas importadas anteriormente desde ese archivo se sustituyen por las nuevas

#### Scenario: Fallo general
- **WHEN** ocurre un error no relacionado con filas concretas durante la importación
- **THEN** no queda ninguna fila importada parcialmente y el archivo pasa a estado FAILED con el motivo

### Requirement: Solo abonos en extractos bancarios
Al importar un extracto bancario el sistema SHALL importar únicamente los movimientos de crédito y descartar los débitos, informando cuántos se descartaron.

#### Scenario: Débitos por signo
- **WHEN** el extracto no tiene columna de tipo y contiene montos negativos
- **THEN** los negativos se descartan y el resumen indica el número de débitos descartados

#### Scenario: Débitos por columna de tipo
- **WHEN** el extracto tiene columna de tipo de movimiento mapeada
- **THEN** se descartan las filas cuyo tipo indique débito aunque el monto sea positivo

### Requirement: Extractos con o sin desglose de comisiones
El sistema SHALL admitir extractos que detallen monto bruto, comisión y retención y extractos que solo informen el monto acreditado.

#### Scenario: Extracto con desglose
- **WHEN** el usuario mapea monto bruto, comisión y retención
- **THEN** cada movimiento conserva los cuatro valores y el monto acreditado es el que se usa para cruzar

#### Scenario: Extracto sin desglose
- **WHEN** solo se mapea el monto
- **THEN** los campos de bruto, comisión y retención quedan vacíos sin error

### Requirement: Rendimiento de la importación
El sistema SHALL importar un archivo de 5.000 filas en menos de 10 segundos.

#### Scenario: Archivo de 5.000 filas
- **WHEN** se importa un archivo válido de 5.000 filas
- **THEN** la importación completa en menos de 10 segundos
