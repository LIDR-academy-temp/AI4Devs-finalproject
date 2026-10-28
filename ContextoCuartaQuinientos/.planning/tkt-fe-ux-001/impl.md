[← design](design.md) | [← index](_index.md)

# impl.md — FE-UX-001

> Implementación **distribuida** en el tiempo: shell inicial ([[FE-SHELL-001]]), navegación SGR ([[SGR-FE-001]]), residente M5 ([[FE-CRUD-004]]), login/shell push ([[FE-UX-002]]). Este ticket cierra el alcance acordado del rediseño transversal; lo no entregado queda documentado en [delta.md](delta.md) como diferido.

## Artefactos Web (verificados en repo)

| Área | Componentes |
|------|-------------|
| Shell | `AppShell.tsx`, `app-shell.css`, `MobileDrawer.tsx`, skip link |
| Sidebar | `AppSidebar.tsx`, `SidebarGroup.tsx`, `SidebarItem.tsx`, `SidebarRailToggle.tsx`, `useSidebarCollapsed.ts`, `useCollapsedNavHint.tsx` |
| Nav | `appNavigation.ts`, `menuToNav.ts`, `NavegacionContext` / `useNavegacionMenus` |
| Usuario | `UserMenu.tsx`, `NotificationBell` en header |
| Home | `HomePage.tsx`, `QuickAccessCard.tsx`, `SkeletonCard.tsx`, `Resumen*Cards` |
| Breadcrumbs | `Breadcrumbs.tsx` (desktop `md+` en header) |
| Login | Cubierto por [[FE-UX-002]] (`LoginPage`, `login.css`, `PasswordField`) |
| Íconos | `lucide-react` |

## Verificación — criterios de aceptación (spec §7)

| # | Estado | Evidencia |
|---|--------|-----------|
| AC1 | [x] | Grupos + íconos: `AppSidebar` + SGR/`APP_NAV`; tests `AppSidebar.test.tsx` |
| AC2 | [x] | Toggle + transición: `useSidebarCollapsed`, `SidebarRailToggle`, `app-shell.css`; `AppShell.test.tsx` |
| AC3 | [x] | Hamburger + drawer: `AppShell` `md:hidden`, `MobileDrawer` |
| AC4 | [x] | Cierre drawer: backdrop / ítem / patrón existente en `MobileDrawer` |
| AC5 | [x] | `UserMenu`: perfil, password, notificaciones, logout; `UserMenu.test.tsx` |
| AC6 | [x] | `HomePage`: saludo, quick access, skeletons; `HomePage.test.tsx` |
| AC7 | [x] | Skeletons en carga dashboard home |
| AC8 | [x] | Hover cards: `QuickAccessCard`, `Resumen*Cards`; botones con `active:scale` en kit |
| AC9 | [x] | Admin: `table-responsive` en `AdminFilterableTable` / `AdminDataTable` (scroll horizontal móvil, per spec) |
| AC10 | [x] | `npm run build` OK (última verificación FE-UX-002); `npm test` 205 passed (2026-10-27) |
| AC11 | [x] | Tests shell/sidebar/menú/home actualizados |
| AC12 | [ ] | Should — contraste/foco: smoke manual WCAG (sin gate CI) |
| AC13 | [x] | Rail colapsado por defecto; expand con toggle; push layout sin overflow (FE-UX-002) |

### Should (spec §4.2) — cierre

| Ítem | Estado |
|------|--------|
| S1 Breadcrumbs | [x] desktop; móvil sin barra (diferido — ver delta) |
| S2 Título módulo + auto-expand grupo | [ ] no implementado (diferido) |
| S3 Login identidad extra | [x] vía FE-UX-002 (hero); sin SVG decorativo adicional |

### Could — no entregado

- C2 modo oscuro, C3 onboarding tour.

### Must M5 toasts globales

- [ ] Sistema toast unificado (solo toasts locales puntuales); diferido.

### Must M6 formularios 2→1 col global

- [ ] Parcial por pantalla (Zod/RHF en CRUD); sin pasada transversal; aceptado al cierre (AC9 cubre listados admin).

## Pruebas

| Capa | Resultado |
|------|-----------|
| T-SQL | N/A |
| xUnit | N/A |
| Vitest | **205/205** passed (2026-10-27) |
| API `.http` | N/A |

## Auditorías

| Agente | Resultado |
|--------|-----------|
| auditor-sql | N/A |
| auditor-codigo | **APROBADO** (cierre consolidado con evidencia FE-UX-002 + suite Vitest verde) |
| auditor-seguridad | N/A |

## Desviaciones / entregas hermanas

- Login y modelo sidebar push: [[FE-UX-002]] (sustituye hover-rail del design original de FE-UX-001).
- Menú dinámico y guard: [[SGR-FE-001]].
- Rutas self-service residente en menú: ajustes en `menuToNav.ts` + `DB-007` (post FE-UX-002).

## Pendientes post-cierre (no bloquean ARCHIVADO)

- Smoke manual menú largo SGR (`DB-007`).
- Ticket futuro opcional: tablas→cards móvil, breadcrumbs móvil, S2, toasts globales.
