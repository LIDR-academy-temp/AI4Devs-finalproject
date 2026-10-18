# Informe de Pruebas: Entrega 2

**Fecha:** 2026-10-18  
**Commit:** `20a1b26` (feat: add login button to unauthenticated layout with pathname redirect)  
**Rama:** `feature/entrega-2-LFMC`

## Entorno

- **Orquestación:** Docker Compose (backend, frontend, db, nginx)
- **Backend:** Python 3.12 + FastAPI
- **Frontend:** Node.js 22 + Next.js + TypeScript
- **Base de datos:** PostgreSQL (base de desarrollo con volumen persistente)
- **Ejecutores de pruebas:** pytest (backend), Vitest + Testing Library (frontend)

## Resultados Backend

### Suites de pruebas

El backend ejecuta tres tipos de pruebas:

- **Tests de dominio:** Pruebas del modelo económico y las reglas de negocio, sin dependencia de BD.
- **Tests de API:** Pruebas de endpoints FastAPI con httpx contra una base PostgreSQL real (`adops360_test`), incluyendo autenticación y autorización.
- **Tests de infraestructura y migraciones:** Pruebas de los modelos de identidad y de la coherencia entre la migración Alembic y los modelos.

### Resultados

| Ejecución | Pruebas | Estado | Duración | Notas |
|-----------|---------|--------|----------|-------|
| 1 | 65 aprobadas | ✓ Paso | 1.29s | Base de pruebas (`adops360_test`) recreada al inicio |
| 2 | 65 aprobadas | ✓ Paso | 1.44s | Base de pruebas (`adops360_test`) recreada al inicio |

**Resumen:** Las suites de backend ejecutan contra una base de datos aislada que se recrea antes de cada ejecución, incluyendo validación de API e infraestructura contra una base PostgreSQL real. La base de desarrollo (`adops360`) permanece sin cambios durante las pruebas.

## Resultados Frontend

### Tests unitarios (Vitest + Testing Library)

| Ejecución | Ficheros | Tests | Estado | Duración | Notas |
|-----------|----------|-------|--------|----------|-------|
| 1 | 16 aprobados | 61 aprobados | ✓ Paso | 4.91s | Entorno jsdom |
| 2 | 16 aprobados | 61 aprobados | ✓ Paso | 6.89s | Entorno jsdom |

### Verificación de tipos (TypeScript)

| Herramienta | Estado | Código de salida |
|-------------|--------|------------------|
| `tsc --noEmit` | ✓ Paso | 0 |

**Resumen:** Frontend aprueba verificación de tipos y tests unitarios. Los tests incluyen nuevas pruebas del layout de autenticación para estado no autenticado con comportamiento del botón de inicio de sesión.

## Estado de la Base de Datos de Desarrollo

**Antes y después:** Sin cambios. La base de desarrollo se utiliza para pruebas manuales y seeding; las suites automatizadas utilizan una instancia aislada.

| Tabla | Conteo |
|-------|--------|
| users | 1 |
| user_roles | 1 |
| roles | 3 |
| advertisers | 1 |
| agencies | 1 |
| holding_groups | 1 |
| dsps | 3 |
| channels | 3 |
| formats | 3 |
| campaign_types | 3 |
| sectors | 3 |
| sales_reps | 1 |
| campaigns | 1 |
| campaign_periods | 1 |
| campaign_lines | 1 |
| purchase_orders | 1 |
| purchase_order_versions | 1 |
| dsp_mappings | 0 |
| alembic_version | 1 |

**Nota:** Las suites de pruebas utilizan la base `adops360_test` (recreada al inicio); la base de desarrollo `adops360` permanece sin modificar.

## Alcance

### En alcance para este informe

- **Backend:** Tests de dominio, API e infraestructura contra PostgreSQL real (pytest) ✓
- **Frontend:** Tests unitarios (Vitest + Testing Library) ✓
- **Verificación de tipos:** TypeScript ✓

### Fuera de alcance (planeado para Entrega 3)

- **Tests end-to-end:** Playwright
- **Tests de integración frontend-backend:** Verificación del frontend contra el backend real en Docker
