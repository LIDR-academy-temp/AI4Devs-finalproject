[← index](_index.md) | [← spec](spec.md)

# design.md — FE-041: Padrón admin

## Estrategia

- Ruta `/admin/usuarios` bajo `AdminRoute` + `AppShell`.
- Hooks: `usePadronUsuarios`, `useCasasSelect` → API JWT USR-BE-009 y USR-BE-010.
- Alta modal con contraseña temporal; activar/desactivar `PATCH` sin body; edición mínima vía prompt.

## frontend:cuartaquinientos-web

| Hook / página | API |
|---------------|-----|
| `usePadronUsuarios` | `GET /SGR/Usuarios` |
| Alta | `POST /SGR/Usuarios` |
| Activar/desactivar | `PATCH …/activar` \| `…/desactivar` |
| `useCasasSelect` | `GET /SGR/Casas` |

## Plan de pruebas

Manual smoke admin; opcional tests de página (pendiente).
