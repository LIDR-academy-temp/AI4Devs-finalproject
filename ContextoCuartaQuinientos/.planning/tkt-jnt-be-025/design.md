[← index](_index.md) | [← spec](spec.md)

# design.md — JNT-BE-025: Juntas API Cuarta

## Estrategia
`CuartaJuntasService`; join detalle; adjuntos opcionales `archivoIds[]` ya en ARC.

## Tests
xUnit transacción rollback en error.

## Orden implementación

1. Rama `feature/jnt-be-025` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
