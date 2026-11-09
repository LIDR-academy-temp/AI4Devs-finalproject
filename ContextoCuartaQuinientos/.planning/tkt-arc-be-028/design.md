[← index](_index.md) | [← spec](spec.md)

# design.md — ARC-BE-028: Archivos API Cuarta

## Estrategia
`CuartaArchivosService` + `LocalFileStorage`; Dapper en metadatos.
Seed `arc.TiposArchivo` DB-004 arc.

## backend
POST multipart; Content-Type validado image/pdf.

## Tests
xUnit + archivo temp en test.

## Orden implementación

1. Rama `feature/arc-be-028` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
