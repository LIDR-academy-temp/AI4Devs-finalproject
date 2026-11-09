# Impl: tkt-nav-root-001 — Fase A (NAV-ROOT-001-A)

> [← index](_index.md) | [← design](design.md) | Siguiente: fase B → [impl fase B](impl.md)

## Ajustes durante implementación

- 2026-10-28 | `navGroupsForPerfil` deja de filtrar por `g.perfil` cuando hay ítems cross-profile (`/perfil`, `/notificaciones`) | Auditoría F001
- 2026-10-28 | DB-008: títulos alineados a DB-007/manifest; UPDATE revoca `PerfilMenus` fuera del catálogo por perfil | Auditoría F001/F002
- 2026-10-28 | Suite SQL: `TC-DB-ERR-02` guardia + `TC-DB-CHAR-02` rutas duplicadas | Auditoría F003/F004

## Implementación realizada (fase A)

- `navCatalog.manifest.ts` — fuente canónica (ya existía); `DB_008_CLAVES` + nodos epic
- `appNavigation.ts` — `APP_NAV` / `NAV_GROUPS` derivados del manifest; filtro por `profiles[]`
- `navCatalogParity.test.ts` / `db008Claves.test.ts` — TC-NAV-01/02 en verde
- `SQL/DB-008_sgr_menus_nav_root.sql` — MERGE idempotente 41 nodos + PerfilMenus 4 perfiles
- Smoke SQL local post doble ejecución DB-008

## Archivos modificados

- `Web/src/shared/navigation/appNavigation.ts`
- `Web/src/shared/navigation/navCatalogParity.test.ts`
- `SQL/DB-008_sgr_menus_nav_root.sql` (nuevo)
- `ContextoCuartaQuinientos/.planning/tkt-nav-root-001/20261028_NAV-ROOT-001_PruebasUnitarias.sql`
- `ContextoCuartaQuinientos/.planning/tkt-nav-root-001/design.md` (estado paso A)

## Auditoría SQL

- Estado: APROBADO (post-corrección F001–F004)
- Hallazgos: MERGE padres título, PerfilMenus residual, tests guardia/idempotencia
- Correcciones: aplicadas en este impl

## Auditoría general

- Estado: APROBADO (post-corrección F001/F002 tests)
- Hallazgos: sidebar estático ocultaba mi-cuenta cross-profile
- Correcciones: `navGroupsForPerfil` + TC-NAV-01 `groupKey`

## Scripts de prueba creados

### T-SQL unitarias
- Script: `20261028_NAV-ROOT-001_PruebasUnitarias.sql`
- Casos: TC-DB-CHAR-01/02, TC-DB-ERR-01/02, TC-DB-ROJO-01/02
- Evidencia: `-- [OK] TESTS [localhost] -> 6 PASS / 0 ROJO`

### Contrato C# xUnit
- No aplica (fase A sin cambio API)

### API `.http`
- `NAV-ROOT-001_api_tests.http` — TC-NAV-08 pendiente smoke manual post-deploy

### Vitest fase A
- TC-NAV-01/02: **PASS** (`npm test -- src/shared/navigation/navCatalogParity.test.ts db008Claves.test.ts`)
- TC-NAV-04…07: **ROJO esperado** hasta fases B–F

## Resultado contra criterios de aceptación (fase A)

- [x] CA-A1: manifest + test paridad
- [x] CA-A2: DB-008 idempotente (doble run local + CHAR-02)
- [x] CA-A3: `/visitas/pases` + `/areas-comunes` en menú residente (SQL ROJO-01 + seed)
- [x] CA-A4: Guardia `/guardia/validar-pase`; sin `/admin/*` (TC-DB-ERR-02)
- [x] CA-A5: Trabajador `/trabajador/tickets` en PerfilMenus; sin `/tickets` ni `/tickets/nuevo` (SQL post DB-008)

## Verificación final

### Criterios de aceptación (fase A)

- [x] CA-A1: manifest + TC-NAV-01/02
- [x] CA-A2: DB-008 idempotente (doble run local + TC-DB-CHAR-02)
- [x] CA-A3: Residente con `/visitas/pases` y `/areas-comunes` en menú API — **datos** verificados vía `PerfilMenus` + árbol servicio; smoke HTTP TC-NAV-08 **pendiente** (401 credenciales local)
- [x] CA-A4: Guardia sin `/admin/*` (TC-DB-ERR-02); ruta validar en seed
- [x] CA-A5: Trabajador con `/trabajador/tickets` solo (sin `/tickets`)

### Pruebas T-SQL (tester-sql)

- Script: `20261028_NAV-ROOT-001_PruebasUnitarias.sql`
- Resultado: **6/6 PASS** (re-ejecutado en revisión, localhost)
- Casos fallidos: ninguno

### Pruebas contrato C# xUnit

- No aplica (sin DDL/SP)

### Pruebas API

- Archivo: `NAV-ROOT-001_api_tests.http` (TC-NAV-08)
- Resultado: **PASS prod 2026-11-04** — `Invoke-ApiSmokePostDeploy.ps1 -Target Prod` (TC-NAV-08/08b + BI-RPT). Evidencia: [EVIDENCIA_API_SMOKE_POSTDEPLOY.md](../../evidencia/20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md). Prod: usuarios `guardia@local`/`trabajador@local` + patch `PerfilMenus` (menus Guardia/Trabajador).
- Endpoints fase A: `GET /SGR/Navegacion/menus` (sin cambio contrato)

### QA Checklist

- [x] Happy path: manifest ↔ APP_NAV ↔ DB-008
- [x] Casos negativos: TC-DB-ERR-01/02
- [x] Edge: TC-DB-CHAR-02 duplicados rutas
- [x] Mutation paths críticos: **N/A** (seed DML catálogo, sin lógica financiera)

### Auditorías verificadas

- auditor-sql: **APROBADO** (re-auditoría; menores F005/F006 documentados)
- auditor-codigo: **APROBADO** (re-auditoría; menores F003–F006 no bloqueantes)
- auditor-seguridad: **No aplica** (sin endpoints nuevos ni input dinámico SQL)
- Sello `verde`: **SIN SELLO** — sin SP/vista; evidencia suite SQL + Vitest

### Desviaciones detectadas

- Ninguna bloqueante vs spec fase A

### Pendientes

- Ejecutar TC-NAV-08 con `FASE1_SMOKE_PASSWORD` válido antes de deploy QA
- Epic fases B→G y Vitest TC-NAV-04…07
- Opcional: TC-IDEM explícito en suite (menor auditoría F006)

---

# Impl fase B — NAV-ROOT-001-B

## Ajustes durante implementación

- 2026-11-04 | Dropdown campana (`NotificationDropdown`) alineado a `NotificacionesBandeja` + tokens `cq-portal-row-list` (UX post E2E) | Ver `specs/notificaciones.md` § UI web

## Implementación realizada (fase B)

- `NotificacionesPage.tsx` — bandeja paginada (50 ítems), estados loading/error/vacío, `PATCH /NTF/Notificaciones/{id}/leida`
- `App.tsx` — ruta `/notificaciones` bajo `PrivateRoute`, `GuardiaRoute` y `AdminRoute` + `NavMenuGuard`
- Menú sidebar: catálogos TKT, pases QR, notificaciones y validar pase admin ya en manifest/DB-008 (fase A)

## Archivos modificados (fase B)

- `Web/src/pages/NotificacionesPage.tsx` (nuevo)
- `Web/src/pages/NotificacionesPage.test.tsx` (nuevo, TC-NAV-04)
- `Web/src/App.tsx`

## Auditoría SQL (fase B)

- No aplica

## Auditoría general (fase B)

- Estado: **APROBADO**
- Hallazgos menores: ampliar tests error/vacío (opcional)

## Resultado contra criterios de aceptación (fase B)

- [x] CA-B1: `/admin/tickets/catalogos` en menú y ruta (fase A manifest + App existente)
- [x] CA-B2: `/notificaciones` bandeja + PATCH leída (TC-NAV-04)
- [x] CA-B3: ítem Notificaciones en manifest para 4 perfiles (fase A) + ruta accesible
- [x] CA-B4: admin `guardia-validar-pase` en manifest y ruta bajo `AdminRoute`

## Verificación final (fase B)

### Criterios de aceptación

- [x] CA-B1: Catálogos tickets en sidebar → `/admin/tickets/catalogos`
- [x] CA-B2: Bandeja `/notificaciones` + PATCH leída (Vitest TC-NAV-04)
- [x] CA-B3: Ítem Notificaciones (manifest 4 perfiles + rutas en 3 shells)
- [x] CA-B4: Admin validar pase QR en menú y ruta

### Pruebas T-SQL (tester-sql)

- No aplica cambios fase B; suite fase A sigue **6/6 PASS** (sin re-ejecución en esta revisión)

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- Archivo: `NAV-ROOT-001_api_tests.http` — sin endpoints nuevos
- Consumo existente: `GET /NTF/Notificaciones`, `PATCH …/leida` (cubierto por TC-NAV-04 mock)
- TC-NAV-08 smoke HTTP: **PASS prod** (ver evidencia API smoke arriba)

### QA Checklist

- [x] Happy path bandeja + marcar leída
- [x] Estados loading / error / vacío en página
- [x] Mutation N/A (UI consume API existente)

### Auditorías verificadas

- auditor-sql: No aplica (fase B)
- auditor-codigo: **APROBADO** (revisión post `/ejecutar` fase B)
- auditor-seguridad: No aplica

### Desviaciones detectadas

- Ninguna bloqueante fase B

### Pendientes

- TC-NAV-06…07 ROJO hasta fases E–F (esperado epic)
- TC-NAV-08 / TC-NAV-08b smoke HTTP tras reiniciar GraphApi con build fase C
- TC-NAV-08 antes de deploy QA

---

# Impl fase C — NAV-ROOT-001-C

## Ajustes durante implementación

- (ninguno)

## Implementación realizada (fase C)

- `TrabajadorRoute.tsx` + rutas `/trabajador/tickets`, `…/:id`, `/perfil`, `/notificaciones`, redirect `/` → cola
- `PrivateRoute` redirige Trabajador/Guardia fuera del shell residente
- `GuardiaRoute`: redirect `/` → `/guardia/validar-pase`
- `TrabajadorTicketsPage` + `useTicketsAsignados` → `GET /TKT/Tickets/asignados?terminado=false`
- `TrabajadorTicketDetallePage` reutiliza `TicketDetallePanel` (JWT + asignación en API)
- API: `GetTicketsAsignadosAsync` en `CuartaTicketQueryRepository` + acción `GET TKT/Tickets/asignados` (solo perfil Trabajador)
- Seed menú Trabajador/Guardia: ya en DB-008 (fase A)

## Archivos modificados (fase C)

- `Web/src/shared/components/TrabajadorRoute.tsx` (nuevo)
- `Web/src/shared/components/TrabajadorRoute.test.tsx` (nuevo)
- `Web/src/shared/components/PrivateRoute.tsx` · `PrivateRoute.test.tsx`
- `Web/src/App.tsx`
- `Web/src/pages/TrabajadorTicketsPage.tsx` · `TrabajadorTicketDetallePage.tsx` (nuevos)
- `Web/src/features/tickets/useTicketsAsignados.ts` · `TicketsList.tsx`
- `GraphApi/Controllers/TKT/Tickets/TicketsController.cs`
- `GraphApi/Repositories/TKT/CuartaTicketQueryRepository.cs` · `ICuartaTicketQueryRepository.cs`
- `GraphApi/Services/TKT/CuartaTicketQueryService.cs` · `ICuartaTicketQueryService.cs`
- `GraphApi/Models/TKT/TicketListDtos.cs` · `Validators/TicketAsignadosFiltroDtoValidator.cs`
- `GraphApi/Infrastructure/Extensions/ServiceCollectionExtensions.cs`
- `GraphApi/GraphApi.Tests/TicketsAsignadosEndpointTests.cs` (nuevo)
- `ContextoCuartaQuinientos/.planning/tkt-nav-root-001/NAV-ROOT-001_api_tests.http` (TC-NAV-08b)

## Auditoría SQL (fase C)

- No aplica (sin cambio SQL; seed fase A)

## Auditoría general (fase C)

- Estado: **APROBADO** (post tests F001/F003)
- Hallazgos menores: paginación UI >20 (F005); smoke runtime TC-NAV-08b pendiente reinicio API

## Auditoría seguridad (fase C)

- Estado: **APROBADO** (endpoint nuevo + aislamiento Web)
- Seguimiento fuera de scope: legacy `GET /TKT/TicketsUsuariosAsignados` sin filtro JWT (ticket hardening futuro)

## Resultado contra criterios de aceptación (fase C)

- [x] CA-C1: `TrabajadorRoute` + detalle JWT/asignación (Vitest + xUnit)
- [x] CA-C2: Guardia shell + redirect `/` → validar pase; `PrivateRoute` bloquea residente

## Verificación final (/revisar fase C)

### Criterios de aceptación (fase C)

- [x] CA-C1: aislamiento `TrabajadorRoute` + `GET asignados` + detalle reutilizado
- [x] CA-C2: Guardia solo rutas guardia + self-service

### Pruebas T-SQL (tester-sql)

- Script: `20261028_NAV-ROOT-001_PruebasUnitarias.sql`
- Resultado: **6/6 PASS** (re-ejecutado 2026-10-28, localhost)
- Casos fallidos: ninguno

### Pruebas contrato C# xUnit

- `TicketsAsignadosEndpointTests`: **3/3 PASS** (`dotnet test` → `_test_out`)
- `dotnet test` suite completa: no re-ejecutada (opcional pre-PR)

### Pruebas API

- Archivo: `NAV-ROOT-001_api_tests.http` (TC-NAV-08b)
- Resultado: **PASS prod 2026-11-04** — TC-NAV-08b incluido en `Invoke-ApiSmokePostDeploy.ps1` (misma evidencia API smoke).

### QA Checklist

- [x] Happy path: rutas trabajador/guardia + listado asignados (mock/xUnit)
- [x] Casos negativos: 403 residente/admin en `asignados`
- [x] Edge: redirect perfiles en `PrivateRoute`
- [x] Mutation: N/A

### Auditorías verificadas

- auditor-sql: No aplica (fase C sin SQL)
- auditor-codigo: **APROBADO** (re-auditoría post tests)
- auditor-seguridad: **APROBADO** (fase C; legacy TicketsUsuariosAsignados documentado en impl)
- Sello `verde`: **SIN SELLO** (sin SP/vista tocados en fase C)

### Desviaciones detectadas

- Ninguna bloqueante fase C

### Pendientes epic

- TC-NAV-06…07 Vitest (fases E–F)
- TC-NAV-08b smoke HTTP en ambiente con usuario Trabajador válido
- Reiniciar GraphApi local con build fase C antes de smoke manual

---

# Impl fase D — NAV-ROOT-001-D

## Ajustes durante implementación

- (ninguno)

## Implementación realizada (fase D)

- `GET /VTS/ReservacionesArea/admin` — paginado, policy `SoloAdministrador`, consulta `vts.vsReservacionesArea`
- `AdminAreasReservasPage` (`/admin/areas-reservas`) — tabs calendario (reusa `GET …/calendario`) + listado condominio
- **CA-D2 v1:** solo lectura (sin cancelar/cambiar estado en UI ni API)
- **CA-D3:** N/A — `AreasComunesController` Cuarta no expone POST/PATCH

## Archivos modificados (fase D)

- `GraphApi/Controllers/VTS/ReservacionesArea/ReservacionesAreaController.cs`
- `GraphApi/Repositories/VTS/CuartaVisitasRepository.cs` · `ICuartaVisitasRepository.cs`
- `GraphApi/Services/VTS/CuartaVisitas/*`
- `GraphApi/Models/VTS/CuartaVisitas/CuartaVisitasDtos.cs`
- `GraphApi/Models/VTS/Validators/ReservacionAdminFiltroDtoValidator.cs`
- `GraphApi/Infrastructure/Extensions/ServiceCollectionExtensions.cs`
- `GraphApi/GraphApi.Tests/ReservacionesAdminEndpointTests.cs` · `ReservacionesAdminAuthorizationTests.cs`
- `Web/src/pages/AdminAreasReservasPage.tsx`
- `Web/src/features/admin/areas/useReservacionesAdmin.ts`
- `Web/src/shared/types/visitas.ts`
- `Web/src/App.tsx`
- `ContextoCuartaQuinientos/.planning/tkt-nav-root-001/design.md` (paso D ✓)

## Auditoría SQL (fase D)

- No aplica (lectura Dapper sobre vista existente; sin DDL)

## Auditoría general (fase D)

- Estado: **APROBADO** (post-corrección F001/F002: `[JsonPropertyName]` + `ReservacionAdminItemJsonTests`)
- Hallazgos corregidos: contrato JSON ítems admin; fetch listado solo en tab activo

## Auditoría seguridad (fase D)

- Estado: **APROBADO** — endpoint admin con `SoloAdministrador`; listado incluye PII residente (esperado admin)

## Scripts de prueba (fase D)

### xUnit
- `ReservacionesAdminEndpointTests` + `ReservacionesAdminAuthorizationTests` + `ReservacionAdminItemJsonTests`: **4/4 PASS** (`dotnet test -o _test_out`)

### API `.http`
- TC-NAV-09 en `NAV-ROOT-001_api_tests.http` — smoke runtime pendiente (reiniciar API + tokens QA)

### Frontend
- `tsc --noEmit` OK · `vite build --mode development` OK

## Resultado contra criterios de aceptación (fase D)

- [x] CA-D1: calendario + listado paginado condominio
- [x] CA-D2: lectura documentada (v1 epic)
- [x] CA-D3 [S]: N/A (sin CRUD Cuarta en áreas)

## Verificación final (/revisar fase D — 2026-10-28)

### Criterios de aceptación (fase D)

- [x] CA-D1: `AdminAreasReservasPage` + calendario + `GET …/admin` paginado
- [x] CA-D2: solo lectura documentada (v1)
- [x] CA-D3 [S]: N/A — sin POST/PATCH Cuarta en `AreasComunesController`

### Pruebas T-SQL (tester-sql)

- Script: `20261028_NAV-ROOT-001_PruebasUnitarias.sql`
- Resultado: **6/6 PASS** (re-ejecutado localhost, fase D sin DDL)
- Casos fallidos: ninguno

### Pruebas contrato C# xUnit

- `ReservacionesAdminEndpointTests` + `ReservacionesAdminAuthorizationTests` + `ReservacionAdminItemJsonTests`: **4/4 PASS**
- `dotnet test GraphApi.Tests` suite completa: no re-ejecutada

### Pruebas API

- Archivo: `NAV-ROOT-001_api_tests.http` (TC-NAV-09)
- Resultado: **403 residente** cubierto por xUnit integration; **admin 200** pendiente smoke runtime (login local 401 sin `FASE1_SMOKE_PASSWORD` en sesión)

### QA Checklist

- [x] Happy path: contrato JSON + UI tabs calendario/listado
- [x] Casos negativos: 403 no-admin (integration test)
- [x] Edge: validación `pagina=0` → 400
- [x] Mutation: N/A (lectura paginada)

### Auditorías verificadas

- auditor-sql: No aplica (fase D)
- auditor-codigo: **APROBADO** (re-auditoría post JsonPropertyName)
- auditor-seguridad: **APROBADO** (policy admin + PII esperada)
- Sello `verde`: **SIN SELLO** (sin SP/vista tocados)

### Desviaciones detectadas

- Ninguna bloqueante fase D

### Pendientes epic

- TC-NAV-06…07 Vitest (fases E–F)
- TC-NAV-09 smoke HTTP admin 200 con credenciales QA válidas
- Calendario admin: deuda JSON PascalCase en otros DTOs VTS (preexistente; no bloquea fase D si datos seed OK en runtime)
