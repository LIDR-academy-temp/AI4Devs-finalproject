# Spec Delta — auth

## Purpose

Autenticación de los usuarios de Recon Tool con JWT de acceso y refresh, consulta de la propia identidad y autorización por permiso de cada ruta del API, con auditoría de los intentos de login. README §2.5, §3.2 "Acceso y auditoría", §4 (convenciones) y §4.4 (Auth).

## ADDED Requirements

### Requirement: Login con usuario y contraseña
`POST /api/v1/auth/login` SHALL aceptar `{ userName, password }` y, si el usuario existe, está activo (`isActive`) y la contraseña verifica contra su hash Argon2, responder `200` con `{ accessToken, refreshToken, expiresIn }`. El access token SHALL caducar a los 15 minutos y el refresh a los 7 días, ambos firmados con `JWT_SECRET`.

#### Scenario: Usuario activo con contraseña correcta
- **GIVEN** el usuario sembrado `analyst` activo con la contraseña `SEED_PASSWORD`
- **WHEN** llama a `POST /api/v1/auth/login` con esas credenciales
- **THEN** recibe `200` con `accessToken` y `refreshToken` no vacíos y `expiresIn = 900`
- **AND** `GET /api/v1/auth/me` con `Authorization: Bearer <accessToken>` devuelve `role = "analyst"` y los permisos `settlement.process`, `fee.view`, `reports.view`

#### Scenario: Cuerpo inválido
- **WHEN** llama a login sin `userName` o sin `password`
- **THEN** recibe `400` con el cuerpo de error uniforme y `code = "validation_error"`

### Requirement: Rechazo genérico de credenciales
Una contraseña incorrecta, un `userName` inexistente o un usuario inactivo SHALL responder `401` con exactamente el mismo cuerpo `{ code: "invalid_credentials", message: "Invalid user name or password" }`, sin revelar cuál de las condiciones falló. El tiempo de respuesta SHALL no distinguir un usuario inexistente de una contraseña errónea (se verifica igualmente contra un hash ficticio).

#### Scenario: Contraseña incorrecta
- **GIVEN** el usuario activo `viewer`
- **WHEN** llama a login con una contraseña distinta de la suya
- **THEN** recibe `401` con `code = "invalid_credentials"` y el mensaje genérico, y ningún token

#### Scenario: Usuario inactivo
- **GIVEN** un usuario con `isActive = false` y su contraseña correcta
- **WHEN** llama a login
- **THEN** recibe `401` con el mismo cuerpo, byte a byte, que en el caso de contraseña incorrecta

#### Scenario: Usuario inexistente
- **WHEN** llama a login con un `userName` que no existe
- **THEN** recibe `401` con el mismo cuerpo que en el caso de contraseña incorrecta

### Requirement: Auditoría de intentos de login
Cada intento de login con cuerpo válido SHALL dejar una fila en `AuditLog`: `action = "auth.login.success"` o `"auth.login.failure"`, `entityType = "User"`, `userId` del usuario si existe (o `NULL` si no) y en `detailJson` el `userName` intentado y, en los fallos, el motivo (`bad_password`, `inactive`, `unknown_user`). La contraseña y el hash SHALL no aparecer nunca en `AuditLog` ni en los logs.

#### Scenario: Login correcto auditado
- **WHEN** `analyst` hace login con éxito
- **THEN** existe una fila `auth.login.success` con su `userId`

#### Scenario: Fallo auditado sin secretos
- **WHEN** alguien intenta login como `ghost` (inexistente) con la contraseña `S3cret!`
- **THEN** existe una fila `auth.login.failure` con `userId NULL` y `detailJson` con `userName = "ghost"` y `reason = "unknown_user"`
- **AND** ni `AuditLog.detailJson` ni la salida del logger contienen `S3cret!` ni ningún hash Argon2

### Requirement: Renovación del par con refresh token
`POST /api/v1/auth/refresh` con `{ refreshToken }` válido, no caducado, no revocado y de un usuario aún activo SHALL responder `200` con un par nuevo y revocar el refresh usado (rotación). Un refresh caducado, revocado, mal firmado, desconocido o de un usuario inactivo SHALL responder `401` con `code = "invalid_token"`. Un access token SHALL no servir como refresh.

#### Scenario: Refresh válido
- **GIVEN** un `refreshToken` obtenido en login
- **WHEN** llama a `POST /api/v1/auth/refresh` con él
- **THEN** recibe `200` con un `accessToken` y un `refreshToken` nuevos, distintos de los anteriores

#### Scenario: Refresh ya rotado
- **GIVEN** un `refreshToken` que ya se usó una vez en `/auth/refresh`
- **WHEN** se vuelve a usar
- **THEN** recibe `401` con `code = "invalid_token"`

#### Scenario: Access token usado como refresh
- **WHEN** llama a `/auth/refresh` pasando un `accessToken`
- **THEN** recibe `401` con `code = "invalid_token"`

### Requirement: Cierre de sesión
`POST /api/v1/auth/logout` con `{ refreshToken }` SHALL revocar ese refresh y responder `204`. La operación SHALL ser idempotente: un refresh ya revocado, caducado o desconocido también responde `204`. Tras el logout ese refresh SHALL no servir en `/auth/refresh`.

#### Scenario: Refresh inservible tras logout
- **GIVEN** un `refreshToken` válido
- **WHEN** llama a `POST /api/v1/auth/logout` con él y después a `POST /api/v1/auth/refresh` con el mismo
- **THEN** logout responde `204` y refresh responde `401` con `code = "invalid_token"`

#### Scenario: Logout repetido
- **WHEN** llama a logout dos veces con el mismo refresh
- **THEN** ambas llamadas responden `204`

### Requirement: Identidad del usuario autenticado
`GET /api/v1/auth/me` con un access token válido SHALL responder `200` con `{ userId, userName, displayName, email, role, permissions, merchantScope, merchants }`, donde `permissions` son los `permissionCode` del rol y `merchants` es la lista `{ merchantId, name }` visible: todos los merchants si `merchantScope = "all"`, solo los de `UserMerchant` si es `"assigned"` (lista vacía si no tiene asignaciones, nunca acceso global).

#### Scenario: Alcance asignado
- **GIVEN** el usuario sembrado `viewer` con `merchantScope = "assigned"` y el merchant 1 asignado
- **WHEN** llama a `GET /api/v1/auth/me`
- **THEN** `merchantScope = "assigned"` y `merchants` contiene solo el merchant 1

#### Scenario: Alcance total
- **GIVEN** el usuario sembrado `admin` con `merchantScope = "all"`
- **WHEN** llama a `GET /api/v1/auth/me`
- **THEN** `merchants` contiene todos los merchants de la base y `permissions` los siete códigos

### Requirement: Autenticación de las rutas protegidas
Toda ruta del API salvo `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /health` y `/docs` SHALL exigir `Authorization: Bearer <accessToken>`. Sin cabecera, con un token mal firmado, caducado, que sea un refresh, o de un usuario que ya no existe o está inactivo, SHALL responder `401` con `code = "unauthorized"` sin ejecutar el handler. Rol, permisos y merchants SHALL resolverse desde la base en cada petición, no desde el contenido del token.

#### Scenario: Sin token
- **WHEN** llama a `GET /api/v1/auth/me` sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"`

#### Scenario: Token caducado
- **GIVEN** un access token emitido hace más de 15 minutos
- **WHEN** llama a una ruta protegida con él
- **THEN** recibe `401` con `code = "unauthorized"`

#### Scenario: Usuario desactivado después del login
- **GIVEN** un access token vigente de un usuario que después se marca `isActive = false`
- **WHEN** llama a una ruta protegida
- **THEN** recibe `401` con `code = "unauthorized"`

### Requirement: Autorización por permiso
Una ruta protegida con `requirePermission(<permissionCode>)` SHALL ejecutar su handler solo si el rol del usuario autenticado tiene ese permiso. Sin autenticación válida SHALL responder `401` (`unauthorized`); autenticado pero sin el permiso, `403` con `code = "forbidden"`. En ambos casos el handler SHALL no ejecutarse.

#### Scenario: Rol con el permiso
- **GIVEN** una ruta protegida con `requirePermission('settlement.process')`
- **WHEN** la llama `analyst` con su access token
- **THEN** el handler se ejecuta y la ruta responde con su resultado normal

#### Scenario: Rol sin el permiso
- **GIVEN** la misma ruta
- **WHEN** la llama `viewer` (sin `settlement.process`)
- **THEN** recibe `403` con `code = "forbidden"` y el handler no se ejecuta

#### Scenario: Sin token en ruta con permiso
- **GIVEN** la misma ruta
- **WHEN** se llama sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"` y el handler no se ejecuta

### Requirement: Secreto de firma obligatorio
El servidor SHALL negarse a arrancar si `JWT_SECRET` no está definido o tiene menos de 32 caracteres, con un mensaje que nombre la variable y sin imprimir su valor.

#### Scenario: Arranque sin secreto
- **GIVEN** un entorno sin `JWT_SECRET`
- **WHEN** se construye la aplicación
- **THEN** falla con un error que menciona `JWT_SECRET` y el servidor no escucha
