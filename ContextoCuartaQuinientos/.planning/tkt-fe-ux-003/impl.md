[← index](_index.md) | [spec](spec.md)

# impl.md — FE-UX-003

## Archivos

- `shared/toast/ToastContext.tsx` — provider global en `main.tsx`
- `shared/navigation/routeCrumbs.ts`, `useRouteCrumbs.ts`
- `Breadcrumbs.tsx`, `ModuleTitle.tsx`, `SidebarGroup.tsx`, `AppShell.tsx`
- `AdminTicketsPage.tsx` — migra a `useToast`
- Tests: `routeCrumbs.test.ts`, `ToastContext.test.tsx`; mock toast en `AdminTicketsPage.test.tsx`

## Verificación final

### Criterios de aceptación (spec Must)

- [x] **M4** — `ToastProvider` + `useToast` (success/error/info), animación `slideInDown`; piloto `AdminTicketsPage`.
- [x] **M1** — Breadcrumbs móvil (fila bajo header en `AppShell`); labels vía `useNavegacion` + `routeCrumbs`.
- [x] **M2** — `ModuleTitle` en header (`lg+`).
- [x] **M3** — Acordeón en grupos con etiqueta (sidebar expandido); `cq-nav-group--active`; grupo con ruta activa se reabre al navegar.

### Pruebas T-SQL (tester-sql)

- No aplica.

### Pruebas contrato C# xUnit

- No aplica.

### Pruebas API

- No aplica (sin endpoints).

### Frontend (Vitest / build)

- `npm test`: **209/209** passed (2026-10-27).
- `tsc --noEmit`: OK.
- `vite build --mode development`: OK.

### QA Checklist

- [x] Happy path toast en admin tickets (código + unit `ToastContext`).
- [x] Crumbs con prefijo SGR / estático.
- [x] Regresión sidebar (`AppSidebar.test.tsx`).
- [ ] Smoke manual: colapsar grupo sidebar; breadcrumbs en 375px.

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (alcance Web acotado; sin secretos; `useToast` falla fuera de provider)
- auditor-seguridad: No aplica (sin API/SQL)

### Desviaciones detectadas

- Grupos del sidebar **abiertos por defecto** al expandir (mejor descubrimiento + tests); el usuario puede colapsar manualmente; ruta activa fuerza reapertura del grupo.

### Pendientes

- Migrar otros toasts locales a `useToast` (fuera de scope Must).
- APIS.md: No aplica (sin endpoints).
- WCAG smoke manual (heredado FE-UX-001/002).
