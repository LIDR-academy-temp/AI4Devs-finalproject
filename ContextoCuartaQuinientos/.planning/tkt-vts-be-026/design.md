[← index](_index.md) | [← spec](spec.md)

# design.md — VTS-BE-026: Visitas y reservas API Cuarta

## Estrategia
`CuartaVisitasService`, `CuartaReservacionesService`; usar `vts.vsReservacionesArea`.
Estado reserva por nombre catálogo `vts.ReservacionesEstados`.

## Tests
xUnit solapamiento; seed estados DB-004 vts.

## Orden implementación

1. Rama `feature/vts-be-026` · 2. RED tests · 3. Repo/Service · 4. Controller · 5. DI · 6. FE si aplica · 7. `dotnet test` / `npm test`.

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
