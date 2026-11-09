# delta.md — USR-BE-010: Casas API (Cuarta)

## Archivos nuevos
*(ninguno — todos son extensiones de archivos existentes)*

## Archivos modificados

### `GraphApi/Controllers/SGR/Casas/CasasController.cs`
- **+** Inyección de `IValidator<CasaCrearRequest> _validator` en constructor
- **+** Inyección de `ICuartaCasasService _cuartaSvc` en constructor
- **+** 6 action methods Cuarta: `ListarCasas`, `ListarCondominios`, `ObtenerCasa`, `CrearCasa`, `ActualizarCasa`, `EliminarCasa`
- **~** Coexiste con 4 actions legacy preexistentes (sin modificar)

### `GraphApi/Services/SGR/Casas/CuartaCasasService.cs`
- **+** Archivo nuevo (implementación completa de `ICuartaCasasService`)
- **+** 5 métodos públicos: `ListarCasasAsync`, `ListarCondominiosAsync`, `ObtenerCasaAsync`, `CrearAsync`, `ActualizarAsync`, `EliminarAsync`
- **+** Usa `IUnitOfWork` (patrón único entre servicios Cuarta)

### `GraphApi/Services/SGR/Casas/ICuartaCasasService.cs`
- **+** Interfaz nueva con 6 métodos async

### `GraphApi/Repositories/SGR/CasasCuartaRepository.cs`
- **+** Archivo nuevo (11 métodos)
- **+** `ListarCasasAsync`, `ListarCondominiosAsync`, `ObtenerCasaAsync`, `InsertCasaAsync`, `UpdateCasaAsync`, `SoftDeleteCasaAsync`, `CondominioExisteAsync`, `UsuarioExisteAsync`, `TieneOcupanteVigenteAsync`, `TieneCuotasActivasAsync`, (1 aux)

### `GraphApi/Repositories/SGR/ICasasCuartaRepository.cs`
- **+** Interfaz nueva con 11 métodos async

### `GraphApi/Validators/SGR/CasaCrearRequestValidator.cs`
- **+** Archivo nuevo — FluentValidation rules para `CasaCrearRequest`

### `GraphApi/Program.cs` / DI registration
- **+** `services.AddScoped<ICuartaCasasService, CuartaCasasService>()`
- **+** `services.AddScoped<ICasasCuartaRepository, CasasCuartaRepository>()`
- **+** `services.AddScoped<IValidator<CasaCrearRequest>, CasaCrearRequestValidator>()`

## Archivos sin cambios
- `GraphApi/Controllers/SGR/Condominios/CondominiosController.cs` (legacy only, no Cuarta endpoints)
- Modelos/DTOs preexistentes de `sgr.Casas`

## Tests
- No se creó `CuartaCasasServiceTests.cs`
- Cobertura vía: integration tests (smoke API + schema SQL) + validator unit tests
