# FE-032 — Frontend: estado de cuenta y cuotas

- Estado: ARCHIVADO
- Estructura: estándar
- Dominio: [[finanzas]]
- Targets en scope: `frontend:cuartaquinientos-web`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/finanzas](../../specs/finanzas.md)
- Metadata: HU-FNZ-01 [M] · Fase 1 (MVP) · Estimación 5 h · Prioridad Must-have · Bloqueado por: [[FE-030]], [[FNZ-BE-010]] (readme §6 Ticket 32)
- Relacionados: [[FNZ-BE-010]] · [[FE-030]] · [[FE-031]] · [[FE-039]] · [[DASH-BE-014]]

## Log
- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (spec: 11 CA, 4 INV; design: escalera por componente, orden según profile frontend, plan Vitest/Playwright). Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — TanStack Query eliminado (stack acordado React 18 + Vite + Apollo Client, `sdd.config.yaml`): REST vía `Web/src/shared/lib/apiClient.ts` (FE-030) + hook React; se quita el riesgo/pregunta Apollo vs TanStack; `ProtectedRoute` → `PrivateRoute` (FE-030). Estado: LISTO PARA EJECUTAR.
- 2026-10-16 — `CuotasTable.test`; `/completar` ARCHIVADO.
