# impl.md — TKT-<id>: <título>

> Generado por: **implementador** (Cursor) al terminar la implementación
> Consumido por: auditores + generador de contexto SDD (insumo para delta.md)
> **Tipo:** Feature | Bug Fix | Refactor | Spike

## Estado

| Campo | Valor |
|---|---|
| Requerimiento | TKT-<id> |
| Implementador | cursor |
| Fecha | <YYYY-MM-DD> |
| Estado | LISTO PARA REVISIÓN |

## Objetos implementados

<!-- Actor real por fila: SP exacto / controller exacto / componente exacto.
     Sin "el sistema hizo X" — quién hizo qué. -->
| Target:Instancia | Objeto | Acción | Evidencia de verificación |
|---|---|---|---|
| `database:<nombre>` | `esquema.prcGetNombre` | crear | `-- ✓ MCP [nesgotest] → 5 filas` |
| `backend:<nombre>` | `Módulo/ControllerNombre` | modificar | HTTP 200, `success: true` |
| `frontend:<nombre>` | `src/features/<dominio>/Componente.tsx` | crear | `tsc --noEmit` limpio |

## Desviaciones vs design.md

<!-- Qué se implementó diferente al plan y por qué. "Ninguna" si aplica. -->
- <desviación o "Ninguna">

## Verificaciones ejecutadas

| Test | CA que cubre | Tipo | Resultado | Evidencia |
|---|---|---|---|---|
| `TC-1` | CA-1 [M] | funcional | ✅ | <MCP query / test output / respuesta HTTP> |
| `TC-INV-1` | CA-R1 — INV-1 | regresión | ✅ | <evidencia> |
| `TC-RB` | rollback | rollback | ✅ | <cómo se validó que el rollback funciona> |

## 5 porqués — causa raíz (Bug Fix únicamente)

<!-- Completar SOLO si Tipo: Bug Fix en spec.md. Requerido por Definition of Done.
     Cada "por qué" va más profundo que el anterior — no repetir el síntoma. -->
1. **¿Por qué?** <síntoma observable>
2. **¿Por qué?** <causa inmediata del síntoma>
3. **¿Por qué?** <causa subyacente>
4. **¿Por qué?** <causa sistémica>
5. **¿Por qué?** <causa raíz — la que se fixea>

**Fix aplicado sobre causa raíz:** <descripción del fix y por qué ataca la raíz>

## Preguntas abiertas / riesgos identificados durante implementación

<!-- Lo que el implementador descubrió que no estaba en spec/design y
     que el generador de contexto debe considerar en delta.md o en requerimientos futuros. -->
- <observación o "Ninguna">
