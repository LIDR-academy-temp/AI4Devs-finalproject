# SDD evolution log — CuartaQuinientos

## Métricas de proceso

| Fecha cierre | TKT | Dominio(s) | Talla | Días spec→cierre | Targets en scope | Auditoría a la 1ª | Ciclos REQUIERE CAMBIOS | Tests T-SQL | Estructura |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-23 | FE-CRUD-001 | frontend, usuarios, tickets, finanzas | M | 0 | frontend | No (1 ciclo en ejecutar) | 1 | N/A | estándar |
| 2026-10-19 | FE-043 | anuncios | M | 0 | frontend | No (2 ciclos revisar) | 2 | N/A | estándar |
| 2026-10-26 | FE-MOD-ENC-001 | encuestas | L | 3 | backend, frontend | No (1 ciclo REQUIERE CAMBIOS) | 1 | N/A | estándar |
| 2026-10-26 | FE-CRUD-002 | anuncios, archivos, juntas, encuestas | M | 3 | frontend | No (fixes post-auditoría en ejecutar) | 1 | N/A | estándar |
| 2026-10-26 | FE-CRUD-003 | visitas-areas, vehiculos, mascotas, almacen, frontend | L | 0 | backend, frontend | Sí (sin ciclo REQUIERE CAMBIOS) | 0 | N/A | estándar |
| 2026-10-27 | FE-PAT-001 | frontend, ux | M | 4 | frontend | No (fixes F001–F004 en ejecutar) | 1 | N/A | estándar |
| 2026-10-27 | FE-PAT-002 | frontend, ux | M | 4 | frontend | No (1 ciclo REQUIERE CAMBIOS en revisar) | 1 | N/A | estándar |
| 2026-10-27 | SGR-BE-030 | usuarios, auth, sgr | M | 0 | backend | No (2 ciclos revisar + fix Perfil/Nombre) | 2 | N/A | estándar |
| 2026-10-27 | SGR-FE-001 | frontend, sgr, usuarios | M | 0 | frontend, backend (add-on) | No (REQUIERE DECISIÓN → defer DB-006) | 0 | N/A | estándar |
| 2026-10-27 | FE-CRUD-004 | frontend (+ dominios M5) | L | 1 | frontend | No (2 ciclos REQUIERE CAMBIOS) | 2 | N/A | estándar |
| 2026-10-27 | FE-QA-001 | frontend | S | 0 | frontend | Sí | 0 | N/A | estándar |
| 2026-10-27 | FE-UX-002 | frontend, ux | M | 0 | frontend | Sí (fixes TS/tests en ejecutar) | 0 | N/A | estándar |
| 2026-10-27 | FE-UX-001 | frontend, ux | L | 4 | frontend | Sí (cierre consolidado; impl distribuido) | 0 | N/A | estándar |
| 2026-10-27 | FE-UX-003 | frontend, ux | M | 0 | frontend | Sí | 0 | N/A | estándar (sin design.md) |
| 2026-10-27 | FE-UX-004 | frontend, ux | L (Must=M) | 0 | frontend | Sí | 0 | N/A | estándar |
| 2026-10-27 | FE-UX-005 | frontend, ux | L | 0 | frontend | No (1 ciclo auditoría en revisar) | 1 | N/A | estándar |
| 2026-10-27 | FE-UX-006 | frontend, ux | M | 0 | frontend | No (SDD ligero post-código) | 0 | N/A | sin design.md |
| 2026-10-27 | FE-ADMIN-CAT-001 | frontend, mascotas, almacen, visitas-areas, vehiculos | L | 0 | backend, frontend | No (SDD ligero post-código) | 0 | N/A | sin design.md |
| 2026-10-28 | FE-TKT-DET-001 | tickets, frontend, backend | L+ | 0 | backend, frontend | Sí | 0 | N/A | estándar (3 fases, sin T-SQL) |
| 2026-10-28 | FE-VTS-PASE-001 | visitas-areas, frontend, backend | L | 0 | backend, frontend | No (3 ciclos revisar + fix tx/vista) | 3 | N/A | estándar |
| 2026-10-28 | FE-VTS-CAL-001 | visitas-areas, frontend, backend | M | 0 | backend, frontend | No (1 ciclo auditoría en ejecutar) | 1 | N/A | estándar |
| 2026-10-28 | FE-ENC-RES-001 | encuestas, frontend, backend | S | 0 | backend, frontend | Sí | 0 | N/A | estándar |
| 2026-10-28 | FE-ENC-RES-001 | encuestas, frontend, backend | S | 0 | backend, frontend | Sí (APROBADO 1ª en revisar) | 0 | N/A | estándar |
| 2026-10-30 | PROD-RES-001 | encuestas, tickets, visitas-areas, frontend, backend | M | 0 | backend, frontend, database | Sí (retro impl.md) | 0 | N/A | estándar (retro-SDD) |
| 2026-10-30 | FE-NAV-ENT1-001 | frontend, sgr | S | 0 | frontend, database | Sí (retro impl.md) | 0 | N/A | estándar (retro-SDD) |

## 2026-10-16 — Fase 1 núcleo cerrada

- **Qué:** 24 tickets SDD (SETUP → DB → USR → TKT → FNZ → DASH/FE) implementados y archivados en `.planning/`.
- **Evidencia:** `dotnet test` 57/57, `npm test` 22/22; detalle en [.planning/FASE1_CIERRE.md](.planning/FASE1_CIERRE.md).
- **Riesgo residual:** BD productiva/test debe ejecutar pipeline SQL completo; hub MCP con esquema parcial.
- **Patrón:** repos con `SqlSchemaCompat` pre/post DB-001; refresh JWT deduplicado en Web (`refreshSession.ts`).

### FE-UX-002 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-spec-design-drift` — cerrado en `/completar` (spec M2 + `ui-referencia-visual.md` + delta).
- **Tema:** `fe-wcag-manual-should` — cluster FE-DS/UX; opcional checklist en `frontend-tester` (no bloqueante).

### FE-QA-001 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-http-contract` — PROPUESTA: documentar pirámide Vitest (`apiClient.integration` + UI + Playwright) en `14_tech_react` / `frontend-tester`.
- **Tema:** `fe-e2e-opt-in` — PROPUESTA: alinear agente E2E con `Web/e2e/` y gate `E2E_SMOKE=1`.

### FE-UX-004 — observaciones meta-sdd (2026-10-27)

- **Tema:** `admin-mobile-dual-view` — documentado en `specs/frontend.md`; opcional mencionar en `14_tech_react` al extender rollout.
- Sin rule/agente nueva.

### FE-UX-006 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-dark-shell-tokens` — gradientes shell con hex fijos; no mapear `primary-dark` a color de título en dark si el mismo token alimenta sidebar.
- **Tema:** `fe-sdd-split-ticket` — follow-up UX post-ARCHIVADO → ticket nuevo (006) en lugar de reescribir delta 005.
- **Tema:** `fe-stub-toast-global` — 006 usa `stubToast` en `setup.ts` + `vi.unmock` en `ToastContext.test.tsx`; convive con recomendación 005 de import por archivo.

### FE-UX-005 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-stub-toast-per-page` — mock `useToast` vía `Web/src/test/stubToast.ts` en tests de página; evitar `vi.mock` global en `setup.ts` (rompe `ToastContext.test.tsx`).
- **Tema:** hooks de listado deben exponer `error` si la página usa `useQueryErrorToast` (caso TiposArchivo).
- Sin rule/agente nueva; checklist M4 ya en design de rollout UX.

### FE-UX-003 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-toast-context` — documentado en `specs/frontend.md`; opcional mencionar en `14_tech_react` si más pantallas migran.
- Sin rule/agente nueva (patrón acotado).

### FE-UX-001 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-ux-split-tickets` — cerrar hub padre cuando hijos cubren Must; diferidos explícitos en `delta.md` (S2, breadcrumbs móvil, toasts).
- Sin nueva rule/agente (patrón ya cubierto por SDD + `specs/frontend.md`).

### FE-UX-002 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-spec-design-drift` — OBSERVACIÓN: spec M2 hover-rail vs design/impl toggle + `localStorage`; alinear `spec.md` y fila sidebar en `ui-referencia-visual.md` en `/completar` (delta.md pendiente).
- **Tema:** `fe-wcag-manual-should` — PATRÓN emergente (FE-DS-001, FE-UX-001, FE-UX-002): AC contraste/foco “Should” sin gate CI; sin propuesta formal aún (cluster=3, candidato baja prioridad).
- Sin hallazgos nuevos ≥3 para rule/comando/agente distintos de cobertura ya existente (`20_ui_fuente`, `frontend-design-master`, Vitest en `14_tech_react`).

### FE-VTS-PASE-001 — observaciones meta-sdd (2026-10-28)

- **Tema:** `dapper-tx-post-commit-read` — lecturas Dapper tras `Commit()` con transacción aún en `using`; mitigación: bloque `using (tx) { … Commit(); }` antes de queries fuera de tx.
- Sin rule nueva (nota en `_index` del ticket + delta Aprendizajes).

### FE-VTS-CAL-001 — observaciones meta-sdd (2026-10-28)

- **Tema:** `fe-calendario-slot-overlap` — OBSERVACIÓN: UI de calendario por horas debe pintar todas las franjas solapadas (no solo la hora de inicio).
- **Tema:** `fe-http-smoke-pre-merge` — PATRÓN emergente (varios TKT): `.http` creado pero smoke runtime pendiente si API no levantada en revisión/completar.
- Sin propuesta formal de rule/agente (cluster < 3 en tema overlap).

### FE-ENC-RES-001 — observaciones meta-sdd (2026-10-28)

- **Tema:** `be-auth-visibilidad-servicio` — OBSERVACIÓN (cluster=1): relajar `[Authorize(SoloAdministrador)]` en GET y centralizar 403/404/200 en `*ParaUsuarioAsync` + matriz xUnit (TC-ENC-R-*); design.md cubrió el caso (sin ajustes en impl.md).
- **Tema:** `be-dto-audiencia-rol` — OBSERVACIÓN (cluster=1): mismo endpoint, DTO residente sin textos crudos (`totalRespuestasTexto`); admin sin breaking change — patrón reutilizable en otros GET “admin hoy / comunidad mañana”.
- **Tema:** `fe-shared-page-variant` — OBSERVACIÓN (cluster=2 con FE-TKT-DET badge `variant="admin"`): página compartida `ResultadosEncuestaPage` con `variant: admin|residente`; aún no ≥3 para plantilla en `14_tech_react`.
- **Tema:** `fe-spec-nav-drift` — OBSERVACIÓN (cluster=1): CA-3 cumple en API (cerrada sin participar → 200) pero listado `/encuestas` solo vigentes — URL directa; documentar en delta al `/completar`.
- **Tema:** `fe-http-smoke-pre-merge` — cluster **≥3** (FE-VTS-CAL-001, FE-TKT-DET-001, FE-ENC-RES-001): `.http` + credencial smoke residente 401 y GET 500 local; xUnit cubrió contrato — **PROPUESTA** (prioridad media): checklist en `design.md` + credenciales seed documentadas en `.http` / `api-tester`, no rule nueva.
- **Tema:** `contenido-configurable` — mensaje 403 hardcodeado alineado con deuda ENC existente (`19_guard_contenido_configurable`); sin propuesta nueva.
- Sin rule/agente nueva obligatoria para auth relajada / sanitización DTO / variant residente (patrones acotados a ENC; escalera design reuso OK).

### prod-retro-sdd. Retro-SDD fixes operación publicada

- Tipo: patrón
- Fecha: 2026-10-30
- Tickets: [[PROD-UX-001]], [[PROD-RES-001]]
- Tema: `sdd-prod-hotfix-retro`
- Descripción: Sesiones de fixes en prod (residente + admin) sin ticket previo; cierre con carpeta `tkt-prod-*` (spec/design/impl/delta/release + inventario SQL + entregables) en lugar de dejar solo commits.
- Acción propuesta: Tras hotfix prod multi-dominio, abrir ticket `PROD-*` retro antes de merge (plantilla = PROD-RES-001 / PROD-UX-001).
- Estado: PATRÓN

### nav-supplement-vs-sgr-hide. Ocultar menú en BD no basta con supplement Web

- Tipo: observación
- Fecha: 2026-10-30
- Tickets: [[FE-NAV-ENT1-001]], [[PROD-RES-001]]
- Tema: `nav-supplement-manifest`
- Descripción: `supplementApiNavWithManifest` re-añade ítems `implemented:true` ausentes en árbol SGR; `bVisible=0` en PerfilMenus no oculta sidebar hasta manifest `implemented:false` + filtro.
- Acción propuesta: Documentar en design NAV: toda exclusión de producto requiere manifest + Web; SQL PerfilMenus es alineación opcional.
- Estado: OBSERVACIÓN

## Tendencias

_(vacío — ejecutar `/retrospectiva` tras más entregas)_
