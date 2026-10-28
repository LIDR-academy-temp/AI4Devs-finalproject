[← index](_index.md) | [← spec](spec.md)

# design.md — FE-SHELL-001: Shell sidebar y navegación

## Estrategia

- Catálogo estático `APP_NAV` en `appNavigation.ts` (sin CRUD `sgr.Menus` en esta ola).
- `AppShell`: header (logout, campana) + `AppSidebar` + `<Outlet />`.
- `navItemsForPerfil(perfil)`: oculta `adminOnly` / `residentOnly`; ítems `implemented: false` se muestran deshabilitados.

## frontend:cuartaquinientos-web

| Pieza | Rol |
|-------|-----|
| `appNavigation.ts` | Fuente de rutas y flags |
| `AppSidebar.tsx` | NavLink + estado deshabilitado |
| `AppShell.tsx` | Layout compartido |
| `PrivateRoute` / `AdminRoute` | Envuelven con `AppShell` |

## Orden

1. Nav config → 2. Sidebar → 3. AppShell → 4. Quitar nav duplicada en `HomePage` → 5. Test sidebar

## Plan de pruebas

`AppSidebar.test.tsx`: admin ve Residentes; residente no ve `/admin/*`.
