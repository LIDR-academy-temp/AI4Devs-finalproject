# ADR-011 · Códigos de error del API en snake_case minúsculas

- **Estado:** Aceptado (Entrega 2, cambio de rumbo)
- **Decisores:** autor del proyecto, en el review del PR #30

## Contexto

Los ejemplos del README §4, escritos en la Entrega 1, usaban códigos en mayúsculas (`FEE_OVERLAP`, `DUPLICATE_FILE`, `BATCH_NO_TAKEN`). El API real del tramo 1 respondía `validation_error`, `not_found` o `unauthorized`. El review-diff de la colección Bruno detectó la discrepancia.

## Opciones consideradas

1. Pasar el API a mayúsculas para seguir al README.
2. Fijar snake_case en minúsculas y corregir el README.

## Decisión

Opción 2. Todos los códigos de error del API van en snake_case minúsculas. La regla está en `CLAUDE.md`: un código en mayúsculas de un ejemplo del README está desactualizado, se implementa en minúsculas y el ejemplo se corrige en el mismo change que implementa el endpoint.

## Consecuencias

- Los tests negativos de la colección Bruno comprueban el `code` exacto en minúsculas.
- Quedan ejemplos en mayúsculas en endpoints todavía no implementados. Por ejemplo, `FEE_OVERLAP` en §4.1 se corregirá con la administración de fees (#80).

## Referencias

`CLAUDE.md` ("Códigos de error"); `prompts.md` §7, entrada de `api-collection`; README §7, tramo 1.
