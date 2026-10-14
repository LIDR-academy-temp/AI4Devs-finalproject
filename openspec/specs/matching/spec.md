# matching

## Purpose
Reglas que convierten nombres de hoja y columna en ciclo, estado y campos; conjuntos por proveedor y reglas globales. README §3.2 "Reglas de pareo", §1.2.

## Requirements

### Requirement: Reglas globales y conjuntos por proveedor
Las reglas con `ruleSetId NULL` SHALL actuar como valores por defecto; una regla del conjunto enlazado a la cuenta SHALL prevalecer sobre la global con el mismo patrón; una cuenta sin conjunto SHALL usar solo las globales. `MatchingRuleSet` pertenece a un proveedor y una cuenta se enlaza a uno o a ninguno; el cambio aplica al siguiente import.

#### Scenario: Conjunto legacy del proveedor C
- GIVEN la cuenta ProviderC-Alt enlazada a "Provider C legacy"
- WHEN se importa `data/samples/legacy-provider`
- THEN TRX→E con estado por columna `Order Status`, Fail→E/Declined, CB→I con estado por columna, Summary→ignore, `Merchant Order No#`→transactionId, `Amount USD`→amount

### Requirement: Alias de estado globales
El texto de estado leído SHALL resolverse por `MatchingStatusAlias` (sin distinguir mayúsculas); `CHB 2` SHALL resolver a `Chargeback` con `excludeAmount = 1` (cuenta y aplica fee, no suma importe).

#### Scenario: CHB 2 legacy
- WHEN la hoja CB trae una fila con `Order Status = CHB 2`
- THEN el movimiento se procesa como Chargeback con `excludeAmount = 1` y queda listado en `excludeAmountRows`

### Requirement: Pareo confirmado es la fuente de verdad
La propuesta de pareo SHALL poder editarse por el analista y, una vez confirmada, `ImportSheetColumnMap` e `ImportSheet.cycle/statusId/kind` SHALL gobernar el parseo aunque la regla cambie después.

### Requirement: Coherencia ciclo–estado
Una fila cuyo estado resuelto tenga ciclo natural distinto del ciclo de la hoja (p. ej. estado Chargeback en hoja E) SHALL generar advertencia, no bloqueo.
