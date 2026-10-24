# Proposal

## Why

Concilia es multiempresa y maneja extractos bancarios: ningún dato puede ser visible fuera de la empresa a la que pertenece. Antes de construir cualquier pantalla de negocio hace falta autenticación y el mecanismo de aislamiento por empresa que todas las demás capacidades darán por hecho (readme §2.5, PRD RF-01..RF-03, RNF-04, RNF-05, RNF-07).

## What Changes

- Inicio de sesión con correo y contraseña que devuelve un JWT de corta duración; endpoint para consultar el usuario autenticado.
- Guard global que exige token válido en toda la API salvo el login, y guard de roles (`ADMIN`, `ANALYST`).
- El identificador de empresa se toma siempre del token y se aplica como filtro en todo acceso a datos; nunca se acepta desde el cliente.
- Protección básica del login: mensaje genérico ante credenciales incorrectas, límite de intentos por IP, cabeceras HTTP endurecidas y CORS restringido.
- Pantalla de login en el frontend, almacenamiento de sesión, redirección al listado de conciliaciones y cierre de sesión.

## Capabilities

### New Capabilities
- `auth`: autenticación de usuarios, emisión y verificación de tokens, autorización por rol y aislamiento de datos por empresa.

### Modified Capabilities
<!-- ninguna -->

## Impact

- **HU:** HU-01. **Tickets:** TK-04, TK-05. **RF:** RF-01, RF-02, RF-03. **RNF:** RNF-04, RNF-05, RNF-07.
- **Endpoints:** `POST /auth/login`, `GET /auth/me` (readme §4.1).
- **Código:** `apps/api/src/auth/`, `apps/api/src/users/`, `apps/api/src/common/` (guards, decoradores), `apps/web/src/pages/Login`, `apps/web/src/api/` (cliente HTTP con token).
- **Dependencias nuevas:** `@nestjs/passport`, `passport-jwt`, `bcrypt`, `@nestjs/throttler`, `helmet`.
- Depende de `setup-project-foundation` (tabla de usuarios y seed).
