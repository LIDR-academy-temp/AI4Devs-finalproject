# Impl: tkt-fe-theme-001-themes

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- [2026-11-03] IDs de tema `classic-light` / `classic-dark` (alineado a `_classic.css` del borrador) en lugar de `classic` / `classic-dark` del design.
- [2026-11-03] Preferencia inicial sin storage: `hearth-auto` (AC-04) en lugar de `hearth-light` fijo del design.
- [2026-11-03] Iconos Lucide (convención del repo) en lugar de Heroicons del design.

## Implementación realizada

- Tokens multi-tema en `Web/src/styles/themes/` + imports en `index.css`.
- `ThemeContext` / `themePreference`: `data-theme`, localStorage `cq-theme`, migración legacy `light`/`dark`.
- `ThemeSwitcher` en header del shell; toggle oscuro también en `UserMenu`.
- Sidebar/header consumen `--color-sidebar-bg` / `--color-header-bg`.
- Guía `Web/src/styles/themes/README.md`.

## Archivos modificados

- `Web/src/index.css`
- `Web/src/styles/app-shell.css`
- `Web/src/styles/themes/*`
- `Web/src/features/theme/ThemeContext.tsx`
- `Web/src/shared/lib/themePreference.ts` (+ tests)
- `Web/src/shared/components/ThemeSwitcher/*`
- `Web/src/shared/components/AppShell.tsx`
- `Web/src/shared/components/UserMenu.tsx`
- `Web/src/test/setup.ts`, `Web/src/test/stubTheme.ts`

## Auditoría SQL

- Estado: N/A
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: APROBADO (post-corrección F001/F002)
- Hallazgos corregidos: toggle `hearth-auto`, sync `html.dark`, tooltip sidebar, tests OS dark
- Correcciones: ver commits en rama `feature/tkt-fe-theme-001-themes`

## Scripts de prueba creados

### T-SQL unitarias
- No aplica

### Contrato C# xUnit
- No aplica

### Vitest
- `ThemeSwitcher.test.tsx` (4 casos)
- `themePreference.test.ts` (5 casos)

## Resultado contra criterios de aceptación

- [x] AC-01 Hearth Light (#F7F3EE, sidebar #18181F, acento #E85D4A)
- [x] AC-02 Modo oscuro hearth-dark (#0F0F14, texto #F0EDE8)
- [x] AC-03 Persistencia localStorage
- [x] AC-04 `hearth-auto` + `@media (prefers-color-scheme: dark)`
- [x] AC-05 Proxy automatizado (287 Vitest + build); smoke visual humano en Pendientes
- [x] AC-06 Contraste documentado en design §12
- [x] AC-07 ThemeSwitcher: button + select accesibles

## Verificación final

### Criterios de aceptación

- [x] AC-01 a AC-04, AC-06, AC-07 verificados (código + tests)
- [x] AC-05: sin regresión en suite; validación visual en navegador pendiente pre-merge (checklist abajo)

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica

### Pruebas frontend

- `tsc --noEmit`: OK (2026-11-03)
- `npm test -- --run`: 287 passed, 2 skipped (91 files)
- `vite build --mode development`: OK

### QA Checklist

- [x] Happy path: cambio de tema sin reload (Vitest ThemeSwitcher + themePreference)
- [x] Edge: `hearth-auto` + OS dark, migración `light`/`dark` legacy
- [x] Regresión: suite completa verde
- [ ] Smoke visual manual: login, home, sidebar colapsado, dropdown usuario, una pantalla admin `.cq-admin-page`

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: APROBADO (re-auditoría /revisar 2026-11-03)
- auditor-seguridad: No aplica (sin endpoints ni input remoto nuevo)

### Desviaciones detectadas

- IDs `classic-light` / `classic-dark` vs `classic` en design (documentado en Ajustes)
- Default `hearth-auto` vs `hearth-light` en design (AC-04)

### Pendientes

- AC-05: smoke visual ~5 min en Chrome antes de merge PR
- APIS.md: No aplica (sin endpoints)
