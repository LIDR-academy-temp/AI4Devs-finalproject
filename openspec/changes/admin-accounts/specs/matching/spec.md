# Delta — matching

## ADDED Requirements

### Requirement: Conjuntos de reglas de un proveedor
`GET /api/v1/providers/{id}/matching-rule-sets` SHALL responder `200` con los conjuntos del proveedor, activos e inactivos, ordenados por nombre: `{ ruleSetId, providerId, name, isActive, accounts }`, con `accounts` las cuentas enlazadas (`{ accountId, name, isActive }`, por nombre). SHALL exigir token y ningún permiso; proveedor inexistente o fuera del alcance SHALL responder `404`. Crear, ver el detalle y editar conjuntos amplían esta lectura en `admin-matching`.

#### Scenario: Conjunto de Provider C
- **WHEN** `analyst` llama a `GET /api/v1/providers/201/matching-rule-sets`
- **THEN** recibe un conjunto con `name = "Provider C legacy"`, `providerId = 201`, `isActive = true` y en `accounts` `ProviderC-Alt`, sin contar las cuentas de prefijo `bruno-`

#### Scenario: Proveedor sin conjuntos
- **WHEN** `viewer` llama a `GET /api/v1/providers/101/matching-rule-sets`
- **THEN** recibe `200` con una lista vacía

#### Scenario: Proveedor fuera del alcance
- **WHEN** `viewer` llama a `GET /api/v1/providers/201/matching-rule-sets`
- **THEN** recibe `404` con `code = "not_found"`, el mismo cuerpo que para el proveedor 999

#### Scenario: Sin token
- **WHEN** se llama sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"`
