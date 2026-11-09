# delta.md — tkt-fe-shell-001 (Shell: sidebar y navegación por perfil)

## Fecha
2026-10-22

## Archivos entregados

| Archivo | Descripción |
|---------|-------------|
| `src/shared/components/AppShell.tsx` | Layout principal con header + sidebar + Outlet |
| `src/shared/components/PrivateRoute.tsx` | Guard de autenticación (redirect a /login o /cambiar-password) |
| `src/shared/components/AppSidebar.tsx` | Sidebar filtrado por perfil con active-state |
| `src/shared/navigation/appNavigation.ts` | Catálogo de 23 nav items + `navItemsForPerfil()` |
| `src/shared/components/AppSidebar.test.tsx` | 2 tests Vitest |
| `src/shared/components/PrivateRoute.test.tsx` | 3 tests Vitest |

## Decisiones clave

1. **Filtrado en cliente por `perfil` del JWT**: `navItemsForPerfil` filtra en runtime según el campo `session.perfil`. Los endpoints ya aplican `SoloAdministrador` en el servidor; el filtrado de nav es puramente UX.

2. **`implemented: boolean` como feature flag**: Permite agregar rutas al catálogo antes de implementar la página — la UI las muestra como "Próximamente" (span no-clickable) sin modificar `APP_NAV`. Todos los items de los 8 módulos se marcaron `true` al completar `/ejecutar`.

3. **`PrivateRoute` como Outlet wrapper**: El guard está en la capa de routing (`App.tsx`), no dentro de cada página. Páginas individuales no necesitan repetir la verificación de sesión.

4. **Redirect `requiereCambioPassword`**: Guard secundario — si el usuario tiene la flag activa, se redirige a `/cambiar-password` antes de mostrar cualquier contenido protegido, sin importar la ruta destino.

5. **Active-state con `startsWith`**: Rutas hijo (ej. `/admin/tickets/123`) también activan el item padre de la sidebar, excepto `/` que requiere match exacto para no activarse en todas las rutas.
