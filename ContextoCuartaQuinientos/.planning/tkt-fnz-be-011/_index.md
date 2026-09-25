# FNZ-BE-011 — Registrar pago de cuota (Admin)

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[finanzas]] · [[notificaciones]]
- Targets en scope: `database:CuartaQuinientos` (DML, sin DDL) · `backend:cuartaquinientos-api`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/finanzas](../../specs/finanzas.md) · [specs/notificaciones](../../specs/notificaciones.md)
- Metadata: HU-FNZ-02 [M] · Fase 1 (MVP) · Estimación 4 h · Prioridad Alta · Bloqueado por: [[FNZ-BE-010]], [[NTF-BE-013]] (readme §6 Ticket 11) · depende de [[DB-001]], [[DB-002]] (catálogos "Pago de cuota", `PAGO_REGISTRADO`)
- Relacionados: [[FNZ-BE-010]] · [[NTF-BE-013]] · [[FE-039]] · [[BOT-BE-020]] (envío Telegram, Fase 2)

## Log
- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — spec completado con AC de readme Ticket 11 (404, 409 concurrente con `UPDATE … WHERE Pagado = 0`, 400 monto 0, 422 monto distinto, `FechaPago` ≤ hoy, `MontoPagado`, notificación vía outbox); bloqueado también por NTF-BE-013. Estado: BORRADOR (design pendiente).
- 2026-09-24 — normalizado a plantillas SDD del toolkit (spec: 13 CA, 7 INV; design: escalera, diagrama, pre-mortem, plan de pruebas con concurrencia). Estado: LISTO PARA EJECUTAR.
