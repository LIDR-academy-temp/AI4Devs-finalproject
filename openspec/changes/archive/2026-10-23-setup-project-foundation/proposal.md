# Proposal

## Why

Concilia no tiene todavía ninguna línea de código: solo documentación (readme.md, docs/PRD.md). Antes de implementar la primera historia de usuario hace falta un monorepo arrancable en local, el esquema de base de datos con datos semilla y datasets sintéticos que permitan medir el motor de conciliación de forma objetiva desde el primer día (readme §2.6, PRD §11.1).

## What Changes

- Crear el monorepo con workspaces de npm: `apps/api` (NestJS + TypeScript + Prisma) y `apps/web` (React + Vite + TypeScript), con ESLint y Prettier compartidos.
- Añadir `docker-compose.yml` con PostgreSQL 16 para desarrollo y un `.env.example` con las variables documentadas en readme §2.4.
- Definir el esquema Prisma completo según readme §3 (Company, User, ImportTemplate, Reconciliation, ImportedFile, PosTransaction, BankMovement, Match, MatchItem, AuditLog), la migración inicial y un seed con una empresa demo y dos usuarios (ADMIN y ANALYST).
- Crear el generador de datasets sintéticos en `samples/` con los casos controlados del readme §2.6 y un archivo de resultado esperado para medir precisión y cobertura del motor.

## Capabilities

### New Capabilities
- `dev-environment`: arranque local reproducible del proyecto (base de datos, migraciones, seed, servidores de desarrollo) y variables de configuración.
- `synthetic-datasets`: generación de pares de archivos POS/banco sintéticos con casos de conciliación conocidos y su resultado esperado.

### Modified Capabilities
<!-- ninguna: no existen specs previas -->

## Impact

- **Tickets:** TK-01, TK-02, TK-03 (readme §6.1). **HU:** ninguna directamente; es prerrequisito de todas. **RF/RNF:** RNF-15 (motor como dominio puro), RNF-16 (configuración por variables de entorno), base para RF-20 (solo últimos 4 dígitos) y PRD §11.1 (métricas con dataset sintético).
- **Código:** estructura completa de readme §2.3; `apps/api/prisma/schema.prisma`, `migrations/`, `seed.ts`; `samples/`.
- **Dependencias nuevas:** NestJS 12, Prisma 7, React 18, Vite 8, Vitest, Docker Compose, decimal.js, SheetJS (para escribir los xlsx sintéticos).
