# 20261030 — PROD-RES-001 — Inventario de cambios

Ticket: [ContextoCuartaQuinientos/.planning/tkt-prod-res-001/_index.md](../ContextoCuartaQuinientos/.planning/tkt-prod-res-001/_index.md)

## SQL Objects

- `sgr.Menus` — ítem **Pases QR**, ruta `/visitas/pases`, padre Mi Comunidad — script `20261030_sgr_visitas_pases_menu_residente.sql`
- `sgr.PerfilMenus` — visible Residente para grupo + ítem visitas — mismo script

## APIs REST (GraphApi — deploy binario)

- `GET /ENC/Encuestas/{id}/resultados` — fix GROUP BY
- `POST /TKT/Tickets` — canal ticket opcional si falta catálogo CanalesTicket

## Frontend (Web — deploy SPA)

- Encuestas residente, navegación supplement, formulario pases visita

## Orden despliegue

1. `20261030_sgr_visitas_pases_menu_residente.sql` en prod (recomendado; Web mitiga si falta)
2. GraphApi
3. Web SPA
