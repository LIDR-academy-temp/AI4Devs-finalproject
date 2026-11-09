[← index](_index.md) | [← design](design.md)

# Impl: DASH-BE-014

## Implementación

- `GET /Dashboard/Resumen?mes=&anio=` → `DashboardKpiService` + `DashboardKpiRepository` (solo SELECT).
- Admin: KPIs + `ticketsPorCanal`; Residente: cuota período (`CuotaEstadoClassifier`), no leídas, `avisoVencida`.
- Guardia/Trabajador → `403 FORBIDDEN`. Validación período = FNZ morosos.
- GraphQL legacy `obtenerResumenDashboard` sin cambio (`IResumenDashboardService`).

## Archivos

- `GraphApi/Controllers/Dashboard/ResumenController.cs`
- `GraphApi/Services/Dashboard/Kpi/*`
- `GraphApi/Repositories/Dashboard/*`
- `GraphApi/Models/Dashboard/ResumenKpiDtos.cs`
- `GraphApi.Tests/DashboardKpiServiceTests.cs` (4)

## Pruebas

- `dotnet test --filter DashboardKpi` → 4/4

## Verificación /revisar (2026-10-16)

- Tests `DashboardKpiServiceTests` 4/4; contrato alineado a `specs/dashboard.md`.
- Smoke HTTP manual pendiente (JWT + BD).

## Pendiente

- Smoke HTTP con JWT real; integración BD (estados ticket/canal según DB-002).
