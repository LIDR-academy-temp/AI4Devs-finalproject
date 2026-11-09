# Impl: tkt-fnz-be-012-reporte-morosos

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- 2026-10-16 — `ReportesController` existente usa ruta `api/v1/reportes` (ReportEngine); morosos en `FinanzasMorososController` con ruta explícita `Reports/Reportes/Morosos` (readme §6).

## Implementación realizada

- `GET /Reports/Reportes/Morosos` (`SoloAdministrador`), query opcional `mes` + `anio`.
- `FinanzasService.ObtenerMorososAsync` — `@Hoy` local México; filtro `PeriodoInicio` en rango mes.
- `MorososRepository` — consulta Dapper con columnas legacy (`NombreUsuario`, `NumeroExtCasa`) o DB-001.
- `MorosoDto`, `MorososQueryValidator`.

## Archivos modificados

- `GraphApi/Controllers/Reports/FinanzasMorososController.cs`
- `GraphApi/Services/FNZ/FinanzasService.cs`, `IFinanzasService.cs`
- `GraphApi/Repositories/FNZ/MorososRepository.cs`, `IMorososRepository.cs`
- `GraphApi/Models/FNZ/MorosoDtos.cs`, `MorososQueryValidator.cs`
- `GraphApi/Infrastructure/Extensions/ServiceCollectionExtensions.cs`
- `GraphApi/GraphApi.Tests/MorososQueryValidatorTests.cs`, `FinanzasServiceMorososTests.cs`
- `GraphApi/GraphApi.Tests/FinanzasServiceRegistrarPagoTests.cs` (ctor `IMorososRepository`)

## Auditoría SQL

- Estado: APROBADO — solo lectura, parametrizado, `NOLOCK` en lectura.

## Auditoría general

- Estado: APROBADO — auth admin, sin escrituras.

## Scripts de prueba

- xUnit: `MorososQueryValidatorTests` (4), `FinanzasServiceMorososTests` (1); `CuotaEstadoClassifierTests` cubre CA-4 (`FechaVencimiento` hoy ≠ moroso).
- `.http`: `FNZ-BE-012_api_tests.http`

## Resultado contra criterios de aceptación

- [x] CA-1..CA-6, CA-R1 — lógica en SQL + tests unitarios servicio/validador/clasificador
- [x] CA-R2 — sin transacción de escritura
- [ ] Smoke HTTP con BD real — pendiente credenciales (igual FNZ-BE-011)

## Verificación final

`dotnet test` filtro Morosos + build OK (`DOTNET_ROLL_FORWARD=Major`).
