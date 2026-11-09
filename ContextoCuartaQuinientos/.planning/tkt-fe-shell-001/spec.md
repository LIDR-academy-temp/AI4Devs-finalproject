[← index](_index.md) | design → (pendiente)

# spec.md — FE-SHELL-001: Shell con sidebar y navegación por perfil

> **Tipo:** Feature (transversal UI)

## User story

Como usuario autenticado, quiero un layout con menú lateral según mi perfil, para encontrar todos los módulos del portal sin depender de enlaces sueltos en Inicio.

## Contexto / problema

| Tipo | Fuente |
|------|--------|
| Requerimiento | [ENTREGA_MODULOS.md](../ENTREGA_MODULOS.md); readme §1.3 (sidebar, admin vs residente) |
| Técnico | [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md); `AppShell.tsx`, `PrivateRoute`, `AdminRoute` |
| Mockup | readme §1.3 wireframes Mermaid (Admin: Dashboard, Tickets, Finanzas, Residentes, …) |

**Actual:** `AppShell` solo tiene header + `Outlet`; la navegación vive en `HomePage`.

**Esperado:** sidebar persistente en rutas autenticadas; ítems filtrados por `session.perfil` (`Administrador` vs resto); rutas admin bajo `/admin/*`.

## Alcance (MoSCoW)

### Must
- Layout **dos columnas**: sidebar fijo (≥ `md`) + área de contenido; en móvil menú colapsable o drawer `(asumido: botón hamburguesa)`.
- Config central `appNavigation.ts`: `{ path, label, roles[], implemented: boolean }`.
- Ítems **implementados** (enlaces activos): Inicio `/`, Mis tickets `/tickets`, Estado de cuenta `/finanzas/cuenta`, Perfil `/perfil`; admin: Gestión tickets `/admin/tickets`, Finanzas `/admin/finanzas`, **Residentes** `/admin/usuarios` (ruta reservada para FE-041).
- Ítems **no implementados** de ENTREGA_MODULOS: visibles para Admin como deshabilitados + tooltip “Próximamente” (ANM, ENC, ARC, JNT, VTS, VEH, MAS, WMS).
- `AdminRoute` y `PrivateRoute` siguen usando el mismo `AppShell` ampliado.
- Quitar navegación duplicada de `HomePage` (solo resumen KPI; links principales pasan al sidebar).
- Accesibilidad: `<nav aria-label="Principal">`, ítem activo con `aria-current="page"`.
- `tsc --noEmit` + `vite build` sin errores.

### Should
- Resaltar ítem activo según `useLocation().pathname`.
- Trabajador/Guardia: ítems mínimos (Inicio + lo que exista en Fase 1) `(asumido)`.

### Could
- Consumir menú desde API `sgr.Menus` (postergado a ticket de permisos BD).

### Won't
- CRUD de menús/permisos en admin.
- Cambios de contrato auth.
- Implementar pantallas de módulos pendientes.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `frontend:cuartaquinientos-web` | `AppShell`, nuevo `AppSidebar`, `appNavigation.ts`, ajuste `HomePage`, rutas en `App.tsx` (`/admin/usuarios` placeholder o FE-041) |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Rol sensible solo en backend; UI oculta rutas admin al no-Admin | specs/usuarios INV-5 |
| INV-2 | Tokens solo en memoria + cookie refresh | FE-030 |
| INV-3 | Tokens visuales `index.css` / ui-referencia | 20_ui_fuente |

## Criterios de aceptación

- [ ] **CA-1**: Admin ve sidebar con enlaces activos a tickets/finanzas y entrada Residentes.
- [ ] **CA-2**: Residente no ve ítems `/admin/*` ni enlaces clicables a ellos.
- [ ] **CA-3**: Módulo no implementado aparece deshabilitado, no navega.
- [ ] **CA-4**: En `/admin/tickets` el ítem Tickets admin tiene `aria-current="page"`.
- [ ] **CA-5**: Vitest: render sidebar con sesión Admin vs Residente (mín. 2 tests).

## Pasada adversarial (abogado del diablo)

| # | Riesgo | Mitigación en spec |
|---|--------|-------------------|
| R1 | Sidebar y Home duplican links | Must: quitar nav de HomePage |
| R2 | Ruta `/admin/usuarios` sin página rompe demo | Placeholder “En construcción” hasta FE-041 o implementar en el mismo sprint |
| R3 | Guardia/Trabajador sin definición | Should: solo ítems existentes; no inventar pantallas |

**Veredicto adversarial:** APROBADO para `/diseñar` con R2 resuelto (placeholder aceptado).
