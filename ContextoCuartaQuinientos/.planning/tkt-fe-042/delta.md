# delta.md — FE-042: Admin Casas Page

## Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `Web/src/shared/types/casasAdmin.ts` | Tipos `CondominioItem`, `CasaAdminItem` |
| `Web/src/features/admin/casas/useCasasAdmin.ts` | Hook datos casas + condominios (fetch paralelo) |
| `Web/src/features/admin/casas/AdminCasasPage.tsx` | Vista CRUD admin casas |
| `Web/src/features/admin/casas/AdminCasasPage.test.tsx` | 5 tests Vitest |

## Archivos modificados

### `Web/src/app/router.tsx` (o equivalente de rutas)
- **+** Ruta `/admin/casas` → `<AdminCasasPage />`

### `Web/src/shared/navigation/appNavigation.ts`
- **~** Entry `/admin/casas` ya presente con `implemented: true` (sin cambio si estaba desde scaffold)

## Archivos sin cambios
- `Web/src/shared/types/usuariosAdmin.ts` — `CasaListItem` (usado por FE-041 para selector de casas en creación de usuario, distinto a `CasaAdminItem`)
- `Web/src/features/admin/usuarios/useCasasSelect.ts` — fetch `/SGR/Casas` para selector en form de usuarios

## Notas
- `CasaAdminItem` (en `casasAdmin.ts`) ≠ `CasaListItem` (en `usuariosAdmin.ts`): mismo endpoint `/SGR/Casas`, respuesta mapeada a distintos tipos según contexto de uso.
- `useCasasAdmin` hace fetch paralelo desde el inicio; `useCasasSelect` hace fetch simple solo cuando se abre el modal de creación de usuario.
