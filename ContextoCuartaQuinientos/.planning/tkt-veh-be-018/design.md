[← index](_index.md) | [← spec](spec.md)

# design.md — VEH-BE-018: Vehículos API Cuarta

## Estrategia
`CuartaAutomovilesService`; vista `usr.vsAutomoviles`.

## Tests
xUnit placas duplicadas.

## Orden implementación

1. Rama `feature/veh-be-018` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
