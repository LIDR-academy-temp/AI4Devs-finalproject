[← index](_index.md) | [← impl](impl.md)

# delta.md — DASH-BE-014

## Resumen del cambio

`GET /Dashboard/Resumen` devuelve `ResumenAdmin` o `ResumenResidente` según JWT; agregación Dapper solo lectura; clasificación de cuota vía `CuotaEstadoClassifier`.

## Objetos creados / modificados

| Target:Instancia | Objeto | Acción |
|---|---|---|
| backend:cuartaquinientos-api | `DashboardKpiService`, `DashboardKpiRepository` | NUEVO |
| backend:cuartaquinientos-api | `ResumenController` (REST Fase 1) | MODIFICADO |
| backend:cuartaquinientos-api | `ResumenKpiDtos`, `ResumenPeriodoQueryValidator` | NUEVO |
| backend:cuartaquinientos-api | `DashboardKpiServiceTests` | NUEVO |

## Invariantes verificados

| Invariante | Test | Resultado |
|---|---|---|
| INV-1..8 (spec) | Tests servicio + SQL solo SELECT | ✅ 4/4 unitarios |

## Desviaciones vs design.md

GraphQL `IResumenDashboardService` legacy conservado; REST usa `IDashboardKpiService`.

## Specs de dominio

- `specs/dashboard.md` — ya documenta endpoint.

## Actualización de _graph.md

- [[DASH-BE-014]] desbloquea [[FE-040]].
