[← index](_index.md) | [← impl](impl.md)

# delta.md — FNZ-BE-012: Reporte de morosos (Admin)

## Resumen del cambio

`GET /Reports/Reportes/Morosos?mes=&anio=` (Admin): lista morosos agrupados por usuario/casa; validación mes/año acoplados. Tests servicio + validator.

## Objetos creados / modificados

| Target:Instancia | Objeto | Acción |
|---|---|---|
| backend:cuartaquinientos-api | `FinanzasMorososController` | NUEVO |
| backend:cuartaquinientos-api | `FinanzasService.ObtenerMorososAsync` | NUEVO |
| backend:cuartaquinientos-api | `MorososRepository`, `MorosoDto`, `MorososQueryValidator` | NUEVO |
| backend:cuartaquinientos-api | `FinanzasServiceMorososTests`, `MorososQueryValidatorTests` | NUEVO |

## Invariantes verificados

| Invariante | Test | Resultado |
|---|---|---|
| INV-3, INV-6, INV-7 | Tests morosos | ✅ 5/5 |

## Desviaciones vs design.md

Ruta bajo `Reports/Reportes` (no `api/v1/reportes` de ReportEngine).

## Specs de dominio a actualizar

- `specs/finanzas.md` — endpoint ya listado.

## Actualización de _graph.md

- [[FNZ-BE-012]] cierra HU-FNZ-03; alimenta [[FE-039]] y [[DASH-BE-014]].
