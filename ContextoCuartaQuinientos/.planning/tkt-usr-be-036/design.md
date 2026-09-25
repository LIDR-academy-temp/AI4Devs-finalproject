[← index](_index.md) | [← spec](spec.md)

# design.md — USR-BE-036: Cambio de contraseña

## Estrategia técnica

Añadir `CambiarPassword` a `AuthServiceController`; body `{ passwordActual, passwordNueva }`; identidad solo `sub`. Tras éxito: UPDATE hash, flag, revocar refresh **excepto** cookie actual `(asumido)` o revocar todos y forzar login — **decisión:** revocar todos (HU-USR-03 "demás sesiones").

Frontend: ruta `/cambiar-password`, integración con guard FE-030 cuando `requiereCambioPassword`.

### Escalera

| Capacidad | Peldaño | Objeto |
|---|---|---|
| BCrypt verify/hash | 3 | AuthService USR-BE-007 |
| Validación | 2 | FluentValidation + Zod |
| Guard rutas | 4 | extensión PrivateRoute FE-030 |

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/SGR/AuthService/CambiarPassword` | POST | passwordActual, passwordNueva | 204 | crear |

## frontend:cuartaquinientos-web

| Componente | Acción |
|---|---|
| `CambiarPasswordPage` | crear |
| `cambiarPasswordSchema` | Zod ≥8, ≠ actual |
| `RequirePasswordChangeGuard` | crear |

## Orden de implementación

| # | Paso | Dep | Verificación |
|---|------|-----|--------------|
| 1 | Validator + service | USR-BE-007 | unit |
| 2 | Endpoint | 1 | .http |
| 3 | Página + guard | FE-030 | vitest |
| 4 | E2E smoke | 2,3 | manual |

## Plan de pruebas

| Prueba | Tipo | Cubre |
|---|---|---|
| TC-INV-1 | regresión | CA-R1 INV-2 |
| TC-ERR-1 | negativo | actual mala 400 |
| TC-ERR-2 | negativo | nueva corta 400 |
| TC-RB | rollback | revert |

## Rollback

Revert endpoint + página.

## Autoverificación

- [x] Sin localStorage
- [ ] MCP — pendiente Entrega 2
