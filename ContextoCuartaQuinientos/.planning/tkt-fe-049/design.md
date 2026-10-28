[← index](_index.md) | [← spec](spec.md)

# design.md — FE-049: UI Mascotas

## frontend
`MascotasPage`, `AdminMascotasPage`.

## Orden implementación

1. Rama `feature/fe-049` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
