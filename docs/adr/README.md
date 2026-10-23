# Registro de decisiones de arquitectura (ADR)

Formato [MADR](https://adr.github.io/madr/). Un ADR no se borra ni se reescribe: si una decisión cambia, se escribe uno nuevo que sustituye al anterior y este pasa a estado *Sustituido por ADR-NNN*.

- **ADR-001 … ADR-006** son las decisiones previstas en la Entrega 1 (README §2.1). En la Entrega 2 pasan de *Propuesto* a *Aceptado*, y cada uno anota en qué se desvió la implementación del plan.
- **ADR-007 … ADR-011** son los cambios de rumbo de la Entrega 2: decisiones que no estaban en el plan o lo contradicen, tomadas en el gate de un change de OpenSpec o en su revisión.

| ADR | Decisión | Estado |
|---|---|---|
| [001](001-aplicacion-web-propia.md) | Aplicación web propia en lugar de seguir extendiendo SSRS | Aceptado |
| [002](002-sql-server-2022.md) | SQL Server 2022 desde el MVP, con Prisma 7 y su adaptador `mssql` | Aceptado |
| [003](003-ciclos-e-i-r-y-settled.md) | Tres ciclos E/I/R como eje del modelo; Settled solo con el intento pagado | Aceptado |
| [004](004-tabla-de-transacciones-propia.md) | Tabla de transacciones propia, desacoplada del gateway | Aceptado |
| [005](005-monolito-modular-hexagonal.md) | Monolito modular hexagonal con Fastify y Prisma | Aceptado |
| [006](006-batches-como-intentos.md) | Batches como intentos conservados (`attemptNo`) | Aceptado |
| [007](007-migraciones-escritas-a-mano.md) | Migraciones escritas a mano; prohibidos `migrate dev` y `db push` | Aceptado |
| [008](008-lector-xlsx-propio.md) | Lector `.xlsx` propio que lee todo como texto | Aceptado |
| [009](009-un-movimiento-por-fila-de-origen.md) | Un movimiento por fila de origen y fecha de evento desconocida | Aceptado |
| [010](010-resultado-de-las-validaciones.md) | Resultado de una validación: `passed`, `warning`, `blocked`, `not_applicable`, `not_implemented` | Aceptado |
| [011](011-codigos-de-error-en-minusculas.md) | Códigos de error del API en snake_case minúsculas | Aceptado |
