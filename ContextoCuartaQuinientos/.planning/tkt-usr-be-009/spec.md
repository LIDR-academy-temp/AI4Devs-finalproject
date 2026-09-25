[← index](_index.md) | [design →](design.md)

# spec.md — USR-BE-009: Gestión usuarios/residentes Admin (HU-USR-04)

> Generado por: **generador de contexto SDD**
> Consumido por: `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`
> **Tipo:** Feature

## User story

Como administrador, quiero registrar, editar y desactivar usuarios, para mantener el padrón del condominio (HU-USR-04).

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | readme §6 Ticket 9, §5 HU-USR-04, fragmento `UsuarioService` |
| Técnico | [specs/usuarios.md](../../specs/usuarios.md), DB-002 (perfiles), USR-BE-007 |
| Mockup | N/A (Admin UI puede ser ticket FE posterior; este ticket es backend) |

**Esperado:** CRUD Admin con contraseña temporal generada en servidor, `CasaOcupantes`, desactivar/activar, soft delete, revocación de refresh.

## Alcance (MoSCoW)

### Must
- `POST /SGR/Usuarios` (solo Admin): crea usuario, `bActualizarPassword=1`, `201` + `{ usuarioId, passwordTemporal }` (12 chars, no en logs).
- Con `casaId`: insert `sgr.CasaOcupantes` (Propietario/Arrendatario según reglas readme), actualizar `PropietarioUsuarioID` si aplica.
- `PUT /SGR/Usuarios/{id}`: perfil, casa, contacto.
- `PATCH …/desactivar` → `bActivo=0`; `PATCH …/activar` → reversible; `DELETE` → `bEliminado=1`; revocar refresh en desactivar/delete.
- Inactivos excluidos de listas de asignación ticket y conteos residentes activos `(asumido)` vía filtros en queries de tickets posteriores — este ticket expone listado Admin con filtro.
- `GET /SGR/Usuarios` listado Admin con filtros básicos.
- Correo único 409 en alta.
- Tests: alta propietario/arrendatario, desactivar bloquea login, correo duplicado.

### Should
- `GET /SGR/Usuarios/{id}` reutilizado de USR-BE-008 para Admin.
- `GET /SGR/Usuarios/trabajadores` (solo Admin): usuarios con perfil **Trabajador**, `bActivo = 1`, `bEliminado = 0`; `200` con `[{ usuarioId, nombre }]` ordenado por nombre — consumido por [[FE-038]] (asignación en TKT-BE-016); coherente con readme §6 Ticket 9 (inactivos excluidos de listas de asignación).

### Could
- ninguno

### Won't
- Self-service registro.
- Email de bienvenida.
- UI Admin completa (puede ser FE futuro).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | DML `sgr.Usuarios`, `CasaOcupantes`, `Casas`, `RefreshTokens` |
| `backend:cuartaquinientos-api` | `UsuariosController` POST/PUT/PATCH/DELETE/GET |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Correo único activos | usuarios INV-1 |
| INV-2 | BCrypt; temporal no en logs | INV-2 |
| INV-3 | Soft delete / bActivo | INV-3 |
| INV-4 | Nuevo usuario `bActualizarPassword=1` | INV-4 |
| INV-5 | PerfilID válido | INV-7 |
| INV-6 | `sub` del admin en auditoría | ADR-003 |
| INV-7 | Transacciones Dapper | ADR-001 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: POST residente — **Dado** Admin **Cuando** `POST` con correo nuevo y `casaId` **Entonces** `201`, `passwordTemporal` 12 chars, `bActualizarPassword=1`, fila en `CasaOcupantes`.
- [ ] **CA-2 [M]**: propietario vs arrendatario — **Dado** casa sin propietario vigente **Entonces** `TipoResidencia=Propietario`; si ya hay **Entonces** `Arrendatario`.
- [ ] **CA-3 [M]**: correo duplicado — **Entonces** 409.
- [ ] **CA-4 [M]**: desactivar — **Cuando** `PATCH …/desactivar` **Entonces** `bActivo=0`, login 401, historial intacto, refresh revocados.
- [ ] **CA-5 [M]**: delete lógico — **Cuando** `DELETE` **Entonces** `bEliminado=1`, login bloqueado.
- [ ] **CA-6 [M]**: no Admin — **Cuando** residente llama `POST` **Entonces** 403.
- [ ] **CA-7 [M]**: password no logueada — **Entonces** Serilog sin `passwordTemporal`.
- [ ] **CA-8 [S]**: listado — **GET** Admin devuelve solo activos/no eliminados según query `(asumido)` default.
- [ ] **CA-9 [S]**: trabajadores para asignación — **Dado** dos usuarios Trabajador activos y uno desactivado **Cuando** Admin llama `GET /SGR/Usuarios/trabajadores` **Entonces** `200` con exactamente los dos activos; residente **Entonces** `403`.
- [ ] **CA-R1 [M]**: regresión INV-3 — **Dado** usuario desactivado con tickets **Entonces** tickets siguen referenciando su `UsuarioID`.

## Reutilización detectada

- Fragmento readme Ticket 9 — lógica transaccional referencia.
- `IPasswordGenerator` / BCrypt — mismo stack que auth.
- Perfiles por nombre desde DB-002.

## Definition of Ready

- [x] USR-BE-007 + DB-002

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Condición carrera propietario | Media | Transacción + locks lectura |

## Quick Checks

- [x] Temporal una sola vez en respuesta
- [x] MCP pendiente
