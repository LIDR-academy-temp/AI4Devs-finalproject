[← delta](delta.md) | [index](_index.md)

# release.md — PROD-RES-001

## Piezas

1. **GraphApi** — ENC resultados + TKT crear ticket
2. **Web SPA** — encuestas residente + nav supplement + MisPasesVisita combo
3. **SQL** — `20261030_sgr_visitas_pases_menu_residente.sql` (prod CuartaQuinientos)

## Orden sugerido

1. SQL menú (opcional si Web supplement ya desplegado)
2. GraphApi
3. Web — hard refresh / cerrar sesión residente

## Smoke post-deploy

- Residente: `/encuestas`, enviar respuesta, `/encuestas/{id}/resultados`
- Residente: `POST` nuevo ticket desde `/tickets/nuevo`
- Residente: sidebar **Pases QR** → `/visitas/pases` → combo Tipo ID
- Login: 401 RefreshToken una vez al cargar (esperado)

## Rollback

- Revert deploy API/Web; script menú no elimina filas (solo MERGE visible).
