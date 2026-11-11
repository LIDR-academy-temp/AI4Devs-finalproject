# ADR-002 · SQL Server 2022 desde el MVP, con Prisma 7 y su adaptador `mssql`

- **Estado:** Aceptado (propuesto en la Entrega 1; confirmado en la Entrega 2)
- **Decisores:** autor del proyecto

## Contexto

El sistema actual vive en SQL Server, y el destino de producción es esa misma infraestructura. La primera propuesta fue PostgreSQL en el MVP y portar después.

## Opciones consideradas

1. PostgreSQL en el MVP y migrar a SQL Server para producción.
2. SQL Server 2022 desde el MVP, en el contenedor oficial para desarrollo y CI.

## Decisión

Opción 2. El paso a producción es un despliegue, no una migración de motor. Se usa la imagen oficial `mcr.microsoft.com/mssql/server:2022-latest` (`infra/docker-compose.yml`), y la aplicación entra siempre como `recon_app` con permisos mínimos, nunca como `sa`.

## Consecuencias

- Se reutilizan los tipos y la lógica del sistema actual: importes `DECIMAL(19,4)`, porcentajes `DECIMAL(9,6)`, nunca `MONEY` ni `FLOAT`.
- La imagen es solo x86-64: en Apple Silicon hace falta la emulación de Docker Desktop (README §1.4).
- Hay restricciones que Prisma no expresa (índices únicos filtrados, `CHECK`, trigger), y eso llevó a ADR-007.

## En la Entrega 2

- **Prisma 7 con `@prisma/adapter-mssql`** y el generador `prisma-client` (`backend/prisma/schema.prisma`, `backend/package.json`). El adaptador recibe un objeto de configuración armado con las variables `DB_*`; `DATABASE_URL` solo la usa la CLI de Prisma en la CI (`backend/prisma.config.ts`).
- **Fricción con el motor.** SQL Server rechaza `ALTER COLUMN` sobre una columna con índice o FK (error 5074): `0003_auth` borra y recrea el índice y la FK de `AuditLog.userId`. El adaptador no expone la carga masiva de `mssql`, así que el análisis de imports busca por `OPENJSON … WITH` (PR #36).
