# release.md — FE-VTS-PASE-001: Pase visita QR

> Esqueleto `/completar` — llenar al desplegar.

## Piezas a desplegar (en orden)

| # | Pieza | Target | Script/Artefacto | Depende de |
|---|-------|--------|------------------|------------|
| 1 | Vista `vts.vsVisitasGeneradas` | database:CuartaQuinientos | `SQL/cuartaquinientos_schema.sql` (bloque vista) | DB-001 aplicado |
| 2 | API GraphApi | backend:cuartaquinientos-api | PR `feature/fe-vts-pase-001-vts-pase-qr` | 1 |
| 3 | SPA Web | frontend:cuartaquinientos-web | mismo PR | 2 |

## Bitácora de despliegue

| Pieza | Ambiente | Fecha | Quién | Método | Smoke test | Resultado |
|---|---|---|---|---|---|---|
| 1 | TEST | | | | `SELECT TOP 1 * FROM vts.vsVisitasGeneradas` | |
| 2 | TEST | | | | `FE-VTS-PASE-001_api_tests.http` | |
| 3 | TEST | | | | `/visitas/pases` manual | |

## Verificación post-deploy

- [ ] Vista sin binding errors.
- [ ] Crear → validar → usar pase en TEST.

## Canario

No aplica (design sin sondas canario).

## Rollback ejecutable

1. Revertir PR API/Web.
2. Restaurar definición anterior de `vts.vsVisitasGeneradas` solo si la vista previa era válida en ese entorno.
