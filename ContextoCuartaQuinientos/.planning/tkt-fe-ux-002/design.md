[← spec](spec.md) | [← index](_index.md)

# design.md — FE-UX-002

Modo **frontend-design-master:** `REDESIGN` (login) + `PATCH` (shell layout + menú).

## 1. Dirección visual (calibración)

| Eje | Decisión |
|-----|----------|
| Marca | Mantener Pantone `@theme`; hero con gradientes suaves como `Web_diseño` (`--cq-login-gradient-*` adaptados a tokens) |
| Densidad | Login: aireado; shell: rail 4.25rem → 15rem (`w-60`) |
| Motion | 250ms cubic-bezier shell; login fade-in existente; `prefers-reduced-motion: reduce` → `transition: none` en anchos |

## 2. Login — arquitectura UI

### Archivos

| Acción | Ruta |
|--------|------|
| Refactor | `Web/src/pages/LoginPage.tsx` |
| Nuevo | `Web/src/styles/login.css` |
| Nuevo | `Web/src/features/auth/loginCopy.ts` (strings marco UI) |
| Nuevo | `Web/src/shared/components/PasswordField.tsx` (input + toggle, reutilizable en `/cambiar-password` después) |

### Estructura JSX (desktop)

```
main.cq-login-page
  a.skip-link
  .cq-login-shell (grid lg:grid-cols-2)
    section.cq-login-hero (h1, p, ul)
    section.cq-login-card (h2, form)
```

### Comportamiento

- `PasswordField`: botón icono `aria-label="Mostrar contraseña"` alterna `type` password/text.
- Errores: `role="alert"` servidor; inline Zod en campos.
- No añadir GraphQL ni cambiar `login()`.

### Copy hero (loginCopy.ts)

- Título: “Tu comunidad, en un solo lugar.”
- Subtítulo: una línea portal residencial.
- Bullets (3): acceso seguro, gestión de servicios, diseño claro en móvil y escritorio — **sin** mencionar recuperación por correo.

## 3. Sidebar — navegación estable (iteración 2)

### Decisión UX (control del usuario)

- **Sin expandir al hover** (causaba solapamiento y saltos de layout).
- **Desktop `md+`:** menú **colapsado (rail) por defecto**; expandir con el botón del pie; ancho fijo empuja `main`.
- **Colapso explícito:** botón «Colapsar menú» **arriba** del scroll (toolbar); en rail, tooltip «Expandir menú»; preferencia en `localStorage` (`cq-sidebar-collapsed`).
- **Modo rail:** solo iconos + **flyout** de etiqueta a la derecha (no redimensiona al pasar el mouse).
- **Activo:** barra lateral `primary-light` + fondo sutil (`cq-nav-item--active`).

### Implementación

- `useSidebarCollapsed.ts` reemplaza `useSidebarRail`.
- `AppShell` + `AppSidebar` + `SidebarItem` + `app-shell.css`.

## 4. UserMenu

| Cambio | Detalle |
|--------|---------|
| Escape | `useEffect` keydown `Escape` → `setOpen(false)` |
| z-index | `z-40` menú; header `z-30`; sidebar sin overlay |
| Focus | Primer `menuitem` focusable al abrir (opcional CA-5) |

## 5. Pruebas (Vitest)

| ID | Archivo | Caso |
|----|---------|------|
| T-LOGIN-1 | `LoginPage.test.tsx` (nuevo) | Render hero + “Iniciar sesión”; submit llama login mock |
| T-LOGIN-2 | `PasswordField.test.tsx` | Toggle cambia type |
| T-SHELL-1 | `AppShell.test.tsx` o ampliar `AppSidebar.test.tsx` | Con `expanded=true`, main no tiene clase de overlay (snapshot estructura flex) |
| T-MENU-1 | `UserMenu.test.tsx` (nuevo o ampliar) | Escape cierra menú |

No Playwright en este ticket (cubierto por FE-QA-001).

## 6. Orden de implementación (`/ejecutar`)

1. `useSidebarRail` + `AppShell` layout push + CSS.
2. `AppSidebar` quitar overlay behavior.
3. `UserMenu` Escape + z-index.
4. `login.css` + `PasswordField` + `LoginPage` split.
5. Tests + `tsc` + build.

## 7. Verificación manual

1. Desktop: pasar mouse por rail → contenido se estrecha, texto no queda debajo del menú.
2. Login 375px y 1280px.
3. Tab por sidebar y menú usuario.
4. `prefers-reduced-motion` en DevTools.

## 8. Rollback

Revertir commit Web; sin SQL/API.
