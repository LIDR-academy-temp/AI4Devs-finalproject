# 20261030 — PROD-UX-001 — Inventario de cambios

Ticket: [ContextoCuartaQuinientos/.planning/tkt-prod-ux-001/_index.md](../ContextoCuartaQuinientos/.planning/tkt-prod-ux-001/_index.md)

## SQL Objects

- `vts.VisitasGeneradas.bUnaOcasion` — columna + `vts.vsVisitasGeneradas` — script `20261030_vts_visitas_una_ocasion.sql`
- `fnz.Cuotas.MontoMora` (si aplica) — script `20261029_fnz_cuotas_monto_mora.sql`

## APIs REST

- `GET/POST/PUT/DELETE /VTS/VisitasGeneradas/admin*` — admin pases QR
- `POST /VTS/VisitasGeneradas/{id}/usar` — uso + bitácora
- `PUT /SGR/Usuarios/{id}` — perfil + `casaId` (admin extras)
- `POST /Reports/FinanzasMorosos/moras/aplicar` — lote moras
- `POST /Reports/FinanzasMorosos/moras/condonar` — lote condonación

## Orden despliegue

1. Scripts SQL anteriores
2. GraphApi
3. Web SPA
