# FNZ-BE-010 — Consulta de estado de cuenta del residente

- Estado: ARCHIVADO
- Estructura: estándar
- Dominio: [[finanzas]] · [[usuarios]] (autorización por perfil)
- Targets en scope: `database:CuartaQuinientos` (solo lectura) · `backend:cuartaquinientos-api`
- size: S
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/finanzas](../../specs/finanzas.md)
- Metadata: HU-FNZ-01 [M] · Fase 1 (MVP) · Estimación 3 h · Bloqueado por: [[USR-BE-007]] (readme §6 Ticket 10) · depende de [[DB-001]] (columnas `CuentaID`/`MontoPagado`)
- Relacionados: [[FNZ-BE-011]] · [[FNZ-BE-012]] · [[FNZ-BE-037]] · [[FE-032]] · [[DASH-BE-014]] · [[BOT-BE-019]]

## Log
- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — spec completado con AC de readme Ticket 10 (`GET /FNZ/Cuotas/mis`, `esVencida`, zona `America/Mexico_City`). Estado: BORRADOR (design pendiente).
- 2026-09-24 — normalizado a plantillas SDD del toolkit (spec: 11 CA, 5 INV; design: escalera, orden, plan de pruebas). Estado: LISTO PARA EJECUTAR.
- 2026-10-16 — tests classifier + estado cuenta; `/completar` ARCHIVADO.
