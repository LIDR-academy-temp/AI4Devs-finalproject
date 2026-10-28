[← index](_index.md) | [design →](design.md)

# spec.md — SGR-FE-001: Navegación dinámica y administración SGR

## 1. User story

**Como** administrador, **quiero** gestionar menús y permisos por perfil en el SPA y ver solo lo permitido en el sidebar, **como** en Web_diseño.

## 2. Must

- Hook `useNavegacionMenus()` → `GET /SGR/Navegacion/menus`.
- `AppSidebar` consume API; fallback a `APP_NAV` estático si API falla (feature flag `VITE_NAV_STATIC_FALLBACK=true` dev only).
- Rutas nuevas:
  - `/admin/menus`
  - `/admin/perfiles`
  - `/admin/perfiles/:id/permisos`
- Pantallas con patrones FE-PAT-001 (árbol menús + tabla permisos).
- `PrivateRoute` / guard: si ruta no está en menú permitido → 403 página amigable.
- Registrar rutas en `appNavigation.ts` como `implemented: true` solo tras merge.

## 3. CA

- CA-1: Cambiar `PerfilMenus` en BD → sidebar refleja sin redeploy.
- CA-2: Usuario sin permiso a `/admin/menus` no ve ítem ni accede por URL.
- CA-3: Tests: hook + página Menus (mock API).

## 4. Won’t

- Editor de tema sitio (FE-THEME-001 futuro).
