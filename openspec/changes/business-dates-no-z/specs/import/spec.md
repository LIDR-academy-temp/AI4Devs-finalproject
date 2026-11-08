## ADDED Requirements

### Requirement: Fecha de la transacción enlazada sin zona
La `transaction.transactionDate` de una fila enlazada SHALL salir en hora de pared de America/New_York, sin zona ni milisegundos (`YYYY-MM-DDTHH:mm:ss`), en `GET /api/v1/imports/{id}/rows` y en la respuesta de `PATCH /api/v1/imports/{id}/rows/{sheetId}/{rowNo}`. SHALL ser los mismos dígitos guardados en la base, sin convertir.

#### Scenario: Fila enlazada
- **GIVEN** una transacción con `transactionDate` guardada como `2026-09-28 00:04:11`
- **WHEN** `analyst` lista las filas del import que la enlaza
- **THEN** la fila trae `transaction.transactionDate = "2026-09-28T00:04:11"`, sin `Z`

#### Scenario: Asignación manual
- **WHEN** `analyst` asigna a mano una fila ambigua a una transacción
- **THEN** la respuesta trae su `transactionDate` sin `Z` ni milisegundos
