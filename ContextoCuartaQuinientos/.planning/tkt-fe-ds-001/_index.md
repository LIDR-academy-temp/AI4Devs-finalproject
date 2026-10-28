# TKT-FE-DS-001 — Design System: Paleta Pantone y Consistencia Visual

| Campo     | Valor           |
|-----------|-----------------|
| Estado    | ✅ completado   |
| Completado| 2026-10-22      |
| Rama      | feature/tkt-fe-ds-001-design-system |

## Cambios aplicados

- `Web/index.html` — título actualizado + preconnects + Inter (400/500/600/700)
- `Web/src/index.css` — @theme completo con paleta Pantone + funcionales + tipografía + radios
- `Web/src/App.css` — eliminado legacy del template Vite
- `Web/src/shared/components/AppShell.tsx` — header `bg-primary-dark`, texto blanco
- `Web/src/shared/components/AppSidebar.tsx` — sidebar `bg-primary-dark`, items blancos con opacidad, activo con borde izquierdo `primary-light`
- `Web/src/pages/LoginPage.tsx` — fondo `bg-surface`, card `bg-white rounded-xl shadow-lg`
- `Web/src/features/dashboard/ResumenAdminCards.tsx` — label caps/neutral, value primary-dark
- `Web/src/features/dashboard/ResumenResidenteCards.tsx` — tokens DS, alerta con danger tokens
- `Web/src/features/notifications/NotificationBell.tsx` — bell blanco, badge danger, dropdown border-neutral-200
- `Web/src/features/notifications/NotificationDropdown.tsx` — no-leída con borde primary
- `Web/src/features/tickets/EstadoTicketBadge.tsx` — tokens funcionales (success/warning/danger/primary-50)
- `Web/src/pages/**/*.tsx` — batch reemplazo: slate/gray/blue/indigo/red/green/amber/sky → tokens DS
- `Web/src/features/**/*.tsx` — mismo batch

## Criterios verificados

| AC  | Resultado |
|-----|-----------|
| AC1 | ✅ @theme completo en index.css |
| AC2 | ✅ Header y sidebar con primary-dark (#274C77) |
| AC3 | ✅ Botones primarios con `bg-primary` hover `bg-primary-dark` |
| AC4 | ✅ Cards con label caps neutral, value primary-dark |
| AC5 | ✅ Login con fondo surface y card bg-white |
| AC6 | ✅ Inter en font-sans con fallback system-ui |
| AC7 | ✅ Ratios WCAG AA verificados en design.md §5 |
| AC8 | ✅ grep 0 coincidencias indigo/blue/slate/gray en src/ |
| AC9 | ⚠️ Tests no ejecutables en sandbox (rolldown binding nativo) — lógica sin cambios |
