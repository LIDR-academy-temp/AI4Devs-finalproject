# FE-UX-006 — Residente (toasts) + modo oscuro + onboarding

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-27 · fecha_cierre: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir (ligero) | ✅ |
| Design | — | /diseñar | Omitido (patrones FE-UX-003/004) |
| Test SQL | — | /test | N/A |
| Impl | [impl.md](impl.md) | /ejecutar | ✅ |
| Delta | [delta.md](delta.md) | /completar | ✅ |

## Metadata

- requerimiento: FE-UX-006
- slug: resident-dark-onboarding
- size: M
- branch sugerida: `feature/fe-ux-006-resident-dark-onboarding`

## Depende de

- [[FE-UX-001]] (Could C2/C3) · [[FE-UX-003]] (toasts) · [[FE-UX-005]] ARCHIVADOS

## Dominios

[[frontend]] · [[ux]]

## Related

- [specs/frontend.md](../../specs/frontend.md)
- [_graph.md](../../_graph.md)
- Continuación documental de ítems fuera del cierre formal de [[FE-UX-005]]

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | — | ARCHIVADO | SDD ligero | Spec + delta + impl; código ya en `Web/` |
| 2026-10-27 | — | — | Contraste dark | Segunda pasada tokens + Bootstrap admin + shell |
| 2026-10-27 | ARCHIVADO | ARCHIVADO | fase 2 | Listados residente B3 + tests |
| 2026-10-27 | ARCHIVADO | ARCHIVADO | fase 3 | Superficies oscuro + PerfilRegistroCard/NotificationBell toasts |
| 2026-10-27 | ARCHIVADO | ARCHIVADO | fase 4 | Login/CambiarPassword toast + encuesta dark + login.css dark |
| 2026-10-27 | ARCHIVADO | ARCHIVADO | fase 5 | Toasts en modales residente + guardar perfil |

## Resumen final

### Objetivo cumplido

- **B:** errores de carga residente/detalle vía `useQueryErrorToast`; cards móvil en estado de cuenta.
- **C:** tema claro/oscuro (`ThemeProvider`, `UserMenu`), onboarding en home, tokens `html.dark`.
- Contraste legible en sidebar, dropdown usuario y páginas `.cq-admin-page`.

### Pruebas ejecutadas

- Vitest: 236/236 PASS (incl. `PerfilRegistroCard`, listados B3, tema/onboarding)
- T-SQL / API: N/A en este ticket

### Documentación actualizada

- [delta.md](delta.md), [specs/frontend.md](../../specs/frontend.md), [_graph.md](../../_graph.md), [_sdd_evolution.md](../../_sdd_evolution.md)

### Fase 2 (mismo ticket)

- Rollout toast en listados residente B3 + tokens de superficie en Encuestas/Juntas/Archivos/Perfil.

### Diferido

- Solo errores de formulario/modal residente (sin cambio de patrón).
