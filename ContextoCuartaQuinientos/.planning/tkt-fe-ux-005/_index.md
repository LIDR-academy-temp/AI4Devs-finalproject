# FE-UX-005 — Rollout admin móvil (cards + toasts)

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test SQL | — | /test | N/A |
| Impl | [impl.md](impl.md) | /ejecutar | Creado |
| Delta | [delta.md](delta.md) | /completar | Creado |

## Metadata

- requerimiento: FE-UX-005
- slug: admin-mobile-rollout
- size: L
- branch sugerida: `feature/fe-ux-005-admin-mobile-rollout`

## Depende de

- [[FE-UX-004]] ARCHIVADO

## Dominios

[[frontend]] · [[ux]]

## Related

- [specs/frontend.md](../../specs/frontend.md)
- [_graph.md](../../_graph.md)

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | — | SPEC PENDIENTE | /definir | rollout 9 Admin* + adversarial |
| 2026-10-27 | SPEC PENDIENTE | DISEÑO PENDIENTE REVISIÓN | /diseñar | design + matriz Vitest |
| 2026-10-27 | — | — | Lectura en frío | 8/10 |
| 2026-10-27 | LISTO PARA EJECUTAR | EN REVISIÓN | /ejecutar | 9 páginas + cards + tests 217 |
| 2026-10-27 | EN REVISIÓN | LISTO PARA PR | /revisar | Vitest 226/226; auditoría código OK |
| 2026-10-27 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs/frontend + graph |
| 2026-10-27 | ARCHIVADO | ARCHIVADO | follow-up | F006 toggle Juntas; Almacén useQueryErrorToast |
| 2026-10-27 | ARCHIVADO | — | SDD ligero | B/C + modo oscuro documentados en [[FE-UX-006]] (no reabre delta 005) |

## meta-sdd

- **2026-10-27:** Sin patrones nuevos que exijan rule/agente. Tema `fe-stub-toast-per-page` — ya documentado en `specs/frontend.md` (preferir `stubToast.ts` sobre mock global en `setup.ts` para no romper tests del provider). Opcional: una línea en `14_tech_react` al tocar más pantallas con `useToast`.

## Resumen final

### Objetivo cumplido

- Patrón FE-UX-004 extendido a 9 listados admin Must; Vitest 226/226.

### Archivos modificados

- `Web/src/pages/Admin*{Anuncios,Encuestas,Archivos,TiposArchivo,Juntas,Visitas,Vehiculos,Mascotas,Perfiles}Page.tsx`
- `Web/src/features/**/**AdminMobileCard.tsx` (9)
- `Web/src/features/admin/archivos/useTiposArchivo.ts`
- `Web/src/pages/*.test.tsx`, `Web/src/test/stubToast.ts`

### Auditorías finales

- auditor-sql: N/A
- auditor-codigo: APROBADO

### Correcciones automáticas aplicadas

- Revisar: `useTiposArchivo.error`, tests toast M4, a11y cards Encuesta/Visita

### Pruebas ejecutadas

- T-SQL: N/A
- C# xUnit: N/A
- Vitest: 226/226 PASS
- API `.http`: N/A

### Riesgos residuales

- Ninguno (Could Almacén, Menús, Perfil permisos, Finanzas entregado en follow-up).

### Decisiones técnicas relevantes

- `stubToast.ts` por archivo de test, no mock global en setup

### Documentación actualizada

- [delta.md](delta.md), [specs/frontend.md](../../specs/frontend.md), [_graph.md](../../_graph.md), [_sdd_evolution.md](../../_sdd_evolution.md)
