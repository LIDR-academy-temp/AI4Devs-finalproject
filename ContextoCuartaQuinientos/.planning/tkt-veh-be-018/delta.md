# delta.md — tkt-veh-be-018 (VEH BE)

## Endpoints Cuarta entregados

| Método | Ruta | Auth | Código OK |
|--------|------|------|-----------|
| GET | `/USR/Automoviles` | JWT | 200 |
| GET | `/USR/Automoviles/buscar?placas=` | AdminOGuardia | 200 |
| POST | `/USR/Automoviles` | JWT | 201 |
| PUT | `/USR/Automoviles/{id}` | JWT | 204 |
| DELETE | `/USR/Automoviles/{id}` | JWT | 204 |

## Operaciones SQL nuevas

| Operación | Tabla | Notas |
|-----------|-------|-------|
| SELECT (mis autos) | `usr.Automoviles` + joins | WHERE UsuarioID + bEliminado=0 |
| SELECT LIKE | `usr.Automoviles` | Placas LIKE '%...%' |
| SELECT COUNT (existe placa) | `usr.Automoviles` | excluye propio ID en update |
| SELECT COUNT (ownership) | `usr.Automoviles` | UsuarioID + bEliminado=0 |
| INSERT | `usr.Automoviles` | SCOPE_IDENTITY() |
| UPDATE (COALESCE) | `usr.Automoviles` | campos opcionales |
| UPDATE (soft-delete) | `usr.Automoviles` | bEliminado=1 |
| SELECT catálogo | `usr.Marcas` | bEliminado=0 |
| SELECT catálogo | `usr.Modelos` | bEliminado=0 |

## Códigos de error de negocio

| Código | HTTP | Condición |
|--------|------|-----------|
| `VEH_PLACAS_REQUERIDAS` | 422 | Placas vacía/nula al crear o buscar |
| `VEH_PLACAS_DUPLICADAS` | 409 | Placas ya existe (excluye propio registro en update) |
| `VEH_NOT_FOUND` | 404 | Auto no existe o no pertenece al usuario |

## Decisiones clave

- Dominio en **USR** (no VEH): controller, service y repository viven bajo `USR/` para cohesión con el perfil de usuario.
- Ownership check (EsDuenioAsync) antes de cualquier mutación: evita exponer existencia de recursos de otros usuarios.
- Placas normalizadas a UPPERCASE en service antes de persistir; búsqueda LIKE case-insensitive en SQL Server.
- Transacciones manuales via `IDbConnection.BeginTransaction()` en service; repository recibe `IDbTransaction` como parámetro.
