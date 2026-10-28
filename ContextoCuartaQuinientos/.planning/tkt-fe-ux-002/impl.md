[← design](design.md) | [← index](_index.md)

# impl.md — FE-UX-002

## Cambios

| Artefacto | Acción |
|-----------|--------|
| `LoginPage.tsx`, `login.css`, `loginCopy.ts` | Split hero + card, skip link |
| `PasswordField.tsx` | Toggle mostrar contraseña |
| `AppShell.tsx`, `AppSidebar.tsx`, `SidebarRailToggle.tsx`, `useSidebarCollapsed.ts`, `app-shell.css` | Layout push; toggle arriba; sin overlay sobre `main` |
| `SidebarItem.tsx`, `useCollapsedNavHint.tsx` | Tooltips rail (portal) |
| `UserMenu.tsx` | Escape cierra dropdown; `go()` cierra al navegar |
| Tests | `LoginPage.test.tsx`, `PasswordField.test.tsx`, `UserMenu.test.tsx`, `AppSidebar.test.tsx`, `SidebarItem.test.tsx`, `AppShell.test.tsx` |

## Desviaciones respecto a spec.md (autorizadas en design §3)

- **M2 / CA-4 (hover + delays):** sustituido por colapso explícito con botón y `localStorage`; sin expand al hover → CA-4 **no aplica** (no hay parpadeo por hover).
- **M2 teclado (Escape en sidebar):** no aplica al modelo toggle; Escape en `MobileDrawer` y `UserMenu` sí.

## Verificación final

### Criterios de aceptación

- [x] **CA-1:** Login `lg+` hero + card (`login.css` grid); tests `LoginPage.test.tsx`.
- [x] **CA-2:** `PasswordField` con `aria-pressed` + `type="button"`; `PasswordField.test.tsx`.
- [x] **CA-3:** `AppShell` flex push (`aside` ancho inline + `main.flex-1`); sin clase overlay; `AppShell.test.tsx` colapsado/expandido.
- [x] **CA-4:** No aplica — sin rail por hover (design iteración 2).
- [x] **CA-5:** `UserMenu` Escape + cierre al navegar; `UserMenu.test.tsx`.
- [x] **CA-6:** `npm test` 201 passed; `npm run build` (`tsc -b` + vite) OK — 2026-10-27.
- [ ] **CA-7 (Should):** Contraste/foco — revisión visual manual recomendada; sin auditoría automatizada WCAG.

### Pruebas T-SQL (tester-sql)

- No aplica (sin SQL).

### Pruebas contrato C# xUnit

- No aplica.

### Pruebas API

- No aplica (sin endpoints).

### Matriz Vitest (design §5)

| ID | Evidencia |
|----|-----------|
| T-LOGIN-1 | `LoginPage.test.tsx` |
| T-LOGIN-2 | `PasswordField.test.tsx` |
| T-SHELL-1 | `AppShell.test.tsx` |
| T-MENU-1 | `UserMenu.test.tsx` |

### QA Checklist

- [x] Happy path login + shell push
- [x] Casos automatizados shell/menú/login
- [ ] Smoke manual SGR menú largo (`DB-007`) — recomendado pre-merge
- [ ] `prefers-reduced-motion` — smoke DevTools

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** tras fixes TS + tests F002/F003 (revisión 2026-10-27)
- auditor-seguridad: No aplica (sin endpoints/SQL)

### Desviaciones detectadas

- `spec.md` §3 M2 (hover) vs implementación toggle — documentado arriba; alinear spec en `/completar`.

### Pendientes

- Smoke manual opcional (CA-7, menú SGR).
- APIS.md: No aplica (sin endpoints).
