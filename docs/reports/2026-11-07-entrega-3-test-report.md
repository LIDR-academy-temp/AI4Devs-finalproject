# Informe de Pruebas: Entrega 3

**Fecha:** 2026-11-07  
**Commit:** `9b65aaf` (docs(readme): point section 0.5 to the repository the pull requests come from)  
**Rama:** `final-project-LFMC`  
**Ejecución:** `2026-11-07-1848` (los ficheros de evidencia están en `docs/reports/2026-11-07-1848-*.txt`)

## Entorno

- **Orquestación:** Docker Compose (backend, frontend, db, nginx)
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy + Alembic
- **Frontend:** Next.js + TypeScript; los tests se ejecutan en el equipo local con Node.js v24.17.0
- **Base de datos:** PostgreSQL 16 (base de desarrollo con volumen persistente)
- **Ejecutores de pruebas:** pytest (backend), Vitest + Testing Library (frontend), Playwright con Chromium (extremo a extremo)
- **Datos privados:** la imagen del backend llevaba los dos ficheros de aceptación de los meses reales de Finanzas (`tests/private/`, ignorados por Git y anonimizados), por lo que las pruebas de aceptación **se ejecutaron** y no se saltaron. Ninguno está en el repositorio.

## Resultados Backend

### Suites de pruebas

- **Tests de dominio:** margen por flight, motor de extraprima, tasa de plataforma y reglas del estado diario, sin dependencia de BD.
- **Tests de API:** endpoints FastAPI con httpx contra una base PostgreSQL real (`adops360_test`), con autenticación y autorización por rol.
- **Tests de infraestructura y migraciones:** repositorios, restricciones (incluida la de exclusión de escalas de extraprima), cierre de mes y coherencia entre la migración y los modelos.
- **Tests de scripts:** ingesta nocturna, cargador de maestros y datos de demostración.
- **Pruebas de aceptación:** el dominio y el cierre frente a un mes cerrado y un mes en curso reales, fila a fila y en agregado.

### Resultados

| Ejecución | Pruebas | Estado | Duración | Notas |
|---|---|---|---|---|
| 1 | 1886 aprobadas | ✓ Paso | 28.77s | 1 saltada(s), 1 excluida(s); base `adops360_test` recreada al inicio |
| 2 | 1886 aprobadas | ✓ Paso | 24.55s | 1 saltada(s), 1 excluida(s); base `adops360_test` recreada al inicio |

**Pruebas saltadas:** `tests/scripts/test_load_masters.py:166: deploy/masters.example.json is outside this image: run it from a checkout`.

**Tests de dominio por separado:** 802 aprobadas, 0 fallidas, 0 saltadas en 1.46s.

**Pruebas de aceptación por separado:** 38 aprobadas, 0 fallidas, 0 saltadas en 3.87s.

**Pruebas marcadas `slow`:** 1 aprobadas, 0 fallidas, 0 saltadas en 27.08s.

**Resumen:** las suites del backend se ejecutan contra una base aislada que se recrea antes de cada ejecución; la base de desarrollo (`adops360`) permanece sin cambios (§ Estado de la base de datos).

## Resultados Frontend

### Tests unitarios (Vitest + Testing Library)

| Ejecución | Ficheros | Tests | Estado | Duración |
|---|---|---|---|---|
| 1 | 54 passed (54) | 546 passed (546) | ✓ Paso | 56.99s |
| 2 | 54 passed (54) | 546 passed (546) | ✓ Paso | 35.95s |

### Verificación de tipos (TypeScript)

| Herramienta | Estado | Código de salida |
|---|---|---|
| `tsc --noEmit` | ✓ Paso | 0 |

## Pruebas de extremo a extremo (Playwright)

Se ejecutan contra el stack real levantado con Docker Compose, con datos de demostración y una base recién sembrada (`e2e/scripts/reset-data.sh`). La sesión se inyecta desde un ID token real; el inicio de sesión de Cognito se prueba en un único caso opcional que necesita credenciales.

| Fichero | Aprobados | Saltados | Fallidos |
|---|---:|---:|---:|
| `campaign.spec.ts` | 7 | 0 | 0 |
| `exceptions.spec.ts` | 10 | 0 | 0 |
| `login.spec.ts` | 0 | 1 | 0 |
| `margin.spec.ts` | 10 | 0 | 0 |
| `navigation-roles.spec.ts` | 3 | 0 | 0 |
| `smoke.spec.ts` | 2 | 0 | 0 |
| `status.spec.ts` | 2 | 0 | 0 |
| **Total** | **34** | **1** | **0** |

**Resultado de la ejecución:** 34 aprobados en 22.4s; 1 saltado(s) (el inicio de sesión real con Cognito); 0 fallido(s).

## Modelo de datos y especificaciones

- **Migración actual de Alembic:** `439b6b8481f8 (head)`
- **OpenSpec:** Change 'daily-campaign-delivery-status' is valid
- **OpenSpec:** Change 'campaign-margin-and-rebate-accrual' is valid
- **Imágenes de producción** (`scripts/verify_prod_images.sh`): `OK: images built, /api/health 200 over HTTPS, port 80 redirects, backend image clean and non-root, database not published, migrations applied as a separate step`

## Estado de la Base de Datos de Desarrollo

**Antes y después:** **idéntico**. La base de desarrollo se usa para pruebas manuales y datos de demostración; las suites automatizadas usan una instancia aislada.

| Tabla | Antes | Después |
|---|---:|---:|
| advertisers | 2 | 2 |
| agencies | 2 | 2 |
| alembic_version | 1 | 1 |
| applied_rate_brackets | 3 | 3 |
| applied_rates | 4 | 4 |
| campaign_line_periods | 18 | 18 |
| campaign_lines | 10 | 10 |
| campaign_periods | 18 | 18 |
| campaign_types | 4 | 4 |
| campaigns | 10 | 10 |
| channels | 4 | 4 |
| daily_deliveries | 60 | 60 |
| dsp_catalog_lines | 5 | 5 |
| dsp_mappings | 2 | 2 |
| dsps | 4 | 4 |
| formats | 4 | 4 |
| holding_groups | 2 | 2 |
| ingestion_batches | 2 | 2 |
| ingestion_exception_deliveries | 20 | 20 |
| ingestion_exceptions | 5 | 5 |
| platform_rate_settings | 2 | 2 |
| purchase_order_versions | 10 | 10 |
| purchase_orders | 10 | 10 |
| rebate_brackets | 3 | 3 |
| rebate_schedules | 2 | 2 |
| roles | 3 | 3 |
| sales_reps | 2 | 2 |
| sectors | 4 | 4 |
| user_roles | 2 | 2 |
| users | 1 | 1 |

## Cambios en tests existentes

Los tests existentes que cambiaron de comportamiento por las decisiones de las dos historias:

- **Backend, margen:** tres tests de la definición antigua de `below_cost` (coste de medios mayor que el ingreso) se sustituyeron por seis con la definición nueva (margen final negativo); el recuento de redondeos de un flight en curso pasó de cuatro a cinco al añadirse la venta contratada; y una aserción de los códigos de las tablas de tramos.
- **Frontend:** la navegación pasó de cuatro a cinco enlaces; la columna «Ingreso» pasó a «Devengado» en la vista de margen; y los tests del cierre y del acceso usan un margen con un flight pendiente de cierre porque el botón «Cerrar mes» se desactiva sin él.

## Alcance

### En alcance para este informe

- **Backend:** dominio, API, infraestructura, scripts y aceptación contra PostgreSQL real (pytest) ✓
- **Frontend:** tests unitarios (Vitest + Testing Library) y verificación de tipos ✓
- **Extremo a extremo:** Playwright sobre el stack real ✓
- **Imágenes de producción:** construcción y verificación automática ✓

### Fuera de alcance

- **Despliegue en una instancia real de AWS:** pendiente; se demuestra en vídeo con datos de demostración.
- **Pruebas de carga** (un millón de filas) y **subida manual de ficheros:** aplazadas con su motivo en `tasks.md`.
