# _index de specs — CuartaQuinientos (backlog de dominios SDD)

> Índice de las *source of truth* por dominio. Grafo: [[../_graph]] · Fase 1 cerrada: [.planning/FASE1_CIERRE.md](../.planning/FASE1_CIERRE.md) · Entrega 12 módulos: [.planning/ENTREGA_MODULOS.md](../.planning/ENTREGA_MODULOS.md).

| Dominio | Spec | Target(s) | Fase 1 (2026-10-16) |
|---|---|---|---|
| Frontend (transversal) | [[frontend]] | frontend | **PARCIAL** kit [[FE-PAT-001]] + stack CRUD [[FE-PAT-002]]; pantallas en [[FE-CRUD-*]] |
| Base de datos | [[base-datos]] | database | **IMPLEMENTADO** DB-000..002 (scripts; ejecutar en servidor) |
| Usuarios/Identidad | [[usuarios]] | database, backend, frontend | **PARCIAL** auth, perfil; API padrón sí — UI/ casas en [[FE-041]] / [[USR-BE-010]] |
| Tickets | [[tickets]] | database, backend, frontend | **IMPLEMENTADO** crear/listar/gestionar + UI |
| Finanzas | [[finanzas]] | database, backend, frontend | **IMPLEMENTADO** cuenta, admin, morosos, generar |
| Notificaciones | [[notificaciones]] | database, backend, frontend | **IMPLEMENTADO** bandeja + aviso (outbox Fase 2 envío) |
| Dashboard | [[dashboard]] | backend, frontend | **IMPLEMENTADO** `GET /Dashboard/Resumen` + Home |
| Encuestas | [[encuestas]] | … | PENDIENTE Fase 2+ |
| Juntas | [[juntas]] | … | PENDIENTE |
| Visitas y Áreas | [[visitas-areas]] | … | PENDIENTE |
| Mascotas / Vehículos / Anuncios / Archivos | varios | … | PENDIENTE |
| Reportes / BI / WMS / BOT-IA | varios | … | PENDIENTE Fase 2+ |

## Orden sugerido

1. **Fase 1** — completada → [FASE1_ROADMAP](../.planning/FASE1_ROADMAP.md)
2. **Entrega módulos** — [ENTREGA_MODULOS](../.planning/ENTREGA_MODULOS.md) (sin BOT/IA/BI)
3. **Fase 2+** — encuestas, anuncios, archivos, juntas, visitas, WMS, etc.
