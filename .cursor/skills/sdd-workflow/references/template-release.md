# release.md — TKT-<id>: <título>

> Generado por: **generador de contexto SDD** (esqueleto, junto con delta.md) · Llenado por: **quien ejecuta cada deploy**
> Propósito: trazabilidad del despliegue por ambiente. Un requerimiento no está realmente
> cerrado hasta que esta tabla refleja PROD (o se decide explícitamente no desplegar).

## Piezas a desplegar (en orden)

| # | Pieza | Target:Instancia | Script/Artefacto | Depende de |
|---|---|---|---|---|
| 1 | <objeto / endpoint / artefacto> | `target:<instancia>` | `<artefacto-deploy>` | — |

## Bitácora de despliegue

<!-- Una fila por pieza × ambiente. Sin fila = no desplegado. -->
| Pieza | Ambiente | Fecha | Quién | Método (MCP/manual/CI/…) | Smoke test | Resultado |
|---|---|---|---|---|---|---|
| 1 | TEST | | | | `<comando smoke del profile>` | ✅/❌ |
| 1 | PROD | | | | | |

## Verificación post-deploy

- [ ] Smoke test por pieza ejecutado en cada ambiente (ver bitácora).
- [ ] Rollback ensayado en TEST (TC-RB del plan de pruebas pasó).
- [ ] Sin errores en las primeras <N horas/días> (logs / monitoreo).

## Canario (sondas de design.md)

<!-- Quien despliega corre cada sonda por MCP de PROD (solo lectura).
     Veredicto por sonda: SANO (dentro del umbral) · DEGRADADO (fuera del umbral en
     2 mediciones consecutivas — una sola puede ser ruido) · ROLLBACK PENDIENTE
     (DEGRADADO en sonda de dinero/inventario → ejecutar «Rollback ejecutable»).
     Nunca inferir éxito porque el deploy terminó: el veredicto sale de las sondas.
     «No aplica» si design.md no declaró sondas. -->
| Sonda | Base (antes del deploy) | T+1h | T+1d | Umbral | Veredicto |
|---|---|---|---|---|---|
| <sonda> | | | | | SANO / DEGRADADO / ROLLBACK PENDIENTE |

## Rollback ejecutable

<!-- Copiado de design.md y ajustado a lo realmente implementado.
     Debe poder ejecutarse tal cual, sin pensar, a las 3am. -->
```
-- script de reversión por pieza (dialecto del target), en orden inverso al deploy
```

## Incidencias durante el deploy

<!-- "Ninguna" si aplica. Si hubo desviación, registrarla aquí y en delta.md -->
