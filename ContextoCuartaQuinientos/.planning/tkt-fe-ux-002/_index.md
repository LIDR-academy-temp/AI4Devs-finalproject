# FE-UX-002 — Login premium + navegación sin solapamiento

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test | Matriz Vitest en [design.md](design.md) | /test | ✅ |
| Impl | [impl.md](impl.md) | /ejecutar + /revisar | ✅ |
| Delta | [delta.md](delta.md) | /completar | ✅ |

## Metadata

- requerimiento: FE-UX-002
- slug: login-shell-nav
- size: M
- branch sugerida: `feature/fe-ux-002-login-shell`
- created: 2026-10-27
- objetos_clave: `LoginPage`, `AppShell`, `AppSidebar`, `useSidebarCollapsed`, `UserMenu`, `app-shell.css`, `login.css`

## Depende de

- [[FE-UX-001]] · [[FE-DS-001]] · [[FE-SHELL-001]] · [[SGR-FE-001]] (menú dinámico)

## Dominios

[[frontend]] · [[ux]]

## Related

- Referencia visual MVC: `Web_diseño/Web/Views/Login/Login.cshtml`, `site-redesign.css` (`.cq-login`)
- Skill: `frontend-design-master` (modos REDESIGN + MOTION)
- Reglas: [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md)

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | — | DISEÑO PENDIENTE REVISIÓN | /definir + /diseñar | Spec + design + adversarial |
| 2026-10-27 | DISEÑO PENDIENTE REVISIÓN | EN REVISIÓN | /ejecutar | Login split + sidebar push + tests |
| 2026-10-27 | EN REVISIÓN | LISTO PARA PR | /revisar | Vitest 201; build OK; auditor-codigo APROBADO |
| 2026-10-27 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs/frontend + graph |

## Resumen final

### Objetivo cumplido

- Login con identidad clara (hero + card) y shell sin solapamiento del menú sobre el contenido.

### Archivos modificados (Web)

- `LoginPage.tsx`, `login.css`, `loginCopy.ts`, `PasswordField.tsx`
- `AppShell.tsx`, `AppSidebar.tsx`, `SidebarRailToggle.tsx`, `SidebarItem.tsx`, `useCollapsedNavHint.tsx`, `useSidebarCollapsed.ts`, `app-shell.css`, `UserMenu.tsx`
- Tests: `LoginPage`, `PasswordField`, `AppShell`, `AppSidebar`, `SidebarItem`, `UserMenu`

### Auditorías finales

- auditor-sql: N/A
- auditor-codigo: APROBADO

### Pruebas ejecutadas

- Vitest: 201 passed
- `npm run build` (`tsc -b` + vite): OK
- T-SQL / API: N/A

### Riesgos residuales

- CA-7 (contraste/foco): smoke manual WCAG no automatizado.
- Menú SGR largo (`DB-007`): smoke manual recomendado.

### Decisiones técnicas relevantes

- Toggle sidebar en lugar de hover; push layout vs overlay (ver [delta.md](delta.md)).

### Documentación actualizada

- [specs/frontend.md](../../specs/frontend.md)
- [_graph.md](../../_graph.md)
- [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md)

### meta-sdd (2026-10-27)

Sin patrones nuevos que justifiquen rule/comando/agente. Observación `fe-spec-design-drift` cerrada alineando spec/delta/referencia visual. Opcional futuro: checklist WCAG Should en `frontend-tester`.
