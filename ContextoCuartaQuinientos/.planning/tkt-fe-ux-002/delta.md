# Delta: tkt-fe-ux-002-login-shell-nav

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Login en dos columnas (`lg+`): hero con copy (`loginCopy.ts`) + card de formulario; skip link; estilos en `login.css` (`.cq-login-page`).
- `PasswordField`: mostrar/ocultar contraseña con `aria-pressed`.
- Sidebar desktop: rail **colapsado por defecto**; expandir/colapsar con botón superior (`SidebarRailToggle`); preferencia `localStorage` `cq-sidebar-collapsed`.
- Tooltips de ítems en rail vía portal (`useCollapsedNavHint`, `cq-nav-hint-fixed`).
- Tests: `LoginPage`, `PasswordField`, `AppShell` (push colapsado/expandido), `UserMenu` (Escape + navegar cierra), `SidebarItem` (tooltip).

## Comportamiento modificado

- **(Antes):** Rail expandía con hover y sombra sobre `main` (z-index).
- **(Después):** Layout **push**: `aside` con ancho animado (`3.25rem` / `12.5rem`) y `main.flex-1`; sin overlay sobre contenido.

- **(Antes):** Login card centrada simple.
- **(Después):** Paridad visual controlada con MVC `Web_diseño` (hero + card).

- **(Antes):** `UserMenu` sin listener global `Escape`.
- **(Después):** `Escape` cierra; ítems llaman `go()` que cierra antes de `navigate`.

## Comportamiento eliminado

- `useSidebarRail` (expand por hover).
- Botón colapsar al pie del sidebar (movido arriba en iteración final).

## Objetos SQL afectados

N/A.

## Endpoints API afectados

N/A.

## Para el reviewer

- **Qué se hizo:** Login premium + shell con menú lateral que empuja el contenido y toggle explícito.
- **Por qué:** Quejas UX (login plano; menú tapaba el `main`).
- **Riesgo:** Bajo — solo `Web/`; auth sin cambios de contrato.
- **Qué probar:** Login desktop/móvil; toggle menú arriba; tooltips en rail; `UserMenu` Escape; `npm test` + `npm run build`.
- **Rollback:** Revertir commits en `Web/` (sin SQL/API).

## Aprendizajes

- Iteración de diseño (hover → toggle) debe reflejarse en `spec.md` antes del cierre para evitar drift (CA-4 hover obsoleto).

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | Colapso explícito + push layout | Rail hover con delays | Solapamiento y feedback del usuario |
| 2026-10-27 | Toggle colapsar en toolbar superior | Toggle al pie | Descubrimiento UX sin scroll |
