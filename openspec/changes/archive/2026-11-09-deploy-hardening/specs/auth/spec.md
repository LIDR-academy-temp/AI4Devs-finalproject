## MODIFIED Requirements

### Requirement: Auditoría de intentos de login
Cada intento de login con cuerpo válido SHALL dejar una fila en `AuditLog`: `action = "auth.login.success"` o `"auth.login.failure"`, `entityType = "User"`, `userId` del usuario si existe (o `NULL` si no) y en `detailJson` el `userName` intentado, la `ip` del cliente y, en los fallos, el motivo (`bad_password`, `inactive`, `unknown_user`). La contraseña y el hash SHALL no aparecer nunca en `AuditLog` ni en los logs.

#### Scenario: Login correcto auditado
- **WHEN** `analyst` hace login con éxito
- **THEN** existe una fila `auth.login.success` con su `userId`

#### Scenario: Fallo auditado sin secretos
- **WHEN** alguien intenta login como `ghost` (inexistente) con la contraseña `S3cret!`
- **THEN** existe una fila `auth.login.failure` con `userId NULL` y `detailJson` con `userName = "ghost"` y `reason = "unknown_user"`
- **AND** ni `AuditLog.detailJson` ni la salida del logger contienen `S3cret!` ni ningún hash Argon2

## ADDED Requirements

### Requirement: IP del cliente en la auditoría
La `ip` de la auditoría del login SHALL ser la de la conexión, salvo cuando la conexión llega desde un proxy de confianza (`TRUST_PROXY`), en cuyo caso SHALL ser la que ese proxy envía en `X-Forwarded-For`: la dirección más a la derecha que no es de confianza. Un valor que no sea una dirección IP SHALL sustituirse por la IP de la conexión.

#### Scenario: Sin proxy de confianza
- **GIVEN** la API sin `TRUST_PROXY`, como en `pnpm dev`
- **WHEN** llega un login desde `172.18.0.5` con `X-Forwarded-For: 203.0.113.7`
- **THEN** la fila guarda `ip = "172.18.0.5"`

#### Scenario: Detrás del proxy de confianza
- **GIVEN** la API con `TRUST_PROXY = "uniquelocal"`
- **WHEN** llega un login desde `172.18.0.5` con `X-Forwarded-For: 203.0.113.7`
- **THEN** la fila guarda `ip = "203.0.113.7"`

#### Scenario: Cabecera de un cliente que no es proxy
- **GIVEN** la API con `TRUST_PROXY = "uniquelocal"`
- **WHEN** llega un login directamente desde la dirección pública `198.51.100.9` con `X-Forwarded-For: 203.0.113.7`
- **THEN** la fila guarda `ip = "198.51.100.9"`

#### Scenario: Valor que no es una IP
- **GIVEN** la API con `TRUST_PROXY = "uniquelocal"`
- **WHEN** llega un login desde `172.18.0.5` con `X-Forwarded-For: not-an-ip`
- **THEN** la fila guarda `ip = "172.18.0.5"`
