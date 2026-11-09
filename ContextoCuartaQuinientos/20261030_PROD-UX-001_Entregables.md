# 20261030 — PROD-UX-001 — Entregables

## SQL Objects

| Objeto | Tipo | Script |
|--------|------|--------|
| vts.VisitasGeneradas.bUnaOcasion | Columna | 20261030_vts_visitas_una_ocasion.sql |
| vts.vsVisitasGeneradas | Vista | 20261030_vts_visitas_una_ocasion.sql |
| fnz.Cuotas.MontoMora | Columna | 20261029_fnz_cuotas_monto_mora.sql |

## APIs

| Método | Ruta | Tipo |
|--------|------|------|
| PUT | /SGR/Usuarios/{id} | CAMBIO (admin extras + fix tx) |
| POST | /VTS/VisitasGeneradas/admin | NUEVO/CAMBIO |
| POST | /VTS/VisitasGeneradas/{id}/usar | CAMBIO |
| POST | /Reports/FinanzasMorosos/moras/aplicar | CAMBIO |
| POST | /Reports/FinanzasMorosos/moras/condonar | CAMBIO |

## DTOs / UI

- Web: `PaseEstadoBadge`, `AdminUsuariosPage` (edición completa), `MorososTable` (lote moras)

## SDD

- Hub: `ContextoCuartaQuinientos/.planning/tkt-prod-ux-001/`
- Inventario: `SQL/20261030_PROD-UX-001_INVENTARIO_CAMBIOS.md`
