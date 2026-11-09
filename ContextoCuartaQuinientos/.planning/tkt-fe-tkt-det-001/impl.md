# Impl: tkt-fe-tkt-det-001

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- `/revisar`: unificar `code` 404 IDOR → `NOT_FOUND` (auditor-seguridad F001); validación whitespace en comentarios (F002). Tests Vitest admin mock detalle/comentarios.

## Implementación realizada

- `CuartaTicketDetalleRepository` + `CuartaTicketDetalleService`: acceso solicitante/admin/trabajador asignado; comentarios filtrados por `EsInterno`; POST con validación 2000 chars.
- Endpoints JWT en `TicketsController`: `GET /TKT/Tickets/{id}`, `GET|POST .../comentarios`.
- FE: `TicketDetallePage`, `TicketDetallePanel` compartido, hooks `useTicketDetalle` / `useTicketComentarios`, links en `TicketsList`, panel admin con comentarios internos.

## Archivos modificados

**GraphApi:** `TicketDetalleDtos.cs`, `CrearComentarioTicketInputValidator.cs`, `CuartaTicketDetalleRepository.cs`, `ICuartaTicketDetalleRepository.cs`, `CuartaTicketDetalleService.cs`, `ICuartaTicketDetalleService.cs`, `TicketsController.cs`, `ServiceCollectionExtensions.cs`, `CuartaTicketDetalleServiceTests.cs`

**Web:** `tickets.ts`, `useTicketDetalle.ts`, `useTicketComentarios.ts`, `TicketDetallePanel.tsx`, `TicketDetallePage.tsx`, `TicketsList.tsx`, `AdminTicketsPage.tsx`, `App.tsx`, `TicketsPage.test.tsx`, `TicketDetallePage.test.tsx`

## Auditoría SQL

- Estado: No aplica
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: APROBADO (post-corrección F001/F002/F003)
- Hallazgos: título en panel, tests trabajador/interno, Swagger en endpoints nuevos
- Correcciones: aplicadas en mismo `/ejecutar`

## Scripts de prueba creados

### T-SQL unitarias
- No aplica (sin DDL/SP)

### Contrato C# xUnit
- Archivo: `CuartaTicketDetalleServiceTests.cs` (6 casos TC-TKT-D-1..3 + trabajador + interno)
- `dotnet test --filter CuartaTicketDetalleServiceTests`: 6 PASS

### API `.http`
- Archivo: `FE-TKT-DET-001_api_tests.http`
- Endpoints: GET detalle, GET/POST comentarios, caso 404

## Verificación final

### Criterios de aceptación

- [x] CA-1 [M]: detalle residente + comentarios públicos
- [x] CA-2 [M]: IDOR → 404 sin filtrar datos (`NOT_FOUND`)
- [x] CA-3 [M]: interno solo admin (BE + UI)
- [x] CA-4 [M]: trabajador asignado (servicio + test)
- [x] CA-5 [M]: Vitest tickets (**12/12** en AdminTickets + TicketDetalle + TicketsPage)
- [ ] S-1 Should: timeline mezclada — no implementado (asumido en spec)

### Must M-1..M-6

- [x] M-1 enlace `/tickets/:id`, campos en panel
- [x] M-2 acceso solicitante / 404
- [x] M-3 comentarios + POST 2000
- [x] M-4 admin panel + interno
- [x] M-5 transición/asignación (tests admin)
- [x] M-6 trabajador asignado (xUnit)

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- `CuartaTicketDetalleServiceTests`: 6 PASS
- `CuartaTicketAdminServiceTests`: 4 PASS
- Filtro `FullyQualifiedName~CuartaTicket`: **11/11 PASS** (`/revisar` 2026-10-28)

### Pruebas API

- Archivo: `FE-TKT-DET-001_api_tests.http` (detalle + comentarios + CRUD admin)
- Resultado: **Pendiente smoke runtime** (contrato documentado en `TKT-FE-TKT-DET-001-APIS.md`)

### QA Checklist

- [x] Happy path (unit + Vitest)
- [x] Caso negativo IDOR + solicitante inválido admin (xUnit)
- [x] Edge interno / trabajador / ticket cerrado PATCH
- [ ] Smoke HTTP E2E con API viva (recomendado pre-merge)

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (fase 1+2; `/revisar` 2026-10-28)
- auditor-seguridad: **APROBADO** — admin `SoloAdministrador`; residente activo en POST; PATCH bloqueado en Cerrado; soft delete sin hard delete
- auditor-flutter: No aplica

### Criterios fase 2 (spec)

- [x] **CA-ADM [M]:** matriz ADM-1..8 cubierta (UI + API)
- [x] **CA-REG [M]:** Vitest tickets **12/12**; xUnit CuartaTicket **11/11**
- [x] CA-6: alta admin (POST + form)
- [x] CA-7: PATCH metadatos (servicio + UI edit)
- [x] CA-8: delete confirm + soft delete API
- [x] CA-9: regresión ADM-3..6 (tests admin panel + detalle)

### Desviaciones detectadas

- `TICKET_FORBIDDEN` retirado → solo `NOT_FOUND` (anti-enumeración)
- S-1 timeline omitido (Should asumido)
- Sello `verde`/`revisar`: **SIN SELLO** (sin objetos SQL en ticket)

### Pendientes

- Smoke manual `.http` con API local antes de merge productivo (opcional)

## Resultado contra criterios de aceptación (ejecución)

- [x] CA-1..CA-5: ver § Verificación final
- [x] CA-ADM, CA-REG, CA-6..CA-9: ver § Verificación final (fase 2)

## Pruebas ejecutadas (`/revisar` 2026-10-28)

- `dotnet test --filter FullyQualifiedName~CuartaTicket` → **11 PASS**
- Vitest: AdminTicketsPage + TicketDetallePage + TicketsPage → **12 PASS**
- `tsc --noEmit`, `vite build` → OK

## Mutation / TDD

- N/A: lógica C# con mocks; sin SP de negocio. Matriz adversarial cubierta en xUnit IDOR/trabajador/interno.

## Fase 2 — Administración completa (CRUD admin)

### Ajustes durante implementación

- (ninguno)

### Implementación realizada

- `CuartaTicketAdminService`: `CrearTicketAdminAsync`, `ActualizarMetadatosAsync`, `SoftDeleteAsync` (reutiliza insert catálogo + `ICuartaTicketRepository`).
- Repo admin: `IsResidenteActivoAsync`, `UpdateMetadatosAsync`, `SoftDeleteAsync`.
- Endpoints `POST|PATCH|DELETE` bajo `/TKT/Tickets/.../admin` con policy `SoloAdministrador`.
- DTOs + validators: `CrearTicketAdminInput`, `ActualizarTicketAdminInput`.
- FE: `ticketAdminSchemas.ts`, `useTicketAdminMutations.ts`, `TicketAdminForm.tsx`; `AdminTicketsPage` con CTA, modos create/view/edit, `ConfirmDialog` delete.

### Archivos fase 2

**GraphApi:** `CrearTicketAdminInput.cs`, `ActualizarTicketAdminInput.cs`, validators, `ICuartaTicketAdminRepository.cs`, `CuartaTicketAdminRepository.cs`, `ICuartaTicketAdminService.cs`, `CuartaTicketAdminService.cs`, `TicketsController.cs`, `ServiceCollectionExtensions.cs`, `CuartaTicketAdminServiceTests.cs`

**Web:** `ticketAdminSchemas.ts`, `useTicketAdminMutations.ts`, `TicketAdminForm.tsx`, `AdminTicketsPage.tsx`, `AdminTicketsPage.test.tsx`

### Auditoría SQL

- Estado: No aplica

### Auditoría general (fase 2)

- Estado: APROBADO (revisión estática: endpoints admin bajo `SoloAdministrador`; validación residente activo; edición bloqueada en **Cerrado**)
- Hallazgos: —
- Correcciones: —

### Pruebas fase 2

- `CuartaTicketAdminServiceTests`: **4/4 PASS**
- Vitest `AdminTicketsPage.test.tsx`: **7/7 PASS**
- `tsc --noEmit`, `vite build`: OK

### Criterios ADM

- [x] CA-ADM: listar, crear, ver, editar, comentar, estado, asignar, eliminar desde `/admin/tickets`
- [x] CA-6: alta admin (API + UI)
- [x] CA-REG: Vitest admin 7/7; sin cambios en rutas residente

## Fase 3 — Catálogos CAT/PRI + EST-2

### Ajustes durante implementación

- Restaurado `ticketAdminEditSchema` tras edición parcial en sesión previa.
- `ITicketCatalogoRepository`: `using GraphApi.Models.TKT` (fix compilación).
- Tests admin: `MemoryRouter` por enlace «Catálogos».

### Implementación realizada

- BE: servicio/repo CRUD catálogo, `PrioridadesTicketController`, admin en `CategoriasTicketController`, `GET /TKT/PrioridadesTicket`, validators.
- FE: `AdminTicketCatalogosPage`, EST-2 en badge/transiciones, prioridades API en forms, ruta `/admin/tickets/catalogos`.

### Auditoría SQL

- Estado: No aplica

### Auditoría general (fase 3)

- Estado: **APROBADO** (estática)
- Hallazgos: —
- Correcciones: `using` en `ITicketCatalogoRepository`

### Pruebas fase 3

- xUnit `FullyQualifiedName~CuartaTicket`: **13 PASS**
- Vitest admin tickets + catálogos: **11 PASS** (8 + 3)
- `tsc`, `vite build`: OK

### Criterios fase 3

- [x] CAT/PRI CRUD + GET prioridades
- [x] Tab Estados (INV-10)
- [x] EST-2 etiquetas admin
- [x] PRI-2 forms desde API

## Verificación final (/revisar 2026-10-28 — fases 1–3)

### Criterios de aceptación

- [x] CA-ADM, CA-REG, CA-1..CA-9 (fases 1–2)
- [x] CAT-1, CAT-2, PRI-1, PRI-2, EST-1, EST-2 [M]
- [x] CA-CAT, CA-PRI, CA-EST, CA-EST2, CA-REG2 [M]
- [ ] S-1 Should: timeline — no implementado (recorte acordado)

### Pruebas T-SQL (tester-sql)

- No aplica (sin SP/DDL; sin `*PruebasUnitarias.sql`)

### Pruebas contrato C# xUnit

- `dotnet test --filter FullyQualifiedName~CuartaTicket` → **13/13 PASS** (incl. `CuartaTicketCatalogoAdminServiceTests` 409 in-use + 201 create)

### Pruebas API

- Archivo: `FE-TKT-DET-001_api_tests.http` (detalle, comentarios, CRUD admin, catálogos)
- Resultado: **No ejecutado runtime** (contrato en `TKT-FE-TKT-DET-001-APIS.md`; smoke recomendado pre-merge)

### Pruebas frontend

- Vitest: AdminTicketsPage + AdminTicketCatalogosPage + TicketDetallePage + TicketsPage → **16/16 PASS**
- `tsc --noEmit`, `vite build`: OK

### QA Checklist

- [x] Happy path admin catálogos + EST-2 + regresión tickets
- [x] Caso negativo `CATALOG_IN_USE` (xUnit)
- [x] Edge duplicado vía SQL unique → `CATALOG_DUPLICADO` (servicio)
- [x] Permisos: mutaciones catálogo `SoloAdministrador`
- [ ] Smoke HTTP con API local

### Auditorías verificadas

- auditor-sql: **No aplica** (Dapper parametrizado; sin scripts T-SQL en ticket)
- auditor-codigo: **APROBADO** (fases 1–3; controllers + servicios + FE alineados a design)
- auditor-seguridad: **APROBADO** — JWT admin en CRUD catálogo; 409 in-use; soft delete; sin IDs desde body para identidad
- auditor-flutter: No aplica

### Desviaciones detectadas

- Ninguna bloqueante vs spec v3.

### Pendientes

- Smoke manual `.http` catálogos con token admin (opcional pre-merge).
- Sello `verde`/`revisar`: **SIN SELLO** (sin objetos SQL versionados en ticket).

