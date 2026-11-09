# impl.md — tkt-fe-shell-001 (Shell: sidebar y navegación por perfil)

## Fecha
2026-10-22

## Componentes

### `AppShell` (`src/shared/components/AppShell.tsx`)
Wrapper layout principal. Renderiza header + sidebar + `<Outlet />`.

**Header**: logo (`VITE_APP_NAME`), nombre del usuario (`session.nombre`), `NotificationBell`, botón "Cerrar sesión" → `logout()` + `navigate('/login', { replace: true })`.

**Layout**: `div.min-h-screen` → header + `div.max-w-6xl.flex` → `<AppSidebar />` + `div.flex-1 <Outlet />`.

### `PrivateRoute` (`src/shared/components/PrivateRoute.tsx`)
Guard de autenticación. Renderiza `<AppShell />` solo si hay sesión válida.

Lógica:
1. `!session?.token` → `<Navigate to="/login" replace />`
2. `session.requiereCambioPassword` → `<Navigate to="/cambiar-password" replace />`
3. Otherwise → `<AppShell />`

### `AppSidebar` (`src/shared/components/AppSidebar.tsx`)
Sidebar de navegación filtrada por perfil.

- Llama `navItemsForPerfil(session?.perfil ?? '')` para obtener items filtrados
- Items con `implemented: false` → `<span>` con `cursor-not-allowed` (placeholder "Próximamente")
- Items implementados → `<Link>` con clase activa si `location.pathname === item.path` o `startsWith(item.path + '/')`
- `aria-current="page"` en item activo

### `appNavigation.ts` (`src/shared/navigation/appNavigation.ts`)
Definición centralizada de rutas + función de filtrado por perfil.

**Tipo `NavItem`**: `{ path, label, adminOnly?, residentOnly?, implemented }`

**`APP_NAV`** — 23 items totales:
- Sin guard (todos): `/`, `/perfil`
- `residentOnly`: `/tickets`, `/finanzas/cuenta`, `/anuncios`, `/encuestas`, `/archivos`, `/juntas`, `/areas-comunes`, `/mis-vehiculos`, `/mis-mascotas`
- `adminOnly`: `/admin/tickets`, `/admin/finanzas`, `/admin/usuarios`, `/admin/casas`, `/admin/anuncios`, `/admin/encuestas`, `/admin/archivos`, `/admin/juntas`, `/admin/visitas`, `/admin/vehiculos`, `/admin/mascotas`, `/admin/almacen`
- Todos con `implemented: true`

**`navItemsForPerfil(perfil)`**: filtra `adminOnly` si no es Administrador; filtra `residentOnly` si sí es Administrador.

## Tests Vitest

- `AppSidebar.test.tsx` — **2 `it(`** tests
  - Muestra items de administrador (links Residentes + Casas presentes)
  - Link Encuestas es un link real (no placeholder)

- `PrivateRoute.test.tsx` — **3 `it(`** tests

**Total tests Shell**: 5
