[← index](_index.md) | [design →](design.md)

# spec.md — USR-BE-008: Ver y editar perfil (HU-USR-02)

> Generado por: **generador de contexto SDD**
> Consumido por: `desarrollador-api`, `desarrollador-react`, `api-tester`, `auditor-codigo`
> **Tipo:** Feature

## User story

Como residente, quiero ver y actualizar mis datos de contacto, para mantener mi información vigente (HU-USR-02).

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | readme §6 Ticket 8, §5 HU-USR-02, §4 rutas `/SGR/Usuarios` |
| Técnico | [specs/usuarios.md](../../specs/usuarios.md), `sgr.vsUsuarios` (DB-001), [USR-BE-007](../tkt-usr-be-007/_index.md) |
| Mockup | Wireframes §1.3 (Mi Perfil) |

**Actual:** sin API ni pantalla perfil.

**Esperado:** `GET/PUT /SGR/Usuarios/{id}`; lectura vía `sgr.vsUsuarios`; residente solo su `sub`; Admin edita cualquiera y puede cambiar `Nombre`.

## Alcance (MoSCoW)

### Must
- `GET /SGR/Usuarios/{id}` desde `sgr.vsUsuarios` (nombre, unidad/casa, teléfono, correo, condominio).
- `PUT`: residente actualiza `Telefono`, `Correo`; Admin también `Nombre`.
- Correo único → 409 `CONFLICT` "El correo ya está en uso".
- Autorización: `id` debe coincidir con `sub` salvo `bAdministrador`.
- Auditoría en `PUT`: `Modificado`, `UsuarioModificacionID`, `FechaModificacion`.
- Si cambia `Correo`: revocar refresh tokens del usuario; debe re-login.
- Frontend: formulario Mi Perfil, validación Zod (correo, teléfono numérico).
- Tests: GET propio, PUT correo duplicado, PUT ajeno 403.

### Should
- Apollo mutation + invalidación de cache de perfil `(asumido)`.

### Could
- ninguno

### Won't
- Cambio de contraseña (USR-BE-036).
- Alta/baja de usuarios (USR-BE-009).
- localStorage para tokens (FE-030: memoria + cookie refresh).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | DML `sgr.Usuarios`, `sgr.RefreshTokens` |
| `backend:cuartaquinientos-api` | `UsuariosController` GET/PUT |
| `frontend:cuartaquinientos-web` | ruta `/perfil` o equivalente |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Correo único entre `bEliminado=0` | usuarios INV-1 |
| INV-2 | JWT `sub` = `UsuarioID` | ADR-003 |
| INV-3 | Autorización por `perfil` | usuarios INV-5 |
| INV-4 | BCrypt/hash no expuesto en vistas | DB-001 |
| INV-5 | Sin SP de negocio | base-datos INV-4 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: GET propio — **Dado** JWT residente **Cuando** `GET /SGR/Usuarios/{sub}` **Entonces** 200 con datos de `sgr.vsUsuarios` incluyendo unidad y correo.
- [ ] **CA-2 [M]**: PUT teléfono — **Dado** residente **Cuando** `PUT` con `Telefono` válido **Entonces** 200 y fila actualizada con auditoría.
- [ ] **CA-3 [M]**: correo duplicado — **Dado** correo usado por otro activo **Cuando** `PUT` **Entonces** 409 mensaje "El correo ya está en uso".
- [ ] **CA-4 [M]**: 403 cruzado — **Dado** residente A **Cuando** `GET/PUT` con id de B **Entonces** 403.
- [ ] **CA-5 [M]**: Admin — **Dado** admin **Cuando** `PUT` otro usuario incl. `Nombre` **Entonces** 200.
- [ ] **CA-6 [M]**: cambio correo — **Dado** PUT cambia `Correo` **Entonces** refresh tokens del usuario quedan `Revocado=1`.
- [ ] **CA-7 [M]**: frontend — **Dado** Mi Perfil **Cuando** guarda teléfono **Entonces** UI refleja valor sin recargar página completa.
- [ ] **CA-8 [M]**: validación cliente — **Dado** correo inválido **Cuando** submit **Entonces** error antes de llamar API.
- [ ] **CA-R1 [M]**: regresión INV-1 — **Dado** correo duplicado **Entonces** no se crea segunda fila activa.

## Reutilización detectada

- `sgr.vsUsuarios` (DB-001) — lectura; peldaño 3.
- `UsuarioActual`, `Result<T>`, ProblemDetails — SETUP-000 / USR-BE-007.
- Patrón revocación refresh — mismo que auth en USR-BE-007.

## Definition of Ready

- [x] Depende USR-BE-007, DB-001
- [x] CA completos

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Vista desactualizada vs tabla | Media | Tras DB-001 verificar columnas |

## Quick Checks

- [x] Actor nombrado (UsuariosController, vsUsuarios)
- [x] No localStorage tokens
