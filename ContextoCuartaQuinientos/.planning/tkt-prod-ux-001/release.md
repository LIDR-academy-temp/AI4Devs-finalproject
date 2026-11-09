[← delta](delta.md) | [index](_index.md)

# release.md — PROD-UX-001

## Git (repo)

Solo ramas de producto: `main`, `feature/entrega-1-AFS`, **`feature/entrega-2-AFS`**. Todo el cierre PROD-UX-001 va en **entrega 2**; commit en `feature/entrega-2-AFS` → merge a `main` cuando corresponda.

## Piezas

1. SQL prod (si no aplicados): `20261029_fnz_cuotas_monto_mora.sql` → `20261030_vts_visitas_una_ocasion.sql`
2. GraphApi → `apicuartaquinientos.runasp.net`
3. Web → `cuartaquinientosresidencial.runasp.net`

## Smoke post-deploy

- `PUT /SGR/Usuarios/{id}` con `casaId` → 200
- Admin visitas → pase vigente visible; crear y compartir
- Admin finanzas → morosos → aplicar moras lote (1 cuota prueba)
- Dashboard → ocupación sube tras vincular casa en Residentes (ocupante vigente)

## Rollback

- Revert deploy API/Web; SQL columnas no destructivas (no rollback SQL salvo hotfix manual)
