# dev-environment Specification

## Purpose
Garantiza que cualquier persona pueda clonar el repositorio y tener Concilia funcionando en local con base de datos, datos de prueba y servidores de desarrollo en pocos comandos documentados.

## Requirements

### Requirement: Arranque local documentado
El proyecto SHALL poder arrancarse en local siguiendo únicamente los pasos de instalación del readme §1.4, sin configuración manual adicional más allá de copiar el archivo de variables de entorno.

#### Scenario: Arranque desde cero
- **WHEN** una persona clona el repositorio, copia `.env.example` a `.env`, levanta la base de datos, instala dependencias, ejecuta migraciones y seed y arranca el modo desarrollo
- **THEN** la API responde en el puerto 3000, el frontend en el 5173 y la documentación OpenAPI está disponible en `/api/docs`

#### Scenario: Variable obligatoria ausente
- **WHEN** falta `DATABASE_URL` o `JWT_SECRET` al arrancar la API
- **THEN** la API falla al iniciar con un mensaje que nombra la variable ausente

### Requirement: Esquema de base de datos versionado
El sistema SHALL mantener el esquema de base de datos descrito en readme §3 mediante migraciones versionadas aplicables de forma idempotente.

#### Scenario: Migración inicial
- **WHEN** se ejecutan las migraciones sobre una base de datos vacía
- **THEN** existen las tablas de empresa, usuario, plantilla de importación, conciliación, archivo importado, transacción POS, movimiento bancario, cruce, detalle de cruce y auditoría con sus índices

#### Scenario: Montos con precisión decimal
- **WHEN** se inspecciona el tipo de cualquier columna de monto
- **THEN** es un tipo decimal con dos posiciones y nunca un tipo de coma flotante

#### Scenario: Detalle de cruce con exactamente un lado
- **WHEN** se intenta insertar un detalle de cruce sin transacción POS ni movimiento bancario, o con ambos a la vez
- **THEN** la base de datos rechaza la fila

### Requirement: Datos semilla para demostración
El sistema SHALL proveer un seed que cree una empresa demo y dos usuarios activos, uno con rol ADMIN y otro con rol ANALYST, con credenciales documentadas para desarrollo.

#### Scenario: Seed sobre base vacía
- **WHEN** se ejecuta el seed tras las migraciones
- **THEN** existe una empresa con identificación tributaria única y dos usuarios con contraseña almacenada como hash

#### Scenario: Seed repetido
- **WHEN** se ejecuta el seed por segunda vez
- **THEN** no se duplican la empresa ni los usuarios

### Requirement: Calidad de código uniforme
El repositorio SHALL incluir configuración compartida de lint y formato para backend y frontend, ejecutable con un único comando desde la raíz.

#### Scenario: Lint desde la raíz
- **WHEN** se ejecuta el comando de lint en la raíz del monorepo
- **THEN** se analizan ambos workspaces y el comando termina con error si hay violaciones
