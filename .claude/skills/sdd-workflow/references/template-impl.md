# impl.md — TKT-<id>: <título>

> Generado por: **implementador** al terminar la implementación
> Consumido por: auditores + generador de contexto SDD (insumo para delta.md)
> **Tipo:** Feature | Bug Fix | Refactor | Spike

## Estado

| Campo | Valor |
|---|---|
| Requerimiento | TKT-<id> |
| Implementador | <cursor/copilot/humano> |
| Fecha | <YYYY-MM-DD> |
| Estado | LISTO PARA REVISIÓN |

## Objetos implementados

<!-- Actor real por fila: objeto exacto que se creó/modificó.
     Sin "el sistema hizo X" — quién hizo qué. -->
| Target:Instancia | Objeto | Acción | Evidencia de verificación |
|---|---|---|---|
| `database:<nombre>` | `<esquema.objeto>` | crear/modificar | `-- ✓ MCP [<entorno>] → <resultado>` |
| `backend:<nombre>` | `<Módulo/Controller>` | crear/modificar | HTTP 200, `success: true` |
| `frontend:<nombre>` | `<ruta/Componente>` | crear/modificar | build limpio |

## Desviaciones vs design.md

<!-- Qué se implementó diferente al plan y por qué. "Ninguna" si aplica. -->
- <desviación o "Ninguna">

## Verificaciones ejecutadas

| Test | CA que cubre | Tipo | Resultado | Evidencia |
|---|---|---|---|---|
| `TC-1` | CA-1 [M] | funcional | ✅ | <evidencia> |
| `TC-INV-1` | CA-R1 — INV-1 | regresión | ✅ | <evidencia> |
| `TC-RB` | rollback | rollback | ✅ | <evidencia> |

## 5 porqués — causa raíz (Bug Fix únicamente)

<!-- Completar SOLO si Tipo: Bug Fix. Requerido por Definition of Done.
     Cada "por qué" va más profundo — no repetir el síntoma. -->
1. **¿Por qué?** <síntoma>
2. **¿Por qué?** <causa inmediata>
3. **¿Por qué?** <causa subyacente>
4. **¿Por qué?** <causa sistémica>
5. **¿Por qué?** <causa raíz>

**Fix aplicado sobre causa raíz:** <descripción>

## Preguntas abiertas / riesgos identificados durante implementación

- <observación o "Ninguna">
