# FE-030 — Frontend: login y sesión JWT

- Estado: ARCHIVADO
- Estructura: estándar
- Dominio: [[usuarios]] (USR / SGR · frontend)
- Targets en scope: `frontend:cuartaquinientos-web`
- size: S
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente) · delta.md (pendiente) · release.md (pendiente) · [← Fase 1](../FASE1_ROADMAP.md) · [specs/usuarios.md](../../specs/usuarios.md)
- Historia: HU-USR-01 (núcleo §5.0); redirección obligatoria de HU-USR-03
- Fase: 1 · Estimación: 5 h ideales (`readme.md` §6 Ticket 30) · Prioridad: Must-have
- Bloqueado por: [[USR-BE-007]]
- Bloquea: [[USR-BE-036]], [[FE-031]], [[FE-032]], [[FE-038]], [[FE-039]], [[FE-040]]
- Tickets relacionados: [[USR-BE-007]] · [[USR-BE-036]] · [[SETUP-000]] · [[FE-040]]

## Log

- 2026-09-23 — spec + design (Fase 1 SDD)
- 2026-09-24 — readme revisado (ADR-008: nombres lógicos + DB-001/DB-002 nuevos). Revalidar `design.md` contra readme §3.2 y §6 antes de `/ejecutar`.
- 2026-09-24 — realineado a ADR-008 / Ticket 30: access token en memoria, refresh en cookie `HttpOnly` (nunca localStorage), reintento único con `RefreshToken` ante 401, mensaje 429, redirección `/cambiar-password`. Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (MoSCoW, INV-1..3 de `readme.md` §2.5 / `specs/usuarios.md`, CA-1..CA-14 + CA-R1..R2 en Given/When/Then, escalera de decisión, tabla de componentes y contrato API, plan de pruebas TC-INV/TC-ERR/TC-RB, mutation). Se reutiliza `PrivateRoute` de SETUP-000 en lugar de `ProtectedRoute` nuevo; TanStack Query descartado (no está en `sdd.config.yaml`). Nuevos `(asumido)`: destino `/` tras login, texto de error de red, shape de `RefreshToken`/`Logout`, SETUP-000 sin cliente REST. Estado: LISTO PARA EJECUTAR.
