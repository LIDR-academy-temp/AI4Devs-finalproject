# _index de specs — CuartaQuinientos (backlog de dominios SDD)

> Índice de las *source of truth* por dominio (contexto pre-`/definir`, alineado a `SQL/cuartaquinientos_schema.sql` y readme).
> En Entrega 2+, cada ticket de trabajo genera su carpeta `.planning/tkt-<id>/` con `spec.md` / `design.md`.
> Estado inicial de todos: **SPEC PENDIENTE** (documentación de dominio lista; implementación por iniciar).

| Dominio | Spec | Target(s) | Tamaño | Historias | Estado |
|---|---|---|---|---|---|
| Base de datos (transversal) | [[base-datos]] · [.planning/tkt-db-000](../.planning/tkt-db-000/_index.md) | database | M | habilitador núcleo §5.0 (DB-000, DB-001, DB-002) | DB-000 LISTO PARA EJECUTAR (revalidar) · DB-001/DB-002 PENDIENTE |
| Usuarios/Identidad | [[usuarios]] | database, backend, frontend | M | HU-USR-01..04 | SPEC PENDIENTE |
| Tickets | [[tickets]] | database, backend, frontend | L | HU-TKT-01..05 | SPEC PENDIENTE |
| Finanzas | [[finanzas]] | database, backend, frontend | L | HU-FNZ-01..06 | SPEC PENDIENTE |
| Encuestas | [[encuestas]] | database, backend, frontend | M | HU-ENC-01..03 | SPEC PENDIENTE |
| Juntas | [[juntas]] | database, backend, frontend | S | HU-JNT-01..02 | SPEC PENDIENTE |
| Notificaciones | [[notificaciones]] | database, backend, integrations | M | HU-NTF-01..03 | SPEC PENDIENTE |
| Visitas y Áreas Comunes | [[visitas-areas]] | database, backend, frontend | M | HU-VTS-01..03 | SPEC PENDIENTE |
| Mascotas | [[mascotas]] | database, backend, frontend | S | HU-MAS-01..02 | SPEC PENDIENTE |
| Vehículos | [[vehiculos]] | database, backend, frontend | S | HU-VEH-01..02 | SPEC PENDIENTE |
| Anuncios | [[anuncios]] | database, backend, frontend | S | HU-ANM-01..02 | SPEC PENDIENTE |
| Archivos | [[archivos]] | database, backend, frontend | S | HU-ARC-01..02 | SPEC PENDIENTE |
| Dashboard | [[dashboard]] | backend, frontend | M | HU-DASH-01..02 | SPEC PENDIENTE |
| Reportes / BI | [[reportes-bi]] | database, backend, frontend | M | HU-RPT-01..02, HU-BI-01..03 | SPEC PENDIENTE |
| Almacén (WMS) | [[almacen]] | database, backend, frontend | S | HU-WMS-01..03 | SPEC PENDIENTE |
| BOT «C500 Asiste» / IA | [[bot-ia]] | integrations, backend, database | XL | HU-BOT-01..13 | SPEC PENDIENTE |

Grafo maestro: [[../_graph]] (`ContextoCuartaQuinientos/_graph.md`) · Config: `sdd.config.yaml` · Documento de entrega: `readme.md`.

## Orden sugerido (fases del roadmap)

1. **Fase 1 (núcleo):** usuarios, tickets, finanzas (incl. HU-FNZ-06 generar cuotas, `POST /FNZ/Cuotas/generar`), notificaciones, dashboard. Tickets y estado: [FASE1_ROADMAP](../.planning/FASE1_ROADMAP.md).
2. **Fase 2 (canal + participación):** bot-ia (vinculación + tickets/cuotas/notif + sugerencias de cobro), encuestas, anuncios, archivos.
3. **Fase 3 (operación + inteligencia):** juntas, visitas-areas, vehiculos, mascotas, reportes-bi, almacen, y las capacidades IA/RAG + BI del bot.
