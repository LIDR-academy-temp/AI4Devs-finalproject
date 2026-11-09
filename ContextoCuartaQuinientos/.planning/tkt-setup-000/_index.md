# SETUP-000 — Scaffolds API + Web + CI

- Estado: ARCHIVADO
- Estructura: estándar
- Dominio: transversal (habilitador §5.0)
- Targets en scope: `backend:cuartaquinientos-api`, `frontend:cuartaquinientos-web`, `integrations:github-actions`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [readme §1.4](../../../README.md)
- Historia: habilitador del núcleo §5.0 (sin HU propia)
- Fase: 0 · Estimación: 5 h ideales (`readme.md` §6 Ticket 33) · Prioridad: Must-have
- Bloqueado por: —
- Bloquea: [[DB-000]], [[USR-BE-007]], [[FE-030]] y todo ticket que asume `GraphApi/`, `Web/` o CI
- Tickets relacionados: [[DB-000]] · [[DB-001]] · [[DB-002]] · [[USR-BE-007]] · [[FE-030]]

## Log

- 2026-09-24 — carpeta creada con plantillas SDD del toolkit; `/definir` + `/diseñar` (Entrega 1). Estado: LISTO PARA EJECUTAR.
- 2026-10-15 — `/ejecutar` SETUP-000: `Web/` creado, CI, ajustes GraphApi (`Result`, políticas JWT, tests). Rama `feature/entrega-2-AFS`.
- 2026-10-16 — /completar: `delta.md`, build/test verificados; ARCHIVADO.
