# impl.md — USR-BE-010: Casas API (Cuarta)

## Ticket
**USR-BE-010** — CRUD Casas para administradores (endpoints Cuarta en SGR domain)

---

## Archivos implementados

### Controlador
**`GraphApi/Controllers/SGR/Casas/CasasController.cs`**

Route base: `SGR/Casas` — `[Authorize]`

#### Endpoints Cuarta (todos requieren `[Authorize(Policy = "SoloAdministrador")]`)

| Método | Ruta | Servicio | Respuestas |
|--------|------|----------|-----------|
| GET | `SGR/Casas` | `ListarCasasAsync(condominioId?, numero?, incluirEliminados=false)` | 200 |
| GET | `SGR/Casas/condominios` | `ListarCondominiosAsync()` | 200 |
| GET | `SGR/Casas/{id}` | `ObtenerCasaAsync(id)` | 200 / 404 |
| POST | `SGR/Casas` | FluentValidation → `CrearAsync(req, adminId, correo)` | 201 / 404 / 422 |
| PUT | `SGR/Casas/{id}` | `ActualizarAsync(id, req, adminId, correo)` | **200 con body** / 404 |
| DELETE | `SGR/Casas/{id}` | `EliminarAsync(id, adminId, correo)` | 204 / 404 / 409 |

> **Nota**: PUT devuelve `Ok(data)` (200 con body CasaDetalle), no `NoContent()` (204). Diferente a la mayoría de módulos.

#### Endpoints legacy (heredados, basados en headers `UserID` / `WindowName`)
- GET `SGR/Casas/legacy`
- POST `SGR/Casas/legacy`
- PATCH `SGR/Casas/legacy`
- DELETE `SGR/Casas/legacy`

#### Identidad del administrador
```csharp
var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
var correo  = User.FindFirstValue(ClaimTypes.Email)!;
```

#### FluentValidation (POST)
```csharp
// Inyectado en constructor
private readonly IValidator<CasaCrearRequest> _validator;

// Uso en acción POST
var validation = await _validator.ValidateAsync(request);
if (!validation.IsValid)
    return ValidationProblem(validation);
```

---

### Servicio
**`GraphApi/Services/SGR/Casas/CuartaCasasService.cs`**

Implementa `ICuartaCasasService`.

> **Patrón único**: Inyecta `IUnitOfWork _uow` (no `IDbConnection` directamente).  
> Todos los demás servicios Cuarta usan `IDbConnection + db.Open() + db.BeginTransaction()`.

#### `CrearAsync(req, adminId, correo)`
```
_uow.BeginTransaction()
→ CondominioExisteAsync(req.CondominioId) → false → 404
→ UsuarioExisteAsync(req.PropietarioUsuarioId) → false → 404
→ repo.InsertCasaAsync(req, auditFields)
→ _uow.Commit()
→ ObtenerCasaAsync(nuevoCasaId)
→ return (casa, null, 201, null)
```

#### `ActualizarAsync(id, req, adminId, correo)`
```
_uow.BeginTransaction()
→ repo.ObtenerCasaAsync(id) → null → 404
→ UsuarioExisteAsync(req.PropietarioUsuarioId) → false → 404
→ repo.UpdateCasaAsync(id, req, auditFields) → false → 404
→ _uow.Commit()
→ repo.ObtenerCasaAsync(id)
→ return (casa, null, 200, null)   ← 200 con data
```

#### `EliminarAsync(id, adminId, correo)`
```
_uow.BeginTransaction()
→ TieneOcupanteVigenteAsync(id) || TieneCuotasActivasAsync(id)
  → true → 409 CONFLICT (code: "CASA-OCUPADA" o "CASA-CON-CUOTAS")
→ repo.SoftDeleteCasaAsync(id, auditFields) → false → 404
→ _uow.Commit()
→ return (true, null, 204, null)
```

---

### Repositorio
**`GraphApi/Repositories/SGR/CasasCuartaRepository.cs`**

Implementa `ICasasCuartaRepository`. 11 métodos.

#### Patrones clave
- `SCOPE_IDENTITY()` para INSERT (no `OUTPUT INSERTED`)
- `SYSUTCDATETIME()` para auditoría (no `GETDATE()`)
- Soft delete via `bEliminado = 1`, `FechaEliminado`, `EliminadoPor`

#### `ListarCasasAsync(condominioId?, numero?, incluirEliminados)`
- SQL dinámico con concatenación de filtros (seguro via `@params`)
- JOINs: `sgr.Casas + sgr.Condominios + sgr.Usuarios` (LEFT JOIN para propietario)
- Vista o query directa — retorna `IEnumerable<CasaAdminItem>`

#### `ObtenerCasaAsync(casaId)`
```csharp
// Llama a ListarCasasAsync(null, null, incluirEliminados: true)
// Luego hace FirstOrDefault(x => x.CasaId == casaId)
// (No hay SELECT directo por ID)
```

#### `TieneOcupanteVigenteAsync(casaId)`
```sql
-- Verifica existencia de la tabla antes de consultar (forward-compatible)
IF OBJECT_ID(N'sgr.CasaOcupantes', N'U') IS NOT NULL
  SELECT COUNT(*) FROM sgr.CasaOcupantes WHERE CasaId = @CasaId AND bActivo = 1
```

#### `TieneCuotasActivasAsync(casaId)`
```sql
-- Cross-domain: consulta fnz.Cuotas
SELECT COUNT(*) FROM fnz.Cuotas WHERE CasaId = @CasaId AND bActivo = 1
```

---

### Tests
No existe `CuartaCasasServiceTests.cs` dedicado.  
Los "57 tests" registrados en el ticket son tests de integración/schema:
- `Fase1SmokeApiIntegrationTests` (smoke sobre endpoints reales)
- `SqlSchemaIntegrationTests` (verificación de objetos SQL)
- Tests del validador FluentValidation (`CasaCrearRequestValidatorTests`)

---

## Decisiones de diseño destacadas

1. **IUnitOfWork vs IDbConnection**: CuartaCasasService es el único servicio Cuarta que usa `IUnitOfWork`. El resto abre `IDbConnection` manualmente. Razón: Casas requería transacciones que abarcan múltiples dominios (sgr + fnz check).

2. **PUT retorna 200 con body**: `Actualizar` devuelve `Ok(casaActualizada)` en lugar de `NoContent()`. Permite al cliente actualizar su estado sin un GET adicional.

3. **FluentValidation en controlador**: `CasasController` inyecta `IValidator<CasaCrearRequest>` y valida antes de llamar al servicio. Otros módulos validan en la capa de servicio.

4. **Guard de eliminación cross-domain**: `TieneCuotasActivasAsync` consulta `fnz.Cuotas` — la verificación cruza dominios para proteger integridad referencial sin FK de base de datos.

5. **Forward-compatibility en ocupantes**: `TieneOcupanteVigenteAsync` verifica `OBJECT_ID` antes de consultar la tabla, permitiendo deploy antes de que exista `sgr.CasaOcupantes`.
