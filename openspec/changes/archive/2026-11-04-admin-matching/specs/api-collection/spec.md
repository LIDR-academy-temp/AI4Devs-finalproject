## ADDED Requirements

### Requirement: Reglas de pareo en la colección
Cada endpoint de reglas de pareo SHALL tener un caso feliz y al menos un negativo con su código y `code`. El flujo `20-flows/matching` SHALL usar `admin`, buscar el proveedor por nombre, crear un conjunto `bruno-<id de la pasada>`, leerlo, editarlo y dejarlo inactivo. El caso feliz de las globales SHALL reenviar lo leído sin escribir. Nada SHALL depender de batch-clean, y SHALL poder repetirse sin sembrar.

#### Scenario: Flujo de un conjunto
- **GIVEN** `admin` y el id de Provider C obtenido de `GET /merchants/{id}/providers` por nombre
- **WHEN** se ejecuta `20-flows/matching`
- **THEN** crear `bruno-<id>` da `201`, repetir el nombre en mayúsculas `409 rule_set_name_taken`, el detalle `200`, la edición `200` con las reglas nuevas, un estado fijo de otro ciclo `400 validation_error`, y la desactivación `200` con `isActive = false`

#### Scenario: Desactivar el conjunto legacy
- **WHEN** `admin` intenta desactivar "Provider C legacy", localizado por nombre
- **THEN** recibe `409 rule_set_in_use` y el conjunto sigue activo

#### Scenario: Globales sin cambios
- **WHEN** `admin` lee las globales y reenvía sus reglas y alias sin ids
- **THEN** recibe `200` con el mismo contenido, y una segunda pasada da lo mismo

#### Scenario: Negativos de permiso y alcance
- **WHEN** `analyst` crea un conjunto, edita uno o edita las globales, y `viewer` pide el detalle de "Provider C legacy"
- **THEN** las de `analyst` responden `403 forbidden` y la de `viewer` `404 not_found`, sin escribir

#### Scenario: Dos pasadas seguidas
- **WHEN** se ejecuta `pnpm test:api` dos veces sin `pnpm db:seed` entre medias
- **THEN** todas las peticiones de reglas de pareo pasan las dos veces y queda un conjunto `bruno-` inactivo más por pasada
