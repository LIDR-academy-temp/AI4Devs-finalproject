[← index](_index.md) | [← design](design.md)

# Impl: ENC-BE-024

## Implementación

- `CuartaEncuestasRepository` + `CuartaEncuestasService` (Dapper, sin SP).
- `EncuestasController`: rutas JWT Cuarta; legacy en `*/legacy`.
- `TiposPreguntaController`: `GET` JWT + legacy.
- Seed `SQL/DB-004_enc_seed.sql`.
- Validación `OpcionPerteneceAPregunta` en envío de respuestas.

## Archivos

- `GraphApi/Repositories/ENC/*`
- `GraphApi/Services/ENC/Encuestas/CuartaEncuestasService.cs`
- `GraphApi/Models/ENC/Encuestas/CuartaEncuestasDtos.cs`
- `GraphApi/Controllers/ENC/Encuestas/EncuestasController.cs`
- `GraphApi/Controllers/ENC/TiposPregunta/TiposPreguntaController.cs`
- `GraphApi.Tests/CuartaEncuestasServiceTests.cs`
- `SQL/DB-004_enc_seed.sql`

## Verificación final (/revisar 2026-10-19)

### Criterios de aceptación

- [x] **CA-1**: Inserción `enc.Respuestas` — SQL TC-01 + flujo API POST respuestas.
- [x] **CA-2**: Segunda participación — xUnit `YA_PARTICIPO` 409 + SQL TC-ERR-2.
- [x] **CA-3**: Fuera de vigencia — xUnit `ENCUESTA_CERRADA` 422 + SQL TC-ERR-3.
- [x] **CA-4**: Porcentajes opción suman 100 — SQL TC-04 + `ObtenerResultadosAsync`.

### Pruebas T-SQL (tester-sql)

- Script: `20261019_ENC-BE-024_PruebasUnitarias.sql`
- Resultado: **5/5** passed (`-- [OK] TESTS [CQ500] -> 5 PASS / 0 ROJO`, local sqlcmd)

### Pruebas contrato C# xUnit

- `dotnet test` (sin smoke): **68/68** PASS
- Nuevos: `CuartaEncuestasServiceTests` (4)

### Pruebas API

- Archivo: `ENC-BE-024_api_tests.http`
- Ejecución HTTP: pendiente credenciales smoke (`FASE1_SMOKE_PASSWORD`); contrato en `ENC-BE-024-APIS.md`

### QA Checklist

- [x] Happy path crear/publicar/responder (código + SQL)
- [x] Casos negativos 409/422/400
- [x] Seed DB-004 idempotente
- [ ] Mutation Stryker: N/A (lógica validada xUnit + SQL INV)

### Auditorías verificadas

- auditor-sql: **APROBADO** (seed + suite data-layer, sin SP)
- auditor-codigo: **APROBADO** (patrón Cuarta + legacy aislado)
- auditor-seguridad: **APROBADO** (JWT, validación opción/pregunta, sin SQL dinámico)

### Desviaciones detectadas

- Ninguna bloqueante.

### Pendientes

- Correr `.http` con API + password seed antes de deploy.
- Alinear catálogo `TiposPregunta` en BD compartida (CQ500 puede tener tipos legacy además de DB-004).
