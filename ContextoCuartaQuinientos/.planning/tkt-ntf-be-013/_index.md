# NTF-BE-013 — Servicio de notificaciones in-app

[← Fase 1](../FASE1_ROADMAP.md) | [spec](spec.md) | [design](design.md) | impl.md · delta.md · release.md

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[notificaciones]] · `ntf` — [specs/notificaciones.md](../../specs/notificaciones.md)
- **Targets en scope:** database:CuartaQuinientos, backend:cuartaquinientos-api, integrations:cuartaquinientos-bot (solo contrato de outbox)
- **size:** M
- **Links:** [spec.md](spec.md) · [design.md](design.md) · impl.md · delta.md · release.md
- **Historias:** HU-NTF-01, HU-NTF-02, HU-NTF-03
- **Fase:** 1 (MVP) · **Prioridad:** Alta · **Estimación:** 3 horas (readme §6 Ticket 13)
- **Bloqueado por:** [[USR-BE-007]] ([index](../tkt-usr-be-007/_index.md)); precondición de datos DB-001 (`TipoNotificacion`, `ntf.NotificacionesEntrega`) y DB-002 (9 tipos, canales)
- **Relacionados:** [[TKT-BE-001]] ([index](../tkt-be-001/_index.md)) · [[FNZ-BE-011]] ([index](../tkt-fnz-be-011/_index.md)) · [[DASH-BE-014]] ([index](../tkt-dash-be-014/_index.md)) · [[FE-040]] · [[BOT-BE-020]] (Fase 2, consume el outbox)
- **Fuentes:** readme §6 Ticket 13, §5 HU-NTF-01..03 + Non-goals NTF, §3.2 (marca de leído), §2.5 + ADR-009 (outbox)

## Log

- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — spec completado con AC de readme Ticket 13 (`INotificacionService` único punto de inserción, encolado `PENDIENTE` en `ntf.NotificacionesEntrega` — Fase 1 solo encola, paginación, tipos por catálogo por nombre). Estado: BORRADOR (design pendiente).
- 2026-09-24 — normalizado a plantillas SDD del toolkit: spec con MoSCoW, 9 INV, 16 CA (3 de regresión); design con escalera, secciones database/backend/integrations, plan de pruebas y rollback. Verificación MCP pendiente Entrega 2. Estado: LISTO PARA EJECUTAR.
