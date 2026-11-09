[← index](_index.md) | [design →](design.md)

# spec.md — USR-BE-007: Autenticación JWT + refresh token

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como usuario registrado (Administrador, Residente, Guardia o Trabajador), quiero iniciar sesión con mi correo y contraseña, para acceder al portal con un JWT que porte mi perfil correspondiente (HU-USR-01).

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | [readme.md](../../../README.md) §6 Ticket 7 (USR-BE-007), §5 HU-USR-01, §2.5 (seguridad, sesión web, fuerza bruta), §2.5.1 (ADR-001, ADR-003, ADR-008), §4 Endpoint 1 |
| Técnico | [specs/usuarios.md](../../specs/usuarios.md), `readme.md` §3.2 (diccionario lógico ↔ físico, ADR-008), `SQL/cuartaquinientos_schema.sql` (`sgr.RefreshTokens`, [DB-000](../tkt-db-000/_index.md)) + DB-001 (renombres, `sgr.vsUsuarios` con casa/condominio) + DB-002 (perfiles + administrador inicial) |
| Mockup | N/A (solo API; la UI es [FE-030](../tkt-fe-030/_index.md)) |

**Comportamiento actual:** no existe API (`GraphApi/` lo crea SETUP-000). El esquema ya modela `sgr.Usuarios`, `sgr.Perfiles`, `sgr.CasaOcupantes`, `sgr.Casas` y `sgr.RefreshTokens` (`TokenID`, `UsuarioID` FK, `Token NVARCHAR(500)`, `FechaExpira`, `Revocado`, auditoría, índice único filtrado `UX_sgr_RefreshTokens_Token WHERE bEliminado = 0 AND Revocado = 0`), verificado en el script; BD no desplegada (sin evidencia MCP).

**Comportamiento esperado:** `POST /SGR/AuthService/GenerateToken` valida credenciales contra `sgr.Usuarios` (BCrypt sobre `PasswordHash`), rechaza inexistentes, inactivos o eliminados con el **mismo** 401, emite un JWT de 60 min con claims `sub`, `correo`, `nombre`, `perfil`, `bAdministrador`, `condominioId`, `exp`, y un refresh token de 14 días guardado con hash en `sgr.RefreshTokens` y enviado en cookie `HttpOnly`. `RefreshToken` rota el token; `Logout` lo revoca.

**Requerimientos relacionados** ([_graph.md](../../_graph.md)): FE-030 y USR-BE-036 consumen este contrato; casi todos los tickets backend de Fase 1 dependen del JWT (`sub` = `UsuarioID`, ADR-003).

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `POST /SGR/AuthService/GenerateToken`: BCrypt sobre `PasswordHash`, hash ficticio si el usuario no existe, 401 genérico `INVALID_CREDENTIALS`, respuesta `{ token, expira, perfil, nombre, requiereCambioPassword }` + cookie de refresh.
- JWT HS256 (clave ≥ 32 bytes desde configuración) con claims `sub` (= `UsuarioID`), `correo`, `nombre`, `perfil` (`RoleClaimType`), `bAdministrador`, `condominioId`, `exp`; vida `Jwt:AccessTokenMinutes` (default 60).
- Refresh token (14 días) guardado con hash en `sgr.RefreshTokens`; cookie `HttpOnly; Secure; SameSite=Strict`.
- `POST /SGR/AuthService/RefreshToken` (lee la cookie, rota, devuelve nuevo access token) y `POST /SGR/AuthService/Logout` (revoca).
- Rate limiting 5 intentos/min por IP + correo → 429.
- 400 `ProblemDetails` si el correo tiene formato inválido o hay campos vacíos.
- Log Serilog por intento (resultado, `UsuarioID` si existe, IP), nunca contraseña ni token.
- Tests: login residente, login admin, contraseña incorrecta, usuario inactivo (mismo 401), token expirado rechazado, refresh rotado, 429.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- `condominioId` resuelto desde `sgr.vsUsuarios` (casa vigente en `sgr.CasaOcupantes`, DB-001) con respaldo en `sgr.Casas.PropietarioUsuarioID` `(asumido)`.
- CORS con `AllowCredentials` y origen explícito del Web para que la cookie viaje en desarrollo `(asumido)`.

### Could — solo si sale gratis durante la implementación; jamás bloquea
- ninguno

### Won't — fuera de alcance explícito
- Registro público / self-service de residentes (el alta es de Admin, HU-USR-04 / USR-BE-009).
- Recuperación de contraseña por correo y verificación de email.
- SSO / OAuth externos y MFA.
- Cambio de contraseña `CambiarPassword` (USR-BE-036).
- Importación masiva de usuarios.
- UI de login (FE-030).
- Gestión granular de roles más allá de los perfiles sembrados (`bAdministrador`).
- Duplicar auth en `WMS/AuthService`.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Sin DDL. Lectura de `sgr.Usuarios`, `sgr.Perfiles`, `sgr.vsUsuarios`, `sgr.Casas`; `INSERT`/`UPDATE Revocado` en `sgr.RefreshTokens` |
| `backend:cuartaquinientos-api` | Nuevo `SGR/AuthServiceController` (3 endpoints), `IAuthService`, `IJwtService`, repositorios Dapper `IUserRepository` / `IRefreshTokenRepository`, rate limiter `login`, opciones `Jwt:*` |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Las contraseñas se almacenan siempre como hash BCrypt; el texto plano nunca se persiste ni se registra en logs | `specs/usuarios.md` (INV-2) |
| INV-2 | Baja lógica con `bEliminado = 1`; desactivar (`bActivo = 0`) impide el login pero conserva íntegro el historial | `specs/usuarios.md` (INV-3) |
| INV-3 | Un usuario con `bActualizarPassword = 1` debe cambiar la contraseña tras el login | `specs/usuarios.md` (INV-4) |
| INV-4 | El JWT porta el claim `perfil`; toda ruta valida el perfil antes de ejecutar la acción | `specs/usuarios.md` (INV-5) |
| INV-5 | Todo usuario referencia un `PerfilID` existente | `specs/usuarios.md` (INV-7) |
| INV-6 | `sub` del JWT = `UsuarioID` (no correo, no `ResidenteID`) | `readme.md` §2.5.1 ADR-003, §4 Endpoint 1 |
| INV-7 | Sin stored procedures de negocio: servicios C# + Dapper parametrizado | `specs/base-datos.md` (INV-4), ADR-001 |

## Propiedades (PBT-x) — invariantes a nivel dato (OPCIONAL)

- PBT-1: Para todo intento de login rechazado por credenciales (usuario inexistente, contraseña incorrecta, `bActivo = 0` o `bEliminado = 1`), el cuerpo de la respuesta 401 es byte a byte idéntico.
- PBT-2: Para toda fila de `sgr.RefreshTokens` insertada por `AuthService`, `Token` ≠ valor opaco enviado en la cookie `rt`.
- PBT-3: Para toda entrada de log emitida por `AuthService`, el texto no contiene la contraseña recibida ni el valor del access/refresh token.

## Criterios de aceptación

- [ ] **CA-1 [M]**: login residente — **Dado** un usuario de perfil Residente con `bActivo = 1`, `bEliminado = 0` y `PasswordHash` BCrypt válido **Cuando** llama `POST /SGR/AuthService/GenerateToken` con `{ correo, password }` correctos **Entonces** recibe `200` con `{ token, expira, perfil: "Residente", nombre, requiereCambioPassword }` y un `Set-Cookie: rt=…; HttpOnly; Secure; SameSite=Strict` con expiración a 14 días.
- [ ] **CA-2 [M]**: login administrador — **Dado** un usuario de perfil Administrador (`sgr.Perfiles.bAdministrador = 1`) **Cuando** llama `POST /SGR/AuthService/GenerateToken` con credenciales correctas **Entonces** recibe `200` y el JWT decodificado trae `perfil = "Administrador"` y `bAdministrador = true`.
- [ ] **CA-3 [M]**: claims y firma — **Dado** un login exitoso **Cuando** `JwtService` emite el token **Entonces** es HS256 firmado con una clave ≥ 32 bytes leída de `Jwt:*` (user-secrets / variables de entorno), trae `sub` = `UsuarioID`, `correo`, `nombre`, `perfil`, `bAdministrador`, `condominioId`, `exp` = emisión + `Jwt:AccessTokenMinutes` (default 60), y `perfil` está configurado como `RoleClaimType`.
- [ ] **CA-4 [M]**: hash ficticio — **Dado** un correo que no existe en `sgr.Usuarios` (con `bEliminado = 0`) **Cuando** llama `POST /SGR/AuthService/GenerateToken` **Entonces** `AuthService.AutenticarAsync` invoca `BCrypt.Verify` exactamente una vez contra el hash ficticio constante y responde el mismo `401` de CA-5.
- [ ] **CA-5 [M]**: 401 genérico — **Dado** cualquiera de: contraseña incorrecta, `bActivo = 0`, `bEliminado = 1` o correo inexistente **Cuando** llama `POST /SGR/AuthService/GenerateToken` **Entonces** recibe `401` `ProblemDetails` `{ title: "Credenciales inválidas", status: 401, code: "INVALID_CREDENTIALS" }` idéntico en los cuatro casos y sin `Set-Cookie`.
- [ ] **CA-6 [M]**: cambio de contraseña obligatorio — **Dado** un usuario con `bActualizarPassword = 1` **Cuando** hace login correcto en `POST /SGR/AuthService/GenerateToken` **Entonces** la respuesta trae `requiereCambioPassword = true` (y `false` cuando `bActualizarPassword = 0`).
- [ ] **CA-7 [M]**: refresh token con hash — **Dado** un login exitoso **Cuando** `RefreshTokenRepository` persiste el token **Entonces** `sgr.RefreshTokens` gana una fila con `UsuarioID` del usuario, `Token` = hash del valor de la cookie (nunca el valor en claro), `FechaExpira` = ahora (UTC) + 14 días y `Revocado = 0`.
- [ ] **CA-8 [M]**: rotación — **Dado** una cookie `rt` válida (no revocada, no vencida) **Cuando** llama `POST /SGR/AuthService/RefreshToken` **Entonces** recibe `200` con nuevo access token y nueva cookie `rt`; en la misma transacción la fila anterior queda `Revocado = 1` y se inserta una fila nueva.
- [ ] **CA-9 [M]**: refresh inválido — **Dado** una cookie `rt` revocada o vencida (o ausente `(asumido)`) **Cuando** llama `POST /SGR/AuthService/RefreshToken` **Entonces** recibe `401` y no se inserta ninguna fila en `sgr.RefreshTokens`.
- [ ] **CA-10 [M]**: logout — **Dado** una cookie `rt` válida **Cuando** llama `POST /SGR/AuthService/Logout` **Entonces** la fila correspondiente queda `Revocado = 1`, la respuesta borra la cookie `rt` y un `RefreshToken` posterior con ese valor devuelve `401`.
- [ ] **CA-11 [M]**: rate limiting — **Dado** 5 intentos de login desde la misma IP con el mismo correo dentro de 1 minuto **Cuando** llega el 6.º intento a `POST /SGR/AuthService/GenerateToken` **Entonces** la política `login` del rate limiter responde `429`.
- [ ] **CA-12 [M]**: validación de entrada — **Dado** un body con correo de formato inválido o `correo`/`password` vacíos **Cuando** llama `POST /SGR/AuthService/GenerateToken` **Entonces** recibe `400` `ProblemDetails` con `code = "VALIDATION_ERROR"` y `AuthService` no consulta la BD.
- [ ] **CA-13 [M]**: log seguro — **Dado** cualquier intento de login (exitoso o fallido) **Cuando** `AuthService` registra el evento con Serilog **Entonces** la entrada incluye resultado, `UsuarioID` (si existe) e IP, y no contiene la contraseña, el `PasswordHash` ni ningún token.
- [ ] **CA-14 [M]**: token expirado — **Dado** un JWT con `exp` en el pasado **Cuando** se llama a un endpoint con `[Authorize]` **Entonces** el middleware JWT responde `401`.
- [ ] **CA-R1 [M]**: regresión de INV-2 — **Dado** un usuario con `bActivo = 0` que tiene tickets y cuotas registradas **Cuando** intenta `POST /SGR/AuthService/GenerateToken` **Entonces** recibe el `401` de CA-5 y su fila en `sgr.Usuarios` y su historial (tickets, cuotas) quedan sin cambios (`FechaModificacion` intacta).
- [ ] **CA-R2 [M]**: regresión de INV-1 — **Dado** un login exitoso o fallido **Cuando** termina `POST /SGR/AuthService/GenerateToken` **Entonces** `sgr.Usuarios.PasswordHash` conserva el mismo valor y ningún sink de Serilog contiene la contraseña en claro.
- [ ] **CA-R3 [S]**: regresión de INV-7 — **Dado** el código de `GraphApi/` tras el PR **Cuando** `auditor-codigo` revisa los repositorios **Entonces** no existe `CommandType.StoredProcedure` y toda consulta Dapper usa parámetros (`@Correo`, `@Token`).

## Reutilización detectada (evidencia de la escalera — regla 6)

- Contrato `readme.md` §4 Endpoint 1 (`GenerateToken`, `RefreshToken`, `Logout`) y claims §2.5 → se implementa tal cual, sin inventar rutas.
- `sgr.Usuarios` (`Correo`, `PasswordHash`, `Nombre`, `bActivo`, `bEliminado`, `bActualizarPassword`, nombres lógicos §3.2 tras DB-001) + `sgr.Perfiles` (`Nombre`, `bAdministrador`) → lectura directa (el hash no se expone en `sgr.vsUsuarios`, `readme.md` §6 Ticket 34).
- `sgr.vsUsuarios` (ampliada por DB-001 con `CasaID`, `CondominioID` vía `sgr.CasaOcupantes` vigente) → fuente de `condominioId`.
- `sgr.RefreshTokens` (ya en el script, con índice único filtrado por `Token`) → sin tabla nueva.
- Rate limiter nativo de ASP.NET Core (`AddRateLimiter`, política `login` registrada por SETUP-000) y `JwtBearer` nativo → sin librerías nuevas.
- **No** se crea tabla Usuario nueva, ni entidad Residente, ni SP (ADR-001).

## Definition of Ready

- [x] **I**ndependent — dependencias (SETUP-000, DB-001, DB-002) documentadas y aceptadas en readme §6
- [x] **N**egotiable — Should recortables vía escalación
- [x] **V**aluable — cada Must habilita el login real del núcleo §5.0
- [x] **E**stimable — 5 h (`readme.md` §6 Ticket 7)
- [x] **S**mall — cada Must cabe en una sesión
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (objetos declarados en script + DB-001/DB-002; MCP pendiente Entrega 2)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`database:CuartaQuinientos`, `backend:cuartaquinientos-api`)
- [x] Sin preguntas abiertas que afecten un Must (P-1..P-4 afectan Should o detalles no contractuales)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Lookup por correo sin filtrar `bEliminado`/`bActivo` → fuga de cuenta eliminada | Alta | Filtro `bEliminado = 0` en la consulta + chequeo `bActivo` con mismo 401 (CA-5) |
| Respuesta más rápida para correo inexistente → enumeración de usuarios | Alta | Hash ficticio (CA-4) |
| `sub` como correo rompe la autorización por `UsuarioID` | Alta | Prohibido (INV-6, CA-3) |
| Contraseña, hash o token en logs/excepciones | Alta | CA-13, CA-R2 |
| Refresh token en claro en BD → robo de sesión si hay fuga | Alta | Hash en `sgr.RefreshTokens` (CA-7) |
| Admin inicial sin hash BCrypt válido | Media | DB-002 lo siembra con `$(AdminPasswordHash)` (sin datos personales) |
| Código escrito con nombres físicos previos a DB-001 | Media | Bloqueado por DB-001; solo nombres lógicos §3.2 |
| Cookie no enviada en dev cross-origin | Media | CORS con `AllowCredentials` y origen explícito `(asumido)` |

## Preguntas abiertas

- P-1: `condominioId` cuando el usuario no tiene `sgr.CasaOcupantes` vigente: ¿respaldo en `sgr.Casas.PropietarioUsuarioID`, y `null` para Admin sin casa? → **pendiente** `(asumido)`.
- P-2: Algoritmo de hash del refresh token: SHA-256 (como `bot.TokensVinculacion`, `readme.md` §2.5) → **pendiente** `(asumido)`.
- P-3: Cuerpo de `RefreshToken` = mismo shape que `GenerateToken` y `Logout` → `204` sin cuerpo; cookie ausente → `401` → **pendiente** `(asumido)` (readme solo dice "devuelve un nuevo access token" / "revoca").
- P-4: CORS `AllowCredentials` con origen explícito del Web en desarrollo → **pendiente** `(asumido)`.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (`POST /SGR/AuthService/*`, `AuthService`, `JwtService`, `RefreshTokenRepository`, rate limiter `login`, middleware JWT)
- [x] Todo CA tiene criterio medible en Given/When/Then
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado
- [x] Instancias en scope identificadas para cada Must
- [x] Definition of Ready completa — ítems `(asumido)` listados en Preguntas abiertas
- [x] Tipo ≠ Refactor → CHAR-x no aplica
- [x] Toda propiedad PBT-x es universal sobre el dominio de entrada
