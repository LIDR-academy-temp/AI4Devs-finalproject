# Design

## Context

Repositorio vacío de código; toda la especificación técnica está en readme §2 (arquitectura), §2.3 (estructura de ficheros) y §3 (modelo de datos). Un solo desarrollador con asistencia de IA, plazo E2 inminente. Las decisiones de este change condicionan todos los siguientes, por lo que se prioriza convención sobre configuración.

## Goals / Non-Goals

**Goals:**
- Monorepo arrancable con los comandos del readme §1.4 sin pasos ocultos.
- Esquema Prisma fiel al diagrama del readme §3.1 desde la primera migración, para no encadenar migraciones correctivas en E2.
- Datasets sintéticos con resultado esperado que sirvan de oráculo para los tests del motor (TK-12, TK-13, TK-25).

**Non-Goals:**
- CI/CD y despliegue (change `quality-ci-and-deployment`).
- Cualquier endpoint de negocio o pantalla.
- Datos reales anonimizados (dependencia externa, PRD §12.2).

## Decisions

1. **npm workspaces en lugar de pnpm/turborepo.** Menos herramientas que aprender y el readme ya lo fija. Alternativa descartada: pnpm + Turborepo, más rápido en CI pero añade configuración que no compensa con dos paquetes.
2. **Esquema Prisma completo en la migración inicial** (las diez entidades de readme §3), aunque E2 solo use parte. Alternativa descartada: migrar por change; produciría migraciones correctivas sobre tablas con datos de prueba y rompería el seed.
3. **Restricción CHECK en `match_items`** (exactamente uno de `posTransactionId` / `bankMovementId` no nulo) escrita a mano en el SQL de la migración, ya que Prisma no la modela. Alternativa descartada: validar solo en servicio; la integridad debe vivir en la BD.
4. **Columnas de monto como `Decimal @db.Decimal(14,2)`** y `decimal.js` en código. Alternativa descartada: enteros en centavos; complican las importaciones con separadores locales y los exports a Excel.
5. **Seed idempotente con `upsert`** por `taxId` y `email`. Alternativa descartada: truncar y recrear; borraría conciliaciones de prueba del desarrollador.
6. **Generador de datasets como script TypeScript en `samples/` con semilla fija** y salida CSV + XLSX más `expected.json`. Alternativa descartada: archivos estáticos escritos a mano; no escalan a 1.000+ filas ni permiten variar proporciones.
7. **Variables de entorno validadas al arranque** con un esquema (p. ej. Zod o Joi vía ConfigModule). Alternativa descartada: leer `process.env` directo; los errores aparecerían tarde y en lugares confusos.

8. **NestJS 12 en ESM, Prisma 7 con driver adapter y Vitest** en lugar de NestJS 10 / Prisma 6 / Jest que fijaba el readme. La versión 10 arrastraba 14 vulnerabilidades altas (body-parser, multer, lodash vía Swagger 7) que solo se corrigen en la 12; Nest 12 se distribuye como ESM y su scaffold oficial usa TypeScript 6 y Vitest, por lo que se adopta ese layout completo (imports relativos con `.js`, `moduleResolution: nodenext`, cliente Prisma generado en `src/generated/prisma` y excluido de git). Alternativa descartada: mantener CommonJS y Jest sobre paquetes ESM; funciona vía `require(esm)` pero exige Node 24.9+ en Jest y añade fricción sin beneficio. Vite se unifica en la versión 8 en todo el monorepo para evitar conflictos de tipos entre plugins.

## Risks / Trade-offs

- [Esquema completo desde el inicio puede cambiar al implementar E3] → las entidades de E3 (plantillas, auditoría) son pequeñas y están bien definidas; si cambian, una migración aditiva basta.
- [Datasets sintéticos no reflejan cómo acredita el banco real] → documentar las proporciones como supuestos y reportar métricas por escenario (PRD riesgo 2); sustituir por datos reales anonimizados en cuanto existan.
- [Docker no disponible en algún entorno] → `DATABASE_URL` apunta a cualquier PostgreSQL 16; Docker Compose es conveniencia, no requisito.

- [`xlsx` 0.18.5 en npm tiene vulnerabilidades sin parche publicado] → afecta solo al generador de datasets en desarrollo; antes del módulo de importación (TK-09) evaluar `exceljs` o la distribución oficial de SheetJS desde su CDN.

## Open Questions

- Nombre y proporciones exactas del dataset estándar (propuesta inicial: 60 % exacto, 15 % desfase, 15 % lote, 5 % neto, 3 % duplicados, 2 % huérfanos).
