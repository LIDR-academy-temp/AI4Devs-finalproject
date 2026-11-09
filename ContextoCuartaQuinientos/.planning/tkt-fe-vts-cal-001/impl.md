# Impl: tkt-fe-vts-cal-001-vts-calendario-reservas

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- [2026-10-28] Bloques horarios: solapamiento por franja (no solo hora de inicio) — CA-1.
- [2026-10-28] Tope de rango 62 días (`VTS_RANGO_EXCESIVO`) — auditoría seguridad F001.
- [2026-10-28] Leyenda y sufijo `(Reservado)` en SQL/UI como MVP; catálogo `RESERVA_OCUPADA_LABEL` pendiente Entrega 2.

## Implementación realizada

- `ListarReservacionesCalendarioAsync` en repo/servicio con SQL parametrizado, excluye `Cancelada` por nombre.
- `GET /VTS/ReservacionesArea/calendario` (JWT, query `areaComunId`, `desde`, `hasta`).
- UI: tabs Calendario / Mis reservas, selector de área, `ReservasCalendarioSemanal` (grid semanal, leyenda, navegación semana).
- Hook `useReservacionesCalendario` con rango semanal local→ISO.

## Archivos modificados

- `GraphApi/Models/VTS/CuartaVisitas/CuartaVisitasDtos.cs`
- `GraphApi/Repositories/VTS/ICuartaVisitasRepository.cs`, `CuartaVisitasRepository.cs`
- `GraphApi/Services/VTS/CuartaVisitas/ICuartaVisitasService.cs`, `CuartaVisitasService.cs`
- `GraphApi/Controllers/VTS/ReservacionesArea/ReservacionesAreaController.cs`
- `GraphApi/GraphApi.Tests/CuartaVisitasServiceTests.cs`
- `Web/src/shared/types/visitas.ts`
- `Web/src/features/visitas/useReservacionesCalendario.ts`, `ReservasCalendarioSemanal.tsx`, `reservasCalendarioUtils.ts`
- `Web/src/pages/AreasYReservacionesPage.tsx`, `AreasYReservacionesPage.test.tsx`

## Auditoría SQL

- Estado: No aplica (sin scripts `.sql`; Dapper inline existente).

## Auditoría general

- Estado: APROBADO tras correcciones F002/F003/F005/F008.
- Hallazgos menores pendientes: smoke `.http` endpoint (F007), contenido configurable ARB (F004).

## Auditoría seguridad

- Estado: APROBADO con tope 62 días aplicado.
- Hallazgo F002 logging: no implementado (severidad baja).

## Correcciones automáticas

- Solapamiento multi-hora en grid, tests TC-VTS-C-2/3, validación rango excesivo.

## Scripts de prueba creados

### T-SQL unitarias
- No aplica (sin SP).

### Contrato C# xUnit
- Archivo: `CuartaVisitasServiceTests.cs` (TC-VTS-C-1, TC-VTS-C-2, rango inválido/excesivo)
- `dotnet test`: 13 PASS en filtro CuartaVisitasServiceTests

### API `.http`
- No creado (pendiente `/revisar`).

### Vitest
- `AreasYReservacionesPage.test.tsx` — TC-VTS-C-3 + regresión tabs

## Resultado contra criterios de aceptación

- [x] CA-1: bloques por franja horaria ocupada en calendario
- [x] CA-2: POST conflicto sin cambio (409/`VTS_SOLAPAMIENTO` existente)
- [x] CA-3: SQL excluye Cancelada
- [x] CA-4: Vitest calendario extendido

## Mutation / TDD

- N/A: delegación servicio + SQL estático; mutación manual no requerida en design.

## Verificación final

### Criterios de aceptación

- [x] CA-1 [M]: grid por solapamiento de franjas horarias
- [x] CA-2 [M]: conflicto POST → `ProblemDetails` en UI (409 `VTS_SOLAPAMIENTO`; spec M-4 citaba 422 — comportamiento previo sin cambio)
- [x] CA-3 [M]: SQL `NOT IN ('Cancelada')`
- [x] CA-4 [M]: Vitest calendario (TC-VTS-C-3)
- [x] M-1..M-3, M-5: selector, DTO, JWT, día completo (`isDiaCompleto` test)
- [x] S-1, S-2: leyenda + navegación semana

### Pruebas T-SQL (tester-sql)

- No aplica (sin SP / script `*Pruebas*.sql`)

### Pruebas contrato C# xUnit

- `dotnet test GraphApi.Tests --filter CuartaVisitasServiceTests`: **13/13 PASS**

### Pruebas API

- Archivo: `FE-VTS-CAL-001_api_tests.http`
- Endpoints: GET calendario (200/422/401), POST conflicto regresión
- Resultado: **Pendiente runtime** (API local no levantada en revisión); contrato documentado en `FE-VTS-CAL-001-APIS.md`

### QA Checklist

- [x] Happy path calendario + tabs
- [x] Caso negativo (422 área/rango, 409 solape vía test existente)
- [x] Cancelada excluida en SQL
- [ ] Smoke HTTP GET en runtime — pendiente manual con API + BD alineada (readme §3)

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: APROBADO (post-correcciones /ejecutar)
- auditor-seguridad: APROBADO (tope 62 días)
- auditor-flutter: No aplica

### Desviaciones detectadas

- M-4 texto spec “422” vs 409 en `CrearReservacionAsync` (pre-existente FE-047).
- Etiqueta `(Reservado)` hardcodeada — MVP; catálogo pendiente Entrega 2.

### Pendientes

- Ejecutar `FE-VTS-CAL-001_api_tests.http` contra API levantada antes de merge a entrega-2.
- Catálogo `RESERVA_OCUPADA_LABEL` / leyenda ARB (Should contenido configurable).
