[← index](_index.md) | [← spec](spec.md)

# design.md — USR-BE-009: Gestión Admin usuarios

## Estrategia técnica

`UsuarioService` transaccional (readme fragmento Ticket 9): POST crea hash BCrypt, CasaOcupantes en misma `IDbTransaction`. Política `[Authorize]` + claim `bAdministrador`. Listado con filtros `bEliminado=0` y opcional `bActivo`.

### Escalera

| Capacidad | Peldaño | Objeto |
|---|---|---|
| Alta transaccional | 4 | `UsuarioService.CrearResidenteAsync` |
| Password temporal | 5 | `IPasswordGenerator` (12 chars) |
| PATCH desactivar | 4 | UPDATE + revocar refresh |

## backend:cuartaquinientos-api

| Endpoint | Verbo | Acción |
|---|---|---|
| `/SGR/Usuarios` | GET | listado Admin |
| `/SGR/Usuarios/trabajadores` | GET | Trabajadores activos (Admin; [[FE-038]]) |
| `/SGR/Usuarios` | POST | alta |
| `/SGR/Usuarios/{id}` | PUT | edición |
| `/SGR/Usuarios/{id}/desactivar` | PATCH | bActivo=0 |
| `/SGR/Usuarios/{id}/activar` | PATCH | bActivo=1 |
| `/SGR/Usuarios/{id}` | DELETE | soft delete |

## database:CuartaQuinientos

DML en `sgr.Usuarios`, `CasaOcupantes`, `Casas`, `RefreshTokens`.

## Orden de implementación

| # | Paso | Dep | Verificación |
|---|------|-----|--------------|
| 1 | POST + transacción | USR-BE-007 | integration test |
| 2 | PATCH/DELETE | 1 | login bloqueado |
| 3 | GET listado | 1 | filtros |
| 4 | PUT ampliado | USR-BE-008 overlap | 409 |

## Plan de pruebas

| Prueba | Tipo | Cubre |
|---|---|---|
| TC-INV-1 | regresión | CA-R1 INV-3 |
| TC-ERR-1 | negativo | POST no admin 403 |
| TC-ERR-2 | negativo | correo dup 409 |
| TC-RB | rollback | revert |

Mutation: 3 mutantes en regla Propietario/Arrendatario.

## Rollback

Revert servicio; datos sembrados en tests en TRAN.

## Autoverificación

- [x] TC-INV ↔ INV-3
- [ ] MCP — pendiente Entrega 2
