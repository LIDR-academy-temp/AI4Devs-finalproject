[← index](_index.md) | [← spec](spec.md)

# design.md — WMS-BE-029: Almacén API + SQL wms

## Estrategia
Único módulo con DDL en entrega; luego CuartaWmsService transaccional.

## database
DB-005 script idempotente.

## Tests
xUnit + SQL TC stock.

## Orden implementación

1. Rama `feature/wms-be-029` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
