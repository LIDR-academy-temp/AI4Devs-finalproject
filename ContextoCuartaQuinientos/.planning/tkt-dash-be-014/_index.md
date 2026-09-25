# DASH-BE-014 — Dashboard: KPIs Admin y resumen residente

[← Fase 1](../FASE1_ROADMAP.md) | [spec](spec.md) | [design](design.md) | impl.md · delta.md · release.md

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[dashboard]] · sin esquema propio (lee `tkt`, `fnz`, `sgr`, `ntf`) — [specs/dashboard.md](../../specs/dashboard.md)
- **Targets en scope:** database:CuartaQuinientos (solo lectura), backend:cuartaquinientos-api
- **size:** S
- **Links:** [spec.md](spec.md) · [design.md](design.md) · impl.md · delta.md · release.md
- **Historias:** HU-DASH-01, HU-DASH-02
- **Fase:** 1 (MVP) · **Prioridad:** Alta · **Estimación:** 3 horas (readme §6 Ticket 14)
- **Bloqueado por:** [[USR-BE-007]] ([index](../tkt-usr-be-007/_index.md)) · [[FNZ-BE-010]] ([index](../tkt-fnz-be-010/_index.md)) · [[NTF-BE-013]] ([index](../tkt-ntf-be-013/_index.md))
- **Relacionados:** [[FNZ-BE-012]] ([index](../tkt-fnz-be-012/_index.md), misma definición de morosidad) · [[TKT-BE-001]] ([index](../tkt-be-001/_index.md)) · [[FE-040]] · [[BI-BE-023]] (tendencias, Fase 3)
- **Fuentes:** readme §6 Ticket 14, §4 Endpoint 3, §5 HU-DASH-01..02 + Non-goals Dashboard, §3.2 (morosidad, marca de leído)

## Log

- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — normalizado a plantillas SDD del toolkit: spec con MoSCoW, 8 INV, 13 CA (3 de regresión); design con escalera, secciones database/backend, plan de pruebas y rollback. Contradicción readme Ticket 14 vs §4 en `estadoCuotaMes` registrada (se adopta §4). Verificación MCP pendiente Entrega 2. Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — readme §6 Ticket 14 adopta el contrato de §4: `estadoCuotaMes = { monto, fechaVencimiento, estado ∈ Pagada|Pendiente|Vencida }` derivado de `Pagado`/`FechaVencimiento`, `null` sin cuota del período. Se elimina la contradicción; queda `(asumido)` solo la elección entre varias cuotas del período. Estado: LISTO PARA EJECUTAR.
