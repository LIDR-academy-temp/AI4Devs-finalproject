# FNZ-BE-012 — Reporte de morosos (Admin)

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[finanzas]] · [[reportes-bi]]
- Targets en scope: `database:CuartaQuinientos` (solo lectura) · `backend:cuartaquinientos-api`
- size: S
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/finanzas](../../specs/finanzas.md) · [specs/reportes-bi](../../specs/reportes-bi.md)
- Metadata: HU-FNZ-03 [M] · Fase 1 (MVP) · Estimación 2 h · Bloqueado por: [[FNZ-BE-010]] (readme §6 Ticket 12) · depende de [[DB-001]] (`sgr.vsUsuarios`, `sgr.Casas.Numero`)
- Relacionados: [[FNZ-BE-010]] · [[FNZ-BE-037]] · [[FE-039]] · [[DASH-BE-014]] (`morososMes`, misma definición)

## Log
- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — spec completado con AC de readme Ticket 12 (filtro `?mes=9&anio=2026`, `[]` sin morosos). Estado: BORRADOR (design pendiente).
- 2026-09-24 — normalizado a plantillas SDD del toolkit (spec: 8 CA, 5 INV; contradicción "usuario" vs "usuario y casa" escalada en Preguntas abiertas). Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — readme §6 Ticket 12 confirma agrupación por `UsuarioID, CasaID`: se elimina la contradicción, la pregunta abierta y el `(asumido)` de agrupación en spec/design. Estado: LISTO PARA EJECUTAR.
