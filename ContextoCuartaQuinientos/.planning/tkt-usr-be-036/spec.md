[← index](_index.md) | [design →](design.md)

# spec.md — USR-BE-036: Cambio de contraseña (HU-USR-03)

> Generado por: **generador de contexto SDD**
> Consumido por: `desarrollador-api`, `desarrollador-react`, `api-tester`, `auditor-seguridad`
> **Tipo:** Feature

## User story

Como usuario, quiero cambiar mi contraseña, para mantener la seguridad de mi cuenta cuando inicio con temporal (HU-USR-03).

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | readme §6 Ticket 36, §5 HU-USR-03, §4 `AuthService/CambiarPassword`, FE-030 redirección |
| Técnico | [specs/usuarios.md](../../specs/usuarios.md), USR-BE-007 |
| Mockup | `/cambiar-password` §1.3 |

**Esperado:** `POST /SGR/AuthService/CambiarPassword` (JWT); pantalla; FE-030 bloquea rutas mientras `requiereCambioPassword`.

## Alcance (MoSCoW)

### Must
- Endpoint verifica actual con BCrypt; nueva ≥ 8 chars y ≠ actual (FluentValidation + Zod).
- Actualiza `PasswordHash`, `bActualizarPassword=0`, revoca otros refresh del usuario (mantiene sesión actual `(asumido)` o fuerza re-login — alinear a HU: revoca demás sesiones).
- Frontend `/cambiar-password`; guard de rutas cuando flag activo.
- Tests: éxito, actual incorrecta 400, nueva igual actual 400.

### Should
- Mensajes HU: "La contraseña actual no es correcta".

### Could
- ninguno

### Won't
- Recuperación por email.
- Cambio de correo (USR-BE-008).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | UPDATE `sgr.Usuarios`, `sgr.RefreshTokens` |
| `backend:cuartaquinientos-api` | `AuthServiceController.CambiarPassword` |
| `frontend:cuartaquinientos-web` | página cambio contraseña + guard |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | BCrypt | usuarios INV-2 |
| INV-2 | Mínimo 8 caracteres | INV-6 |
| INV-3 | Tras cambio válido `bActualizarPassword=0` | INV-4 |
| INV-4 | Identidad solo JWT `sub` | ADR-003 |
| INV-5 | Sin SP | base-datos INV-4 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: éxito — **Dado** JWT y actual correcta **Cuando** `POST CambiarPassword` con nueva válida **Entonces** 200/204, hash actualizado, `bActualizarPassword=0`, otros refresh revocados.
- [ ] **CA-2 [M]**: actual incorrecta — **Entonces** 400 mensaje HU, sin cambio hash.
- [ ] **CA-3 [M]**: nueva inválida — **Dado** &lt;8 chars o igual actual **Entonces** 400 validación antes/después BD.
- [ ] **CA-4 [M]**: frontend guard — **Dado** `requiereCambioPassword` **Cuando** navega a `/dashboard` **Entonces** redirige `/cambiar-password`.
- [ ] **CA-5 [M]**: Zod — **Entonces** mismas reglas que servidor en formulario.
- [ ] **CA-6 [M]**: login posterior — **Dado** cambio exitoso **Cuando** login con nueva **Entonces** 200 y `requiereCambioPassword=false`.
- [ ] **CA-R1 [M]**: regresión INV-2 — **Entonces** logs sin contraseñas.

## Reutilización detectada

- `AuthServiceController` USR-BE-007 — extensión endpoint.
- Revocación refresh — mismo repositorio que logout.
- Guard de rutas — extensión `PrivateRoute` FE-030.

## Definition of Ready

- [x] USR-BE-007 + FE-030

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Usuario queda sin sesión tras cambio | Baja | Documentar UX re-login |

## Quick Checks

- [x] No localStorage
- [x] CA-R presentes
