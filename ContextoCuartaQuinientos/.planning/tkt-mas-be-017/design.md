[← index](_index.md) | [← spec](spec.md)

# design.md — MAS-BE-017: Mascotas API Cuarta

## Estrategia
`CuartaMascotasService`; opcional ALTER usr.Mascotas en DB-004.

## Tests
xUnit + SQL seed.

## Orden implementación

1. Rama `feature/mas-be-017` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
