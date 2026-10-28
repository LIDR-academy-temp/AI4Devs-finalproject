[← spec](spec.md) | [← index](_index.md)

# design.md — FE-UX-001: Diseño Técnico del Rediseño UX Integral

| Campo | Valor |
|-------|-------|
| **Ticket** | FE-UX-001 |
| **Fase** | design-ready |
| **Autor** | afonseca@nice.com.mx |
| **Fecha** | 2026-10-23 |
| **Modo calibración** | EVOLVE (V=4, M=4, D=6) |

---

## 1. Decisiones de diseño (ADRs)

### ADR-UX-001: Iconografía con Lucide React
**Decisión:** Usar `lucide-react` para íconos del sidebar y UI general.
**Razón:** Tree-shakeable (solo se importa lo usado), estilo lineal consistente con la estética clean del DS, ~0.5KB por ícono, ya es estándar en ecosistema React/Tailwind. Sin dependencia visual en un kit de componentes.
**Alternativa descartada:** SVG inline manual — mayor mantenimiento y menos consistencia.
**Prerequisito de integración:** Agregar `lucide-react` a `dependencies` (no `devDependencies`) como primer paso de Fase A. Verificar que `npm test` pasa tras la instalación antes de cualquier otro cambio, ya que el tipo `LucideIcon` se importará en `appNavigation.ts` y propagará a todos los consumidores.

### ADR-UX-002: Drawer móvil con estado React + CSS transitions (sin librería)
**Decisión:** El drawer móvil se implementa con un `<aside>` posicionado con `fixed inset-0`, controlado por estado React (`isOpen`), y transiciones CSS (`transform + opacity`). Backdrop con `bg-black/50`.
**Razón:** Evita dependencia en Headless UI o Radix. El patrón es simple (open/close) y no requiere gestión compleja de focus trapping más allá de un `useEffect` con `Escape`.
**Invariante:** INV-4 — no instalar librerías de componentes sin aprobación.

### ADR-UX-003: Navegación agrupada en configuración central
**Decisión:** Extender `appNavigation.ts` con campos `icon`, `group` y `order`. Los grupos se definen como constante separada `NAV_GROUPS`. El componente `AppSidebar` renderiza por grupo.
**Razón:** Mantiene la fuente única de verdad para navegación. Los nuevos campos son opcionales y retrocompatibles.

### ADR-UX-004: UserMenu como componente independiente con dropdown nativo
**Decisión:** Componente `UserMenu.tsx` con dropdown controlado por estado React, posicionado con CSS (`absolute right-0`), cerrado con click-outside listener.
**Razón:** Patrón estándar, testeable, sin dependencias. El NotificationBell ya usa un patrón similar.

### ADR-UX-005: Loading skeletons como componente reutilizable
**Decisión:** Componente `SkeletonCard.tsx` que renderiza placeholders animados con `animate-pulse` de Tailwind. Se usa en `HomePage` y en cualquier vista que cargue datos async.
**Razón:** Mejora percepción de velocidad vs. texto "Cargando…"; pattern establecido.

### ADR-UX-006: Responsive tables con patrón card-stack
**Decisión:** En viewport < 768px, las tablas de admin se transforman en cards apiladas usando clases Tailwind responsive (`hidden md:table-cell` + card visible en móvil).
**Razón:** Scroll horizontal en tablas anchas es mala UX en móvil. Card stack permite escaneo vertical natural.
**Excepción:** Tablas con pocas columnas (≤3) pueden usar scroll horizontal con `overflow-x-auto`.

---

## 2. Estructura de navegación

### 2.1 Modelo de datos extendido — `appNavigation.ts`

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  Home, TicketCheck, Wallet, User, Megaphone, BarChart3,
  FolderOpen, CalendarDays, TreePine, Car, PawPrint,
  Users, Building2, DollarSign, Eye, Warehouse, ClipboardList
} from 'lucide-react'

export type NavGroup = {
  key: string
  label: string
  /** Si es admin-only o residente-only */
  perfil?: 'Administrador' | 'Residente'
}

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
  group: string
  adminOnly?: boolean
  residentOnly?: boolean
  implemented: boolean
  order: number
}

export const NAV_GROUPS: NavGroup[] = [
  { key: 'principal', label: '' },                           // Sin header, solo Inicio
  { key: 'mi-cuenta', label: 'Mi Cuenta', perfil: 'Residente' },
  { key: 'comunidad', label: 'Mi Comunidad', perfil: 'Residente' },
  { key: 'registros', label: 'Mis Registros', perfil: 'Residente' },
  { key: 'gestion', label: 'Gestión', perfil: 'Administrador' },
  { key: 'comunidad-admin', label: 'Comunidad', perfil: 'Administrador' },
  { key: 'registro-admin', label: 'Registro', perfil: 'Administrador' },
]

export const APP_NAV: NavItem[] = [
  // ── Principal ──
  { path: '/', label: 'Inicio', icon: Home, group: 'principal', order: 0, implemented: true },

  // ── Residente: Mi Cuenta ──
  { path: '/perfil', label: 'Mi Perfil', icon: User, group: 'mi-cuenta', residentOnly: true, order: 10, implemented: true },
  { path: '/finanzas/cuenta', label: 'Estado de cuenta', icon: Wallet, group: 'mi-cuenta', residentOnly: true, order: 11, implemented: true },

  // ── Residente: Mi Comunidad ──
  { path: '/anuncios', label: 'Anuncios', icon: Megaphone, group: 'comunidad', residentOnly: true, order: 20, implemented: true },
  { path: '/encuestas', label: 'Encuestas', icon: BarChart3, group: 'comunidad', residentOnly: true, order: 21, implemented: true },
  { path: '/juntas', label: 'Juntas', icon: CalendarDays, group: 'comunidad', residentOnly: true, order: 22, implemented: true },
  { path: '/archivos', label: 'Archivos', icon: FolderOpen, group: 'comunidad', residentOnly: true, order: 23, implemented: true },
  { path: '/areas-comunes', label: 'Áreas Comunes', icon: TreePine, group: 'comunidad', residentOnly: true, order: 24, implemented: true },

  // ── Residente: Mis Registros ──
  { path: '/tickets', label: 'Mis Tickets', icon: TicketCheck, group: 'registros', residentOnly: true, order: 30, implemented: true },
  { path: '/mis-vehiculos', label: 'Mis Vehículos', icon: Car, group: 'registros', residentOnly: true, order: 31, implemented: true },
  { path: '/mis-mascotas', label: 'Mis Mascotas', icon: PawPrint, group: 'registros', residentOnly: true, order: 32, implemented: true },

  // ── Admin: Gestión ──
  { path: '/admin/tickets', label: 'Tickets', icon: ClipboardList, group: 'gestion', adminOnly: true, order: 40, implemented: true },
  { path: '/admin/usuarios', label: 'Residentes', icon: Users, group: 'gestion', adminOnly: true, order: 41, implemented: true },
  { path: '/admin/casas', label: 'Casas', icon: Building2, group: 'gestion', adminOnly: true, order: 42, implemented: true },
  { path: '/admin/finanzas', label: 'Finanzas', icon: DollarSign, group: 'gestion', adminOnly: true, order: 43, implemented: true },

  // ── Admin: Comunidad ──
  { path: '/admin/anuncios', label: 'Anuncios', icon: Megaphone, group: 'comunidad-admin', adminOnly: true, order: 50, implemented: true },
  { path: '/admin/encuestas', label: 'Encuestas', icon: BarChart3, group: 'comunidad-admin', adminOnly: true, order: 51, implemented: true },
  { path: '/admin/juntas', label: 'Juntas', icon: CalendarDays, group: 'comunidad-admin', adminOnly: true, order: 52, implemented: true },
  { path: '/admin/archivos', label: 'Archivos', icon: FolderOpen, group: 'comunidad-admin', adminOnly: true, order: 53, implemented: true },

  // ── Admin: Registro ──
  { path: '/admin/visitas', label: 'Visitas', icon: Eye, group: 'registro-admin', adminOnly: true, order: 60, implemented: true },
  { path: '/admin/vehiculos', label: 'Vehículos', icon: Car, group: 'registro-admin', adminOnly: true, order: 61, implemented: true },
  { path: '/admin/mascotas', label: 'Mascotas', icon: PawPrint, group: 'registro-admin', adminOnly: true, order: 62, implemented: true },
  { path: '/admin/almacen', label: 'Almacén', icon: Warehouse, group: 'registro-admin', adminOnly: true, order: 63, implemented: true },
]
```

### 2.2 Agrupación visual del sidebar

```
┌─────────────────────────┐
│  🏠 Inicio              │  ← grupo 'principal' (sin header)
│─────────────────────────│
│  MI CUENTA              │  ← header de grupo (caps, neutral, text-xs)
│  👤 Mi Perfil           │
│  💰 Estado de cuenta    │
│─────────────────────────│
│  MI COMUNIDAD           │
│  📢 Anuncios            │
│  📊 Encuestas           │
│  📅 Juntas              │
│  📁 Archivos            │
│  🌲 Áreas Comunes       │
│─────────────────────────│
│  MIS REGISTROS          │
│  🎫 Mis Tickets         │
│  🚗 Mis Vehículos       │
│  🐾 Mis Mascotas        │
└─────────────────────────┘
```

(Vista Admin tiene sus propios 3 grupos: Gestión, Comunidad, Registro)

---

## 3. Arquitectura de componentes

### 3.1 Árbol de componentes modificado

```
App
└─ Routes
   ├─ LoginPage (standalone, sin shell)
   ├─ RequireSessionRoute
   │  └─ CambiarPasswordPage
   ├─ PrivateRoute → AppShell ✏️
   │  ├─ AppShell ✏️
   │  │  ├─ Header ✏️
   │  │  │  ├─ Logo + AppName
   │  │  │  ├─ MobileMenuButton 🆕 (hamburguesa, solo < md)
   │  │  │  ├─ Breadcrumbs 🆕 (should)
   │  │  │  ├─ NotificationBell (existente)
   │  │  │  └─ UserMenu 🆕 (reemplaza nombre + logout)
   │  │  ├─ MobileDrawer 🆕 (overlay < md)
   │  │  │  └─ AppSidebar ✏️ (reutilizado dentro del drawer)
   │  │  ├─ AppSidebar ✏️ (desktop, oculto < md)
   │  │  │  ├─ SidebarGroup 🆕 (header + items)
   │  │  │  │  └─ SidebarItem 🆕 (icon + label + active state)
   │  │  │  └─ CollapseToggle 🆕
   │  │  └─ <Outlet /> (contenido)
   │  └─ [todas las páginas residente]
   └─ AdminRoute → AppShell (mismo shell)
      └─ [todas las páginas admin]
```

Leyenda: ✏️ = modificado, 🆕 = nuevo

### 3.2 Componentes nuevos

| Componente | Archivo | Responsabilidad |
|-----------|---------|----------------|
| `UserMenu` | `shared/components/UserMenu.tsx` | Dropdown con avatar/iniciales, nombre, rol badge, links a perfil/password, logout |
| `MobileDrawer` | `shared/components/MobileDrawer.tsx` | Overlay `fixed inset-0 z-40` con backdrop + sidebar slide-in; controlado por `isOpen` prop |
| `SidebarGroup` | `shared/components/SidebarGroup.tsx` | Renderiza header de grupo (si tiene label) + lista de `SidebarItem` |
| `SidebarItem` | `shared/components/SidebarItem.tsx` | Ícono + label + estado activo; en modo collapsed solo muestra ícono con tooltip |
| `CollapseToggle` | `shared/components/CollapseToggle.tsx` | Botón chevron para colapsar/expandir sidebar en desktop |
| `Breadcrumbs` | `shared/components/Breadcrumbs.tsx` | Genera breadcrumbs desde `useLocation` + `APP_NAV` labels. **Rutas dinámicas** (ej: `/encuestas/:id`): segmentos con patrón UUID/numérico se resuelven con un `breadcrumbMap` configurable o se muestran como "Detalle"; cada página puede pasar un label override via `<Outlet context>` o un hook `useBreadcrumbLabel` |
| `SkeletonCard` | `shared/components/SkeletonCard.tsx` | Placeholder animado `animate-pulse` con dimensiones configurables |
| `QuickAccessCard` | `shared/components/QuickAccessCard.tsx` | Card compacta con ícono + label + flecha para accesos rápidos en Home |

### 3.3 Componentes modificados

| Componente | Cambios |
|-----------|---------|
| `AppShell.tsx` | Integra `MobileDrawer`, `UserMenu`, `Breadcrumbs`; pasa estado `sidebarCollapsed` al sidebar; header responsive |
| `AppSidebar.tsx` | Refactored: recibe `collapsed` prop; renderiza `SidebarGroup` por grupo; sin lógica propia de datos |
| `appNavigation.ts` | Campos `icon`, `group`, `order` en cada item; `NAV_GROUPS` exportado; `navItemsForPerfil` agrupa por `group` |
| `HomePage.tsx` | Saludo dinámico, `QuickAccessCard` grid, `SkeletonCard` durante loading |
| `LoginPage.tsx` | Patrón SVG decorativo en fondo, nombre condominio prominente, fade-in |

---

## 4. Wireframes lógicos

### 4.1 AppShell — Desktop (sidebar expandido)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER  bg-primary-dark                                      │
│ ┌──────┐                              ┌──────┬─────┬───────┐ │
│ │ Logo │  CuartaQuinientos            │ 🔔   │ AF ▾│ Admin │ │
│ └──────┘                              └──────┴─────┴───────┘ │
├────────────┬─────────────────────────────────────────────────┤
│ SIDEBAR    │ CONTENIDO                                       │
│ bg-primary │                                                 │
│ -dark      │  Inicio > Tickets                               │
│ w-56 / w-16│  ─────────────────                              │
│            │                                                 │
│ 🏠 Inicio  │  <Outlet />                                     │
│ ──────────│                                                 │
│ MI CUENTA  │                                                 │
│ 👤 Perfil  │                                                 │
│ 💰 Cuenta  │                                                 │
│ ──────────│                                                 │
│ MI COMUNID │                                                 │
│ 📢 Anuncio │                                                 │
│ …          │                                                 │
│ ──────────│                                                 │
│ MIS REG.  │                                                 │
│ 🎫 Tickets │                                                 │
│ …          │                                                 │
│            │                                                 │
│ [« ]       │  ← toggle collapse                              │
└────────────┴─────────────────────────────────────────────────┘
```

### 4.2 AppShell — Desktop (sidebar colapsado)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────┬─────────────────────────────────────────────────────────┤
│ w16│ CONTENIDO (más ancho)                                   │
│    │                                                         │
│ 🏠 │  Inicio > Tickets                                       │
│ ── │  ─────────────────                                      │
│ 👤 │                                                         │
│ 💰 │  <Outlet />                                             │
│ ── │                                                         │
│ 📢 │                                                         │
│ …  │                                                         │
│    │                                                         │
│ [»]│                                                         │
└────┴─────────────────────────────────────────────────────────┘
```

### 4.3 AppShell — Móvil (< 768px)

```
┌──────────────────────────┐
│ HEADER                   │
│ [☰]  C500    🔔  [AF ▾] │
├──────────────────────────┤
│ CONTENIDO (100% width)   │
│                          │
│  Buenos días, Ariel      │
│                          │
│ ┌──────┐ ┌──────┐       │
│ │Ticket│ │Cuenta│       │
│ │  3   │ │$1200 │       │
│ └──────┘ └──────┘       │
│                          │
│ Accesos rápidos          │
│ ┌────────────────────┐  │
│ │ 🎫 Nuevo ticket  → │  │
│ ├────────────────────┤  │
│ │ 💰 Pagar cuota   → │  │
│ └────────────────────┘  │
└──────────────────────────┘

[☰] tap → drawer overlay:
┌──────────┬───────────────┐
│ DRAWER   │ backdrop      │
│ slide-in │ bg-black/50   │
│ z-40     │               │
│          │ (tap = close) │
│ [✕]      │               │
│ 🏠 Inicio│               │
│ ─────── │               │
│ MI CUENTA│               │
│ 👤 Perfil│               │
│ 💰 Cuenta│               │
│ ─────── │               │
│ …        │               │
└──────────┴───────────────┘
```

### 4.4 UserMenu — Dropdown

```
┌─────────────────────┐
│  ┌──┐               │
│  │AF│ Ariel Fonseca  │
│  └──┘ Admin ▾        │
│  ┌─────────────────┐ │
│  │ 👤 Mi Perfil     │ │
│  │ 🔑 Cambiar pass  │ │
│  │ 🔔 Notificaciones│ │
│  │─────────────────│ │
│  │ 🚪 Cerrar sesión │ │
│  └─────────────────┘ │
└─────────────────────┘
```

### 4.5 HomePage — Residente

```
┌───────────────────────────────────────────┐
│  Buenos días, Ariel 👋                    │
│  Residente · Unidad 42                    │
│                                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │    │  ← skeleton mientras carga
│  └─────────┘ └─────────┘ └─────────┘    │
│          ↓ carga ↓                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │🎫 Tickets│ │💰 Cuota  │ │🔔 Notif  │    │
│  │  activos │ │  del mes │ │ sin leer │    │
│  │    3     │ │ $1,200   │ │    5     │    │
│  │          │ │ Pendiente│ │          │    │
│  └─────────┘ └─────────┘ └─────────┘    │
│                                           │
│  ⚠️ Tienes cuotas vencidas por regular…  │
│                                           │
│  Accesos rápidos                          │
│  ┌──────────────────┐ ┌────────────────┐ │
│  │ 🎫 Nuevo ticket → │ │ 💰 Ver cuenta →│ │
│  ├──────────────────┤ ├────────────────┤ │
│  │ 📢 Anuncios    → │ │ 📅 Juntas    → │ │
│  └──────────────────┘ └────────────────┘ │
└───────────────────────────────────────────┘
```

---

## 5. Tokens CSS adicionales — `index.css`

```css
/* Agregar al @theme existente: */
@theme {
  /* ── Shadows ── */
  --shadow-card:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-dropdown: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);

  /* ── Sidebar ── */
  --sidebar-width:      14rem;   /* 224px — expandido */
  --sidebar-width-collapsed: 4rem; /* 64px — colapsado */

  /* ── Transitions ── */
  --transition-fast:    150ms ease;
  --transition-normal:  200ms ease-out;
  --transition-sidebar: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Keyframes para drawer ── */
@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideInDown {
  from { transform: translateY(-8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
```

---

## 6. Microinteracciones (Motion spec)

| Elemento | Trigger | Efecto | Duración | Easing |
|----------|---------|--------|----------|--------|
| Sidebar collapse | Click toggle | Width `14rem → 4rem`; labels fade-out; íconos centrados | 250ms | cubic-bezier(0.4,0,0.2,1) |
| Sidebar item hover | mouseenter | `bg-white/10` + escala texto 1.0→1.0 (sin bounce) | 150ms | ease |
| Sidebar item active | route match | `bg-white/15` + border-left 2px `primary-light` | instant | — |
| Mobile drawer open | click hamburger | Backdrop `fadeIn` + sidebar `slideInLeft` | 250ms | ease-out |
| Mobile drawer close | click backdrop/X/item | Reverse: sidebar slide-out + backdrop fade-out | 200ms | ease-in |
| Card hover | mouseenter | `shadow-card → shadow-card-hover` | 150ms | ease |
| Button active | mousedown | `scale(0.98)` | 100ms | ease |
| Button focus-visible | tab | `ring-2 ring-primary-light ring-offset-2` | instant | — |
| Skeleton pulse | auto (loading) | `animate-pulse` Tailwind (opacity 0.5 → 1 → 0.5) | 2s loop | ease-in-out |
| UserMenu dropdown | click avatar | `slideInDown` | 150ms | ease-out |
| Toast notification | trigger | Slide-in from top + auto-dismiss after 4s | 300ms in / 200ms out | ease |
| Login page | mount | Card `fadeIn` | 400ms | ease |

**prefers-reduced-motion:** Todas las transiciones se deshabilitan con `@media (prefers-reduced-motion: reduce)` — cambios instantáneos sin animación.

---

## 7. Responsive breakpoints

| Breakpoint | Tailwind | Comportamiento |
|-----------|----------|---------------|
| < 640px (xs) | default | Sidebar drawer; 1 columna; cards apiladas; header compacto |
| 640-767px (sm) | `sm:` | Sidebar drawer; 2 columnas en grid de cards |
| 768-1023px (md) | `md:` | Sidebar visible colapsado por defecto; 2 columnas |
| 1024-1279px (lg) | `lg:` | Sidebar expandido; 2-3 columnas en grids |
| ≥ 1280px (xl) | `xl:` | Layout completo; max-w-6xl centrado |

---

## 8. Accesibilidad

| Requisito | Implementación |
|-----------|---------------|
| Sidebar como `<nav aria-label="Principal">` | Mantener de FE-SHELL-001 |
| Item activo `aria-current="page"` | Mantener |
| Drawer: `role="dialog"`, `aria-modal="true"`, `aria-label="Menú de navegación"` | MobileDrawer |
| Focus trap en drawer abierto: tab cycle entre items del drawer | useEffect con keydown |
| Escape cierra drawer y dropdown | keydown listener |
| UserMenu button: `aria-expanded`, `aria-haspopup="menu"` | UserMenu |
| Dropdown items: `role="menuitem"` | UserMenu |
| Skip link: `<a href="#main-content" class="sr-only focus:not-sr-only">` | AppShell |
| Skeleton: `aria-busy="true"`, `aria-label="Cargando contenido"` | SkeletonCard |
| `prefers-reduced-motion` respetado | Global CSS |
| Contraste WCAG AA en todos los nuevos componentes | Verificar con herramienta |

---

## 9. Plan de implementación por fases

### Fase A — Fundación (sin romper nada)
1. `npm install lucide-react` — única dependencia nueva.
   - **Verificación:** ejecutar `npm test` inmediatamente después de instalar para confirmar que la dependencia no rompe nada antes de continuar.
2. Extender `appNavigation.ts` con campos `icon`, `group`, `order` y `NAV_GROUPS`.
3. Agregar tokens CSS nuevos (shadows, sidebar vars, keyframes) a `index.css`.
4. Crear `SkeletonCard.tsx`, `QuickAccessCard.tsx` — componentes aislados.

### Fase B — Sidebar agrupado + íconos
5. Crear `SidebarGroup.tsx` y `SidebarItem.tsx`.
6. Refactorear `AppSidebar.tsx` para usar grupos; agregar prop `collapsed`.
7. Crear `CollapseToggle.tsx`.
8. Verificar que sidebar funciona igual que antes con la nueva estructura.
9. **Actualizar `AppSidebar.test.tsx`:** los tests existentes que validan links por `name` (ej: `getByRole('link', { name: 'Residentes' })`) fallarán porque Lucide SVGs dentro del `<a>` modifican el accessible name. Actualizar selectores para reflejar la nueva estructura (ícono + label) manteniendo cobertura equivalente. Correr `npm test` antes de avanzar a Fase C.

### Fase C — Responsive móvil
9. Crear `MobileDrawer.tsx`.
10. Modificar `AppShell.tsx`: agregar hamburguesa (`md:hidden`), integrar drawer.
11. Ocultar sidebar desktop en `< md` (`hidden md:flex`).
12. Verificar navegación completa en viewport móvil.

### Fase D — UserMenu + Header
13. Crear `UserMenu.tsx` con dropdown.
14. Reemplazar en `AppShell.tsx` el bloque nombre+logout por `UserMenu`.
15. Crear `Breadcrumbs.tsx` (should).
16. Agregar skip-link.

### Fase E — HomePage + Login
17. Refactorear `HomePage.tsx`: saludo dinámico, skeleton loading, accesos rápidos.
18. Mejorar `LoginPage.tsx`: branding visual, fade-in.

### Fase F — Responsive global + polish
19. Auditar todas las páginas de admin para responsive (tablas → cards en móvil).
20. Ajustar paddings responsive en todas las `*Page.tsx`.
21. Aplicar microinteracciones CSS (hover cards, button feedback, toasts).
22. Verificar accesibilidad (contraste, focus, keyboard nav, screen reader).

### Fase G — Verificación
23. `tsc --noEmit` sin errores.
24. `vite build` exitoso.
25. `npm test` — tests existentes pasan.
26. Revisión visual en 4 viewports: 375px, 768px, 1024px, 1440px.
27. Verificar con ambos perfiles (Admin y Residente).

---

## 10. Archivos afectados (delta estimado)

| Acción | Archivo | Cambios |
|--------|---------|---------|
| 🆕 Crear | `shared/components/UserMenu.tsx` | ~80 líneas |
| 🆕 Crear | `shared/components/MobileDrawer.tsx` | ~60 líneas |
| 🆕 Crear | `shared/components/SidebarGroup.tsx` | ~30 líneas |
| 🆕 Crear | `shared/components/SidebarItem.tsx` | ~40 líneas |
| 🆕 Crear | `shared/components/CollapseToggle.tsx` | ~20 líneas |
| 🆕 Crear | `shared/components/Breadcrumbs.tsx` | ~50 líneas |
| 🆕 Crear | `shared/components/SkeletonCard.tsx` | ~25 líneas |
| 🆕 Crear | `shared/components/QuickAccessCard.tsx` | ~30 líneas |
| ✏️ Modificar | `shared/navigation/appNavigation.ts` | +íconos, +groups, +order, +NAV_GROUPS |
| ✏️ Modificar | `shared/components/AppShell.tsx` | Header responsive, UserMenu, hamburguesa, drawer, breadcrumbs |
| ✏️ Modificar | `shared/components/AppSidebar.tsx` | Refactor a grupos, collapsed prop, transiciones |
| ✏️ Modificar | `pages/HomePage.tsx` | Saludo, skeletons, accesos rápidos |
| ✏️ Modificar | `pages/LoginPage.tsx` | Branding visual |
| ✏️ Modificar | `index.css` | Tokens adicionales, keyframes, reduced-motion |
| ✏️ Modificar | `pages/Admin*.tsx` (batch) | Responsive tables → cards en móvil |
| 📦 Instalar | `lucide-react` | Única dependencia nueva |

**Estimación total:** ~500-700 líneas nuevas, ~200 líneas modificadas.

---

## 11. Riesgos técnicos y mitigación

| # | Riesgo | Mitigación |
|---|--------|-----------|
| R1 | `lucide-react` incrementa bundle | Tree-shaking: solo importar íconos usados (~15 íconos × 0.5KB = ~7.5KB gzip) |
| R2 | Sidebar collapse causa reflow en contenido | `transition: width` con `overflow: hidden` + `flex-shrink-0`; contenido usa `min-w-0 flex-1` |
| R3 | Focus trap en drawer no cubre todos los edge cases | Listener de `Tab` + `Shift+Tab` en primer/último elemento focusable; Escape como fallback |
| R4 | z-index wars con modals existentes | Escala definida: drawer=40, backdrop=39, dropdown=50, modal=60 |
| R5 | Responsive batch rompe algún layout específico | Hacer cada página una a una, verificar, commitear |
| R6 | `localStorage` para sidebar preference no disponible | Fallback: sidebar expandido por defecto si `getItem` falla |
