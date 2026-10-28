# Documentos de entrada — NAV-ROOT-001

## Contexto del requerimiento

- Auditoría menú vs producto (2026-10-28): faltan rutas en sidebar respecto a pantallas existentes y respecto a lo pedido (tickets, visitas/QR, reservas, encuestas).
- Objetivo ampliado (**decisión Luis 2026-10-28**): **todo** en un solo epic SDD — catálogo navegación + huecos funcionales + **15 módulos readme §1.2** (incl. Reportes/BI y entrada web al ecosistema BOT), sin recortar a tickets hijos externos.

## Contexto técnico

- [[specs/frontend]], [[specs/usuarios]], [[specs/visitas-areas]], [[specs/tickets]], [[specs/notificaciones]], [[specs/reportes-bi]], [[specs/bot-ia]], [[specs/dashboard]]
- Implementación actual: `appNavigation.ts`, `DB-007`, [[SGR-FE-001]], [[SGR-BE-030]]
- Convenciones: `readme.md` §3–§4, `CLAUDE.md`, sin SPs (Dapper)

## Mockup / diseño visual

- Sin mockup nuevo: reutilizar shell [[FE-UX-001]] + [[PATRON_CRUD_ADMIN]] para pantallas admin nuevas.
- BI: gráficas Chart.js alineadas a ticket readme (3 gráficas tendencia) — referencia visual = dashboard admin existente (`ResumenAdminCards`).
