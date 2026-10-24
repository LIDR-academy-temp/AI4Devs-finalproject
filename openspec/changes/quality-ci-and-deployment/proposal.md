# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

La entrega final exige una aplicación desplegada con URL pública y un flujo verificado de extremo a extremo. Además, el motor es la pieza crítica del producto y su cobertura de tests debe ser demostrable. Este change consolida la calidad y la operación: tests formales, integración continua y despliegue (readme §2.4, §2.6; PRD RNF-13, RNF-16).

## What Changes

- Tests unitarios completos del motor y los normalizadores con cobertura ≥ 90 % medida en CI (los tests ya escritos en cada change se consolidan y se cubren los huecos).
- Tests de integración de la API contra PostgreSQL de test para todos los endpoints del flujo principal.
- Tests E2E con Playwright del recorrido: login → crear conciliación → subir archivos → mapear → ejecutar → cruce manual → exportar.
- Pipeline de GitHub Actions en cada pull request: lint, tests unitarios e integración (PostgreSQL como servicio), build de ambos paquetes.
- Despliegue continuo desde `main`: backend y base de datos en Render o Railway con `prisma migrate deploy`, frontend en Vercel; variables de entorno documentadas; URL pública en readme §0.
- Capturas y vídeo demostrativo para readme §1.3.

## Capabilities

### New Capabilities
<!-- ninguna: change de infraestructura y calidad sin comportamiento de producto nuevo -->

### Modified Capabilities
<!-- ninguna. Este change declara skip_specs: true en .openspec.yaml y se archiva con --skip-specs -->

## Impact

- **HU:** todas (verificación). **Tickets:** TK-25 (3 SP), TK-26 (3 SP), TK-27 (5 SP), TK-28 (2 SP), TK-29 (3 SP). **RNF:** RNF-13, RNF-16.
- **Código:** `apps/api/test/`, `e2e/`, `.github/workflows/ci.yml`, configuración de Render/Railway y Vercel, `docker-compose.yml` para CI.
- **Dependencias nuevas:** `@playwright/test`, acciones de GitHub para Node y PostgreSQL.
- **Riesgo:** límites de los planes gratuitos de hosting (arranque en frío, horas); documentar en readme §2.4.
