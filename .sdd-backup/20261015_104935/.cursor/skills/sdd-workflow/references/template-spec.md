# spec.md — TKT-<id>: <título>

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` — agentes según su toolchain)
> **Tipo:** Feature | Bug Fix | Refactor | Spike

## User story

Como <rol>, quiero <capacidad>, para <beneficio>.

## Contexto / problema

<Comportamiento actual vs esperado. Hallazgos de la investigación: specs leídas,
requerimientos relacionados de _graph.md, objetos existentes encontrados.>

<!-- Si Tipo: Bug Fix — narrar la CAUSA RAÍZ confirmada (no solo el síntoma),
     citando la evidencia de la fase 3 de "Investigación sistemática de causa
     raíz" (methodology.md). Si la causa raíz no está confirmada con evidencia,
     no se escribe este spec.md todavía — ver criterio de reclasificar a Spike. -->

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- <ítem>

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- <ítem>

### Could — solo si sale gratis durante la implementación; jamás bloquea
- <ítem o "ninguno">

### Won't — fuera de alcance explícito
- <ítem>

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:<nombre>` | <qué cambia> |
| `backend:<nombre>` | <qué cambia> |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | <regla> | `specs/<dominio>.md` |

## Characterization (CHAR-x) — solo Refactor

<!-- CUÁNDO APLICA: Tipo = Refactor de objeto legacy.
     Si Tipo ≠ Refactor → eliminar esta sección completa (igual que el Pre-mortem en tickets simples).
     Comportamiento ACTUAL capturado por MCP ANTES del cambio. Es el contrato de
     paridad: el refactor debe reproducirlo idéntico. Autoría humana o IA-assisted
     con revisión humana obligatoria. Sin baseline capturado no se implementa refactor.
     En Bug Fix NO se usa CHAR-x: el comportamiento cambia a propósito; la protección
     de regresión la dan los INV-x / CA-R1. -->

| # | Invocación (MCP) | Salida actual (baseline) | Debe seguir igual |
|---|---|---|---|
| CHAR-1 | `EXEC [esquema].[prc] @p=<valor>` | `<resultado capturado>` | ☐ |
| CHAR-2 | `EXEC [esquema].[prc] @p=NULL` | `<error/resultado>` | ☐ |

## Propiedades (PBT-x) — invariantes a nivel dato (OPCIONAL)

<!-- Opcional: incluir solo cuando exista una regla universal que valga la pena
     blindar. Si no aplica, borrar esta sección — no dejarla vacía.
     "Para todo X válido, siempre Y". Autoría humana. Se realizan con fast-check
     (TS) o mutantes/datasets manuales (SQL). Distintas de los INV-x: aquí la regla
     es universal sobre el dominio de entradas, no un comportamiento existente puntual. -->

- PBT-1: Para todo <CustomerID > 0>, <StatusID nunca es NULL>
- PBT-2: Para todo <@iPUserID = 0>, <código de error ≥ 400>

## Criterios de aceptación

<!-- Given/When/Then: traducible directo a test SQL sin interpretación intermedia.
     Bug Fix: el primer CA [M] reproduce el defecto ANTES del fix.
     Generar con el patrón poke-holes (methodology.md): happy path primero, luego
     candidatos de edge cases/supuestos/gaps, filtrar a los reales. Marcar `(asumido)`
     todo CA sin evidencia en requerimiento/MCP. -->
- [ ] **CA-1 [M]**: <nombre> — **Dado** <contexto> **Cuando** <acción> **Entonces** <resultado verificable>
- [ ] **CA-R1 [M]**: regresión de INV-1 — **Dado** <estado previo> **Cuando** <acción existente> **Entonces** el comportamiento sigue intacto

## Reutilización detectada (evidencia de la escalera — regla 6)

- <objeto/feature existente> → <cómo se reutiliza, o "evaluado y descartado porque…">

## Definition of Ready

<!-- Filtro INVEST de entrada (methodology.md): story que falla 2+ no pasa a
     diseñar, vuelve a refinamiento. La IA amplifica stories vagas. -->
- [ ] **I**ndependent — no depende de otra story no archivada (o documentada/aceptada)
- [ ] **N**egotiable — alcance ajustable vía escalación al usuario, no contrato rígido
- [ ] **V**aluable — cada Must entrega valor observable
- [ ] **E**stimable — sin incertidumbre técnica que impida dimensionar (si la hay → Spike)
- [ ] **S**mall — cada Must cabe en una sesión de implementador
- [ ] **T**estable — cada Must tiene CA en Given/When/Then

- [ ] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [ ] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí
- [ ] Cada Must cabe en una sesión de implementador (regla "Small") — si no cabe, se divide en sub-requerimientos
- [ ] Instancias en scope identificadas (`target:instancia`)
- [ ] Sin preguntas abiertas que afecten un Must
- [ ] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [ ] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [ ] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|

## Preguntas abiertas

- <pregunta> → **pendiente / respondida: <respuesta>**

## Quick Checks — antes del handoff al implementador

<!-- Un ✗ bloquea el handoff. Correr antes de entregar spec.md. -->
- [ ] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [ ] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [ ] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [ ] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [ ] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [ ] Instancias en scope identificadas para cada Must (`target:instancia`)
- [ ] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
- [ ] Si Tipo = Refactor → CHAR-x poblado con baseline capturado por MCP
- [ ] Toda propiedad PBT-x es universal sobre el dominio de entrada (no un caso puntual)
