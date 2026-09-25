# DB-000 — Esquema base desplegable e idempotente (solo estructura)

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[base-datos]] (transversal · `sgr`, `tkt`, `fnz`, `ntf`, `usr`, `vts`, `enc`, `jnt`, `anm`, `arc`, `api`, `dbo`, `bot`, `ia`, `bi`, `wms`)
- Targets en scope: `database:CuartaQuinientos`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/base-datos.md](../../specs/base-datos.md)
- Historia: habilitador del núcleo §5.0 (HU-USR-01, HU-TKT-01, HU-TKT-03, HU-FNZ-01, HU-FNZ-02)
- Fase: 0 · Estimación: 3 h ideales (`readme.md` §6 Ticket 0) · Prioridad: Alta
- Bloqueado por: —
- Bloquea: [[DB-001]], [[DB-002]], [[USR-BE-007]] y todos los tickets Fase 1 con target `database`
- Tickets relacionados: [[DB-001]] · [[DB-002]] · [[SETUP-000]] · [[USR-BE-007]] · [[TKT-BE-001]] · [[FNZ-BE-010]] · [[NTF-BE-013]] · [[DASH-BE-014]] · Fase 2–3: [[BOT-BE-004]] · [[IA-BE-005]] · [[WMS-BE-029]]

## Log

- 2026-09-24 — `/definir` + `/diseñar` (cierre Entrega 1: ticket de base de datos explícito en §6 readme)
- 2026-09-24 — Re-spec: solo estructura, sin datos (retirados INSERT/UPDATE del script)
- 2026-09-24 — readme revisado (ADR-008: nombres lógicos + DB-001/DB-002 nuevos). Revalidar `design.md` contra readme §3.2 y §6 antes de `/ejecutar`.
- 2026-09-24 — realineado a ADR-008 / Ticket 0: DB-001 y DB-002 como tickets reales (renombres §3.2 y catálogos fuera de alcance); alcance ampliado: 11 esquemas base idempotentes y eliminación de la definición duplicada de `usr.vsMascotas` / `usr.vsAutomoviles` conservando `LEFT JOIN`. Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (MoSCoW, INV-1..5 de `specs/base-datos.md`, CA renumerados CA-1..CA-11 + CA-R1/CA-R2 en Given/When/Then, escalera de decisión, plan de pruebas TC-INV/TC-ERR/TC-RB). Nuevo `(asumido)`: `SET NOEXEC ON` en la guarda anti-BD de sistema (spec P-1). Verificación MCP pendiente Entrega 2. Estado: LISTO PARA EJECUTAR.
