[← index](_index.md) | [← design](design.md)

# Impl: ANM-BE-027

## Implementación

- `CuartaAnunciosRepository` + `CuartaAnunciosService` + DTOs/validators.
- `AnunciosController` / `TiposAnuncioController`: JWT en raíz, legacy en `*/legacy`.
- `AvisoGeneralAsync` tras crear anuncio (Should).
- Tests: `CuartaAnunciosServiceTests` (6) + `AnunciosAuthorizationTests` (1).

## Archivos

- `GraphApi/Models/ANM/Anuncios/*`
- `GraphApi/Repositories/ANM/*`
- `GraphApi/Services/ANM/Anuncios/CuartaAnunciosService.cs`
- `GraphApi/Controllers/ANM/**`
- `ServiceCollectionExtensions.cs`

## Ajustes durante implementación

- [2026-10-19] PUT `vigenteHasta`: flag `VigenteHastaEspecificado` desde `JsonElement` en controller; SQL `CASE WHEN @ActualizarVigenteHasta`.
- [2026-10-19] `MarcarVistoAsync`: `UPDLOCK, HOLDLOCK` en EXISTS.
- [2026-10-19] Validators: `AnuncioActualizarRequestValidator` + `MaximumLength` contenido crear/actualizar.
- [2026-10-19] Tests: +3 service + `AnunciosAuthorizationTests` (403 residente); suite SQL TC-ERR + TC-IDEM 2×.
- [2026-10-19] `.http`: `GenerateToken` + `token` en respuesta.

## Verificación final (/revisar 2026-10-19)

### Criterios de aceptación

- [x] **CA-1 [M]**: Cubierto por xUnit crear + diseño repository; smoke HTTP local bloqueado (login 401 sin hash seed local).
- [x] **CA-2 [M]**: SQL TC-2 + filtro vigencia en `ListarAsync` repository.
- [x] **CA-3 [M]**: SQL TC-IDEM 2× + xUnit doble `MarcarVistoAsync` + UPDLOCK.
- [x] **CA-4 [M]**: `AnunciosAuthorizationTests.Post_anuncios_residente_devuelve_403`.
- [x] **CA-5 [M]**: SQL TC-5 + seed CQ500 (3 tipos).
- [x] **CA-R1 [M]**: Rutas `*/legacy` en controllers.

### Pruebas T-SQL (tester-sql)

- Script: `20261019_ANM-BE-027_PruebasUnitarias.sql`
- Resultado: **4/4 PASS** CQ500; `-- [OK] TESTS [CQ500] → 4 PASS / 0 ROJO`
- Nota: script fixture TRAN (no `#TestResults`); alineado a design data-layer.

### Pruebas contrato C# xUnit

- `dotnet test` filtro CuartaAnuncios + AnunciosAuthorization: **7/7 PASS**

### Pruebas API

- Archivo: `ANM-BE-027_api_tests.http` (rutas auth corregidas)
- Endpoints: Tipos, list, POST admin, PATCH visto
- Resultado: **PARCIAL** — login local `401` (credencial/hash); verificado vía xUnit auth + CQ500 tipos

### QA Checklist

- [x] Happy path (código + unit)
- [x] Caso negativo SQL TC-ERR-1
- [x] Edge vigencia + idempotencia log
- [x] SQL parametrizado
- [x] Mutation: **N/A** (sin SP negocio; lógica en C# + tests)

### Auditorías verificadas

- auditor-sql: **APROBADO** (re-auditoría post-fix)
- auditor-codigo: **APROBADO**
- auditor-flutter: No aplica
- auditor-seguridad: **APROBADO** (validators PUT/contenido)

### Desviaciones detectadas

- Smoke HTTP manual pendiente con `FASE1_SMOKE_PASSWORD` / DB-002 local.

### Pendientes

- Ejecutar `.http` en entorno con usuarios seed antes de deploy.
