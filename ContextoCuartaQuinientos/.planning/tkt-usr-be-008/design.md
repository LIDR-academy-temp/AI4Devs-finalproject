[← index](_index.md) | [← spec](spec.md)

# design.md — USR-BE-008: Ver y editar perfil

## Estrategia técnica

Extender `UsuariosController` con GET/PUT; lectura exclusiva `sgr.vsUsuarios`; escritura parametrizada a `sgr.Usuarios`. Autorización: comparar `{id}` con `UsuarioActual.UsuarioId` o política Admin. Cambio de correo → `RefreshTokenRepository.RevocarPorUsuarioAsync`.

### Escalera

| Capacidad | Peldaño | Objeto |
|---|---|---|
| Lectura desnormalizada | 3 | `sgr.vsUsuarios` (DB-001) |
| PUT contacto | 4 | UPDATE parametrizado |
| Pantalla perfil | 5 | `PerfilPage.tsx` + Zod |
| Revocar refresh | 3 | repo USR-BE-007 |

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/SGR/Usuarios/{id}` | GET | — | PerfilDto | crear |
| `/SGR/Usuarios/{id}` | PUT | `{ telefono, correo, nombre? }` | 200 PerfilDto | crear |

## frontend:cuartaquinientos-web

| Componente | Acción | API |
|---|---|---|
| `PerfilPage` | crear | GET/PUT Usuarios |
| `perfilSchema` (Zod) | crear | validación |

## database:CuartaQuinientos

| Objeto | Acción |
|---|---|
| `sgr.Usuarios` | UPDATE |
| `sgr.RefreshTokens` | UPDATE Revocado |

## Orden de implementación

| # | Paso | Target | Dep | Verificación |
|---|------|--------|-----|--------------|
| 1 | DTO + validator | backend | SETUP | build |
| 2 | GET + auth | backend | DB-001 | .http 200 |
| 3 | PUT + 409 | backend | 2 | tests |
| 4 | UI perfil | frontend | 2 | vitest + manual |

## Plan de pruebas

| Prueba | Tipo | Cubre |
|---|---|---|
| TC-INV-1 | regresión | CA-R1 INV-1 |
| TC-ERR-1 | negativo | 403 ajeno |
| TC-ERR-2 | negativo | 409 correo |
| TC-RB | rollback | revert PR |

Triangulación: teléfono mínimo/máximo longitud.

## Rollback

Revert controller + página; sin DDL.

## Autoverificación

- [x] Won't sin CambiarPassword
- [ ] MCP vsUsuarios — pendiente Entrega 2
