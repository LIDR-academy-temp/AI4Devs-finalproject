# 09 — Coordinación con Cursor / Claude Code y equipos multiagente

La skill es una biblioteca de procedimientos UI/UX, **no sustituye** agentes existentes ni asume capacidad de invocar subagentes. El coordinador debe usar los agentes disponibles de la herramienta y las reglas del repositorio.

## Flujo de trabajo interoperable

```text
Solicitud
 -> Router de proyecto (si existe)
 -> Plan / especificación (si alcance lo justifica)
 -> Frontend Design Master (UX/visual/motion + plataforma)
 -> Implementación en archivos autorizados
 -> Auditor de código y/o QA existente
 -> Corrección por agente habitual (si hay hallazgos)
 -> Evidencia y entrega
```

## Separación de responsabilidades

- Planner: alcance, dependencias, riesgos y plan de archivos.
- Frontend Design Master: patrones UX/UI, restricciones visuales, plataforma, accesibilidad y criterios de aceptación visual.
- Frontend implementer: código y pruebas del frontend.
- Code-auditor: riesgos de seguridad, bugs, calidad y arquitectura.
- Review-fixer: aplicar hallazgos autorizados y repetir verificaciones.
- Backend/SQL: **solo si el usuario pide cambios backend/SQL**; no inferir cambios a persistencia a partir de un rediseño.

## Para SDD existente

Alinear con specification/proposal/tasks, no inventar fases paralelas. Añadir notas UX/visuales a la spec del ticket y criterios verificables. Respetar "Plan Before Edit" incluso si la tarea se descompone en múltiples agentes.

## Conflictos y duplicidad

- No crear nuevo `AGENTS.md`/`.cursor/rules`/`CLAUDE.md` salvo solicitud.
- Si existen reglas de comunicación, auditoría o flujo de tickets, reutilizarlas.
- No invocar una skill externa con el mismo contenido dos veces para "sumar puntos".
- No ejecutar herramientas de terceros sin estar disponibles y aprobadas.

## Handoff recomendado

```text
Tarea / ticket:
Pantalla y archivos afectados:
Restricciones no negociables:
Decisiones UX y visuales:
Comportamiento e interacción:
Estados y accesibilidad:
Pruebas esperadas:
Auditorías y pendientes:
```
