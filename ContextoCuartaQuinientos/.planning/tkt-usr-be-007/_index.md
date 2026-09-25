# USR-BE-007 — Autenticación JWT + refresh token

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[usuarios]] (`sgr`)
- Targets en scope: `database:CuartaQuinientos` (solo lectura/escritura de filas, sin DDL), `backend:cuartaquinientos-api`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/usuarios.md](../../specs/usuarios.md)
- Historia: HU-USR-01 (núcleo §5.0)
- Fase: 1 · Estimación: 5 h ideales (`readme.md` §6 Ticket 7) · Prioridad: Alta
- Bloqueado por: [[SETUP-000]], [[DB-001]], [[DB-002]]
- Bloquea: [[FE-030]], [[USR-BE-036]] y casi todos los tickets backend de Fase 1 (JWT `sub` = `UsuarioID`)
- Tickets relacionados: [[DB-000]] · [[DB-001]] · [[DB-002]] · [[FE-030]] · [[USR-BE-036]] · [[USR-BE-009]]

## Log

- 2026-09-23 — `/definir` + `/diseñar` (Fase 1 SDD batch)
- 2026-09-24 — readme revisado (ADR-008: nombres lógicos + DB-001/DB-002 nuevos). Revalidar `design.md` contra readme §3.2 y §6 antes de `/ejecutar`.
- 2026-09-24 — realineado a ADR-008: nombres §3.2 (`Correo`, `PasswordHash`, `bActivo`), 401 genérico para inactivo/eliminado, `RefreshToken`/`Logout` con cookie `HttpOnly` y rotación, 429, hash ficticio; bloqueos según readme Ticket 7. Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (MoSCoW con Won't = non-goals USR, INV-1..7 de `specs/usuarios.md` / `specs/base-datos.md` / ADR-003, CA-1..CA-14 + CA-R1..R3 en Given/When/Then, escalera de decisión, tabla de endpoints, plan de pruebas TC-INV/TC-ERR/TC-RB, mutation). `condominioId` ahora reutiliza `sgr.vsUsuarios` (DB-001). Nuevos `(asumido)`: hash SHA-256 del refresh token, shape de `RefreshToken`/`Logout` (`204`), cookie ausente → 401. Verificación MCP pendiente Entrega 2. Estado: LISTO PARA EJECUTAR.
