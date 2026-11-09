[← index](_index.md) | design → (pendiente)

# spec.md — FE-041: Padrón usuarios/residentes (Admin)

> **Tipo:** Feature

## User story

Como administrador, quiero listar, crear, editar y desactivar usuarios/residentes desde la web, para mantener el padrón del condominio (HU-USR-04).

## Contexto / problema

| Tipo | Fuente |
|------|--------|
| Requerimiento | readme HU-USR-04; [USR-BE-009](../tkt-usr-be-009/spec.md) |
| Técnico | Endpoints existentes en `UsuariosController`: `GET /SGR/Usuarios`, `POST`, `PUT {id}`, `PATCH …/activar|desactivar`, `DELETE {id}` |
| Mockup | Patrón tabla admin: `MorososTable.tsx`; formulario: `LoginPage` / `RegistrarPagoModal` |

**Actual:** API admin operativa; sin pantalla.

**Esperado:** `/admin/usuarios` dentro del shell FE-SHELL-001.

## Alcance (MoSCoW)

### Must
- Ruta `/admin/usuarios` protegida (`AdminRoute`).
- Tabla: correo, nombre, perfil, activo, casa (si viene en DTO); filtros perfil y activo; estados loading/error/vacío.
- Alta: modal/form — correo, nombre, teléfono, perfil (select), `casaId` (select desde `GET /SGR/Casas` USR-BE-010); `POST /SGR/Usuarios`.
- Tras alta exitosa: mostrar **una vez** `passwordTemporal` (copiar al portapapeles) — no volver a mostrar.
- Edición: `PUT /SGR/Usuarios/{id}` con `ActualizarPerfilRequest` (admin: perfil + casaId).
- Acciones: desactivar/activar (`PATCH`), eliminar (`DELETE`) con confirmación.
- Errores: `409` correo duplicado, `ProblemDetails` legible.
- Zod + react-hook-form en formularios.
- Tests Vitest componente tabla y formulario (mín. 2).

### Should
- Enlace desde sidebar “Residentes” (FE-SHELL-001).
- Paginación cliente si lista > 50 `(asumido)`.

### Won't
- CRUD casas (FE-042).
- Envío email bienvenida.
- Gestión menús/permisos.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `frontend` | `pages/AdminUsuariosPage.tsx`, `features/admin/usuarios/*`, hooks `usePadronUsuarios`, `useCrearUsuario` |

## Dependencias API (contrato congelado USR-BE-009)

- `GET /SGR/Usuarios?perfil=&bActivo=` → `UsuarioPadronItemDto[]`
- `POST /SGR/Usuarios` → `201` `{ usuarioId, passwordTemporal }`
- `PUT /SGR/Usuarios/{id}` → `PerfilDto`
- `PATCH /SGR/Usuarios/{id}/desactivar|activar`
- `DELETE /SGR/Usuarios/{id}` → `204`
- `GET /SGR/Casas` — USR-BE-010 (selector)

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | No loguear `passwordTemporal` | USR-BE-009 |
| INV-2 | Solo Admin en `/admin/usuarios` | JWT + AdminRoute |
| INV-3 | Validación Zod antes de API | 14_tech_react |

## Criterios de aceptación

- [ ] **CA-1**: Admin crea residente con casa → aparece en tabla y se muestra contraseña temporal una vez.
- [ ] **CA-2**: Desactivar → `bActivo` reflejado; login del usuario falla `401`.
- [ ] **CA-3**: Correo duplicado → mensaje de error sin crashear UI.
- [ ] **CA-4**: Residente que navega a `/admin/usuarios` → redirección o 403 de ruta.
- [ ] **CA-5**: `tsc` + `vite build` + `npm test` verdes.

## Pasada adversarial

| # | Riesgo | Mitigación |
|---|--------|------------|
| R1 | FE-041 antes de USR-BE-010 sin casas | Select casa vacío + mensaje “Configura casas primero”; o bloquear alta sin casas |
| R2 | Password temporal en estado React persistente | Limpiar al cerrar modal; no guardar en storage |
| R3 | PUT mezcla perfil propio y admin | Solo usar PUT desde pantalla admin con sesión Admin |

**Veredicto:** APROBADO para `/diseñar` (ejecutar FE-041 después de FE-SHELL; USR-BE-010 en paralelo recomendado).
