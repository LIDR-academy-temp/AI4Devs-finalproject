# specs/usuarios.md — Usuarios / Identidad (source of truth SDD)
> Contexto de dominio para SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo del proyecto se marca (delta).
#usuarios #identidad #sgr #auth #jwt #perfiles #casas #condominios

## Propósito
Dominio de seguridad, identidad y configuración base del sistema (esquema `sgr`). Gestiona autenticación (JWT + BCrypt), el padrón de usuarios/residentes, sus perfiles (roles data-driven), la estructura física del fraccionamiento (Condominios → Casas) y los menús dinámicos por perfil. El residente NO es una tabla propia: es un `sgr.Usuarios` con un `Perfil`; su vivienda se resuelve por `sgr.Casas.PropietarioUsuarioID` y, para arrendatarios/ocupantes, por `sgr.CasaOcupantes` (delta).

## Objetos del dominio (tablas + vistas reales)
- `sgr.Usuarios` (vista `sgr.vsUsuarios`) — UsuarioID(PK), Correo(UK), PerfilID(FK), PasswordHash(BCrypt), Nombre, Telefono, Preferencias(NVARCHAR MAX, JSON), bActivo, bActualizarPassword. (Físico actual `CorreoUsuario`/`PasswordUsuario`/`NombreUsuario`/`TelefonoUsuario`/`bActivoUsuario` → readme `Correo`/`PasswordHash`/`Nombre`/`Telefono`/`bActivo`, renombra DB-001; `FotoUrlUsuario` existe en el físico pero no está en el diccionario §3.2.)
- `sgr.Perfiles` (vista `sgr.vsPerfiles`) — PerfilID(PK), Nombre, Descripcion, bAdministrador. Roles data-driven.
- `sgr.Casas` (vista `sgr.vsCasas`) — CasaID(PK), CondominioID(FK), Direccion, Numero, PropietarioUsuarioID(FK). (Físico actual `DireccionCasa`/`NumeroExtCasa` → readme `Direccion`/`Numero`, DB-001.)
- `sgr.Condominios` — CondominioID(PK), Nombre, Direccion.
- `sgr.Menus`, `sgr.MenusBotones`, `sgr.PerfilMenus`, `sgr.PerfilMenuBotones` — menús dinámicos por perfil. Vistas: `sgr.vsMenusBotones`, `sgr.vsPerfilMenus`, `sgr.vsPerfilMenuBotones`.
- `sgr.RecuperacionPassword` — flujo de recuperación de contraseña.
- Auditoría en todas las tablas: Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID, FechaCreacion, FechaModificacion, `bEliminado` (soft delete).

## Catálogos y estados
- Perfiles sembrados por DB-002 (readme §1, §6 Ticket 35): **Administrador**, **Residente**, **Guardia**, **Trabajador**. Solo Administrador con `bAdministrador = 1`; Trabajador = personal de mantenimiento que atiende tickets.
- Estados de cuenta de usuario: `bActivo` (habilitado / desactivado), `bActualizarPassword` (debe cambiar contraseña en el próximo login).
- `TipoResidencia` en CasaOcupantes: **Propietario | Arrendatario** (delta).

## Invariantes (INV-x)
- **INV-1** El `Correo` es único entre usuarios no eliminados (`bEliminado = 0`); registrar uno repetido devuelve "El correo ya está en uso".
- **INV-2** Las contraseñas se almacenan siempre como hash BCrypt; el texto plano nunca se persiste ni se registra en logs. La contraseña nunca transita por el chat del bot.
- **INV-3** Ninguna tabla se borra físicamente en operación normal: baja lógica con `bEliminado = 1`. Desactivar un usuario (`bActivo = 0`) impide el login pero conserva íntegro su historial.
- **INV-4** Un usuario nuevo creado por Admin queda con `bActualizarPassword = 1`; tras un cambio válido pasa a `0`.
- **INV-5** El JWT porta el claim `perfil`; toda ruta valida el perfil antes de ejecutar la acción (autorización data-driven).
- **INV-6** La contraseña nueva debe tener mínimo 8 caracteres (validación previa al envío).
- **INV-7** Todo usuario referencia un `PerfilID` existente; no hay usuarios sin perfil.

## Historias del dominio
- **HU-USR-01 [M]** Login de usuario — correo + contraseña → JWT con claim `perfil`; error genérico "Credenciales inválidas" sin revelar el campo; con `bActualizarPassword = 1` obliga a cambiar contraseña; 5 intentos/min → 429; redirección a login si el refresh token venció o fue revocado.
- **HU-USR-02 [M]** Ver y editar perfil — ver nombre, unidad (casa), teléfono, correo; actualización inmediata; bloquea correo duplicado.
- **HU-USR-03 [M]** Cambio de contraseña (habilitador: todo usuario nuevo inicia con contraseña temporal) — verifica contraseña actual + nueva ≥ 8 chars y distinta de la actual; deja `bActualizarPassword = 0` y revoca los demás refresh tokens.
- **HU-USR-04 [M]** Gestión de usuarios/residentes (Admin) — alta (con perfil y casa, `bActualizarPassword = 1`), edición y desactivación (`bActivo = 0`) conservando historial.

## Endpoints (/SGR/{Controller})
- `POST /SGR/AuthService/GenerateToken` — login (readme §4 Endpoint 1). Body `{ correo, password }`; `200` → `{ token, perfil, nombre, expira, requiereCambioPassword }` + `Set-Cookie` refresh token (`HttpOnly; Secure; SameSite=Strict; 14 días`); `400` datos inválidos; `401` `INVALID_CREDENTIALS` (mismo mensaje para inexistente, contraseña incorrecta o inactiva); `429` (5/min por IP + correo).
- `POST /SGR/AuthService/RefreshToken` (lee la cookie, rota el refresh token, devuelve nuevo access token) · `POST /SGR/AuthService/Logout` (revoca) · `POST /SGR/AuthService/CambiarPassword` (JWT, USR-BE-036).
- `GET/PUT /SGR/Usuarios/{id}` (perfil propio; Admin cualquiera — USR-BE-008); `POST /SGR/Usuarios` (Admin, responde `{ usuarioId, passwordTemporal }`), `PATCH /SGR/Usuarios/{id}/desactivar|activar`, `DELETE /SGR/Usuarios/{id}` (`bEliminado = 1`) — USR-BE-009.
- `/SGR/Perfiles`, `/SGR/Casas`, `/SGR/Condominios` — controladores del inventario §4 (verbos por ticket).
- `/SGR/Menus`, `/SGR/MenusBotones`, `/SGR/PerfilMenus`, `/SGR/PerfilMenuBotones` — configuración legacy (headers `UserID`/`WindowName`).
- **[[SGR-BE-030]] (JWT, SPA):** `GET /SGR/Navegacion/menus` (árbol por claim `perfil`); `GET/POST/PUT/DELETE /SGR/Menus/admin` (solo `perfil=Administrador`); `GET/PUT /SGR/Perfiles/{id}/permisos-menus`. Errores REST: `ProblemDetails` + `code` (ej. `MENU_NO_ENCONTRADO`, `MENU_PADRE_INVALIDO`). Contrato front: [TKT-SGR-BE-030-APIS.md](.planning/tkt-sgr-be-030/TKT-SGR-BE-030-APIS.md).
- `/SGR/RecuperacionPassword` — recuperación de contraseña.
- Claims JWT (readme §2, HMAC-SHA256, 60 min): `sub` (= `UsuarioID`), `correo`, `nombre`, `perfil` (`RoleClaimType`), `bAdministrador`, `condominioId`, `exp`.

## Reutilización / objetos existentes (escalera)
- Reusar `AuthService/GenerateToken` (JWT + BCrypt) — no crear un flujo de auth nuevo.
- Reusar `sgr.vsUsuarios`, `sgr.vsPerfiles`, `sgr.vsCasas` para lecturas — no reconsultar tablas crudas cuando la vista ya resuelve joins.
- El residente ya existe como `Usuarios` + `Perfil`; NO crear entidad Residente.
- La vivienda ya existe en `sgr.Casas` (propietario) — extender con `CasaOcupantes`, no duplicar.
- Menús dinámicos por perfil ya modelados (Menus/PerfilMenus…) — reutilizar para autorización de UI.

## Deltas del proyecto (nuevo)
- **(delta)** `sgr.CasaOcupantes (CasaOcupanteID, CasaID FK, UsuarioID FK, TipoResidencia [Propietario|Arrendatario], FechaInicio, FechaFin, Vigente)` — varios ocupantes por unidad; `sgr.Casas.PropietarioUsuarioID` sigue marcando al dueño.
- **(delta)** `sgr.RefreshTokens (TokenID, UsuarioID FK, Token, FechaExpira, Revocado)` — refresh token (14 días) guardado con hash; renovar el JWT sin re-login.
- **(delta)** Perfiles sembrados por DB-002: Administrador/Residente/Guardia/Trabajador.
- **(delta)** `sgr.Usuarios.Preferencias` (JSON) puede alojar el `TelegramChatID` (aunque la vinculación canónica del bot vive en `bot.CuentasTelegram`, ver dominio Bot/Telegram).

## Frontend admin (SPA) — vigente

- Ruta `/admin/usuarios` ([[FE-CRUD-001]]): `AdminListToolbar` + `AdminFilterableTable` + panel lateral (`AdminSidePanel`) con RHF/Zod (`usuariosAdminSchemas`); baja con `ConfirmDialog`; APIs `POST/PUT/PATCH/DELETE /SGR/Usuarios*`.

## Notas
- Sin stored procedures: acceso con Dapper + vistas `vs*` + servicios C#; validación con FluentValidation; transacciones vía `IDbTransaction`.
- Nombres reales del esquema español (`sgr`); soft delete con `bEliminado` (NO `IsActive`).
- Frontend React 18 consume el backend con el access token JWT (`Authorization: Bearer`); el refresh token viaja solo en cookie `HttpOnly`.

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-23 | [[FE-CRUD-001]] | Admin usuarios migrado a patrón CRUD admin (panel lateral, sin prompt/confirm) |
| 2026-10-27 | [[SGR-BE-030]] | API JWT navegación + admin menús/permisos-perfil (`NavegacionController`, `Menus/admin`, `Perfiles/permisos-menus`) |
