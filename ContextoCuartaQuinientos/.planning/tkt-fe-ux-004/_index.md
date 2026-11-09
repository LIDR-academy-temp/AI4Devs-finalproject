# FE-UX-004 — Admin móvil (cards) + toasts CRUD

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-27 · fecha_cierre: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test SQL | — | /test | N/A |
| Impl | [impl.md](impl.md) | /ejecutar + /revisar | ✅ |
| Delta | [delta.md](delta.md) | /completar | ✅ |
| APIs Front | — | /revisar | N/A |

## Metadata

- requerimiento: FE-UX-004
- slug: admin-mobile-cards-toasts
- size: L (Must = 3 pilotos)
- branch sugerida: `feature/fe-ux-004-admin-mobile-cards`

## Depende de

- [[FE-UX-001]] · [[FE-UX-003]] · [[FE-PAT-002]] ARCHIVADOS

## Dominios

[[frontend]] · [[ux]]

## Related

- [specs/frontend.md](../../specs/frontend.md)
- [_graph.md](../../_graph.md)

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | — | SPEC PENDIENTE | /definir | spec + adversarial |
| 2026-10-27 | SPEC PENDIENTE | DISEÑO PENDIENTE REVISIÓN | /diseñar | design + sello diseño |
| 2026-10-27 | LISTO PARA EJECUTAR | EN REVISIÓN | /ejecutar | Vitest 214 |
| 2026-10-27 | EN REVISIÓN | LISTO PARA PR | /revisar | Must OK |
| 2026-10-27 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs; sello revisar SIN SELLO (revisión documentada en impl) |

## Resumen final

### Objetivo cumplido

- Must M1–M4: cards móvil reutilizables, pilotos Casas/Usuarios/Tickets, toasts listado/mutación, tests.

### Archivos modificados (Web)

- `shared/components/admin/AdminMobileCard*.tsx`, `AdminFilterableTable.tsx`, `index.ts`
- `shared/hooks/useQueryErrorToast.ts`
- `styles/cq-admin.css`
- `features/admin/{casas,usuarios,tickets}/*MobileCard.tsx`
- `pages/Admin{Casas,Usuarios,Tickets}Page.tsx` + tests

### Auditorías finales

- auditor-sql: N/A
- auditor-codigo: APROBADO

### Pruebas ejecutadas

- Vitest: 214/214
- T-SQL / API: N/A

### Riesgos residuales

- Smoke manual 375px; rollout Should al resto `Admin*`.

### meta-sdd (2026-10-27)

- Patrón dual-view documentado en `specs/frontend.md`; sin nueva rule.

### Documentación actualizada

- [specs/frontend.md](../../specs/frontend.md)
- [_graph.md](../../_graph.md)
- [_sdd_evolution.md](../../_sdd_evolution.md)
