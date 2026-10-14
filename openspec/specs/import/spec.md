# import

## Purpose
Subir uno o varios archivos de la plantilla estandarizada para una cuenta, reconocer sus hojas y columnas con las reglas de pareo, cruzar cada fila contra las transacciones propias y dejar el import listo para validar. README §1.2 (plantilla), §3.2 (Import, ImportFile, ImportSheet, ImportRow), §4.2, HU1.

## Requirements

### Requirement: Varios archivos por import
El sistema SHALL aceptar uno o varios archivos `.xlsx` en un mismo import de una cuenta y tratarlos como un solo batch. El mismo archivo (mismo `sha256`) no se admite dos veces en el mismo import.

#### Scenario: Batch repartido en dos archivos
- GIVEN la cuenta ProviderA-USD y los archivos `part1.xlsx` (APP, DEC) y `part2.xlsx` (CHB, REF, RDR, RR, Other Fees) de `data/samples/batch-split`
- WHEN se crea un import con ambos
- THEN las filas leídas, cruzadas y los totales son idénticos a los de `data/samples/batch-clean/expected.json`

#### Scenario: Archivo duplicado
- WHEN se añade un archivo cuyo `sha256` ya está en el import
- THEN se rechaza con 409 y el import no cambia

### Requirement: Solo ID es obligatorio
El sistema SHALL poder analizar una hoja de transacciones cuando tiene identificada la columna `transactionId`; `amount` y `currency` son opcionales y solo generan advertencias.

#### Scenario: Hoja sin columna ID
- WHEN una hoja `kind = transactions` no tiene ninguna columna pareada como `transactionId`
- THEN el import no puede pasar a `analyzed` y la hoja aparece marcada como "falta ID"

### Requirement: Ciclo y estado por hoja
El ciclo (`E`/`I`/`R`) de cada fila SHALL venir de la regla de hoja (o del pareo confirmado), nunca del estado. La hoja `RR` SHALL asignar ciclo `R` sin estado. `Other Fees` SHALL leerse como `batch_fees`; `Duplicate Corrections`, `CHB Alerts` y `Settings` SHALL ignorarse con aviso.

#### Scenario: Plantilla estándar
- WHEN se importa `data/samples/batch-clean`
- THEN APP→E/Successful, DEC→E/Declined, CHB→I/Chargeback, REF→I/Refund, RDR→I/RDR, RR→R, `Other Fees`→batch_fees (2 fees prellenados), y 3 hojas ignoradas con aviso

### Requirement: Cruce por identidad normalizada
Cada fila SHALL cruzarse por `(gatewayId, sourceTransactionId)` normalizado según `Gateway.idFormat` entre los gateways de los canales de la cuenta, con resultado `matched`, `unmatched` o `ambiguous`. La columna de ID SHALL leerse como texto; IDs numéricos de 12 a 17 dígitos son válidos y otra longitud es advertencia.

#### Scenario: ID desconocido
- WHEN una fila de APP trae un ID de 16 dígitos que no existe (`data/samples/batch-issues`)
- THEN la fila queda `unmatched`, el import sigue siendo analizable y `rowsUnmatched = 1`

### Requirement: Filas sin ID se ignoran
Toda fila cuya celda de ID esté vacía (restos `=SUM()` de la plantilla) SHALL marcarse `ignored` por la regla global y no contarse como transacción.

#### Scenario: Residuo de suma
- WHEN CHB, REF y RDR traen una última fila con ID vacío
- THEN `ignoredEmptyId = 3` y esas filas no aparecen en el análisis

### Requirement: Importes positivos y moneda de referencia
`Amount` SHALL leerse siempre positivo (el sistema aplica el signo por ciclo); un negativo es advertencia. `Currency` SHALL conservarse como referencia (ISO-3) sin bloquear ni comparar; el importe procesado es siempre el USD del gateway.
