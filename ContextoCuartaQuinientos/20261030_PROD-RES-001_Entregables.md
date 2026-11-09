# 20261030 — PROD-RES-001 — Entregables

Hub: [ContextoCuartaQuinientos/.planning/tkt-prod-res-001/_index.md](.planning/tkt-prod-res-001/_index.md)

## SQL Objects

| Objeto | Tipo | Script |
|--------|------|--------|
| sgr.Menus (ruta `/visitas/pases`) | Menú | 20261030_sgr_visitas_pases_menu_residente.sql |
| sgr.PerfilMenus (Residente + visitas) | DML | 20261030_sgr_visitas_pases_menu_residente.sql |

## APIs

| Método | Ruta | Tipo |
|--------|------|------|
| GET | /ENC/Encuestas/{id}/resultados | CAMBIO (fix SQL agregación) |
| POST | /TKT/Tickets | CAMBIO (canal opcional sin CanalesTicket) |

## DTOs / UI (Web)

- Encuestas residente: normalización listado/detalle/resultados; `esPreguntaTextoLibre`
- Navegación: `supplementApiNavWithManifest`, `useNavegacionMenus`
- Visitas: `MisPasesVisitaPage` — select tipos identificación

## SDD

- Inventario: [SQL/20261030_PROD-RES-001_INVENTARIO_CAMBIOS.md](../SQL/20261030_PROD-RES-001_INVENTARIO_CAMBIOS.md)
