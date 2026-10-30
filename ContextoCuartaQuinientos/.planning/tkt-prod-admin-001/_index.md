# PROD-ADMIN-001 — Cierre huecos admin y alineación sitio publicado

[← Contexto requerimiento](entrada-contexto-requerimiento.md) | [Contexto técnico](entrada-contexto-tecnico.md)

- **Estado:** DISEÑO PENDIENTE REVISIÓN
- **Estructura:** estándar
- **Dominio:** transversal (anm, arc, enc, sgr, usr, wms) + frontend admin
- **Targets en scope:** `database:CuartaQuinientos` · `backend:GraphApi` · `frontend:cuartaquinientos-web`
- **size:** XL
- **Links:** [spec.md](spec.md) · [design.md](design.md) · [20261029_PROD-ADMIN-001_PruebasUnitarias.sql](20261029_PROD-ADMIN-001_PruebasUnitarias.sql) · impl.md · TKT-PROD-ADMIN-001-APIS.md · delta.md · release.md

## Metadata

- requerimiento: PROD-ADMIN-001
- slug: prod-admin-cierre-publicado
- branch sugerida: `feature/prod-admin-001-prod-admin-cierre-publicado`

## Depende de

- Scripts SQL ya en repo (`DB-005`, `DB-006`, `DB-009`, seeds)
- Patrones [[FE-ADMIN-CAT-001]], [[FE-PAT-002]], [[FE-UX-003]]

## Dominios

[[anuncios]] · [[archivos]] · [[encuestas]] · [[usuarios]] · [[mascotas]] · [[vehiculos]] · [[almacen]] · [[frontend]]

## Related

- [entrada-contexto-requerimiento.md](entrada-contexto-requerimiento.md)
- [entrada-contexto-tecnico.md](entrada-contexto-tecnico.md)
- [_graph.md](../../_graph.md) · [specs/frontend.md](../../specs/frontend.md)

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-29 | — | DISEÑO PENDIENTE REVISIÓN | /definir + /diseñar + /test | SDD completo por hallazgos en prod (sin implementación) |

## Artefactos

| Artefacto | Estado |
|-----------|--------|
| Spec | ✅ |
| Design | ✅ |
| Test SQL | ✅ (ROJO esperado pre-impl) |
| Impl | — |
| Delta | — |
