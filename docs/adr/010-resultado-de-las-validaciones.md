# ADR-010 · Resultado de una validación: `passed`, `warning`, `blocked`, `not_applicable`, `not_implemented`

- **Estado:** Aceptado (Entrega 2, cambio de rumbo)
- **Decisores:** autor del proyecto, en el gate de `validation-engine` (PR #41)

## Contexto

El esquema base admitía `failed` como resultado de una validación (`CK_ValidationResult_outcome`). Pero la regla de negocio es que **ninguna validación bloquea salvo `provider_mismatch`**. Con `failed`, una validación con hallazgos no bloqueantes se leía como fallo, y no había forma de distinguir "no hay nada sobre lo que correr" de "corrió sin hallazgos".

## Opciones consideradas

1. Mantener `passed` / `failed` y una marca aparte de bloqueo.
2. Un vocabulario que diga directamente qué significa para el analista.

## Decisión

Opción 2. El resultado se deriva de los hallazgos:

- `passed`: corrió sin hallazgos.
- `warning`: tiene hallazgos y ninguno bloquea.
- `blocked`: al menos un hallazgo bloqueante; hoy solo `provider_mismatch`.
- `not_applicable`: no hay movimientos ni histórico sobre los que correr.
- `not_implemented`.

Cuentan como aprobadas `passed` y `warning`, nunca `not_applicable` ni `not_implemented`. `0004_validation_outcome` cambia la `CHECK` y añade el tipo de hallazgo `status_mismatch`.

## Consecuencias

- Desaparece `failed`. La corrida está bloqueada si alguna validación es `blocked`, y la interfaz lo muestra con su color (`ui-polish`).
- Una muestra sin batches anteriores del proveedor da `not_applicable` en las dos validaciones *across batches*, y no un falso `passed`.

## Referencias

`backend/prisma/migrations/0004_validation_outcome`; design de `validation-engine` (D4); README §1.2, "Resultado de una validación".
