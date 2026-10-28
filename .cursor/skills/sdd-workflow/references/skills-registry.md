# Skills Registry — SDD

Mapa explícito: artefacto SDD → agente/comando del implementador.
Actualizar cuando se agreguen o renombren agentes/comandos en el toolchain del implementador.

## Por artefacto del generador de contexto

| Artefacto | Agente(s) | Comando |
|---|---|---|
| `_index.md` | (hub de referencia, ninguno) | — |
| `spec.md` | agente de planificación | `/definir` o equivalente |
| `design.md` | agentes de desarrollo por target | `/diseñar` o equivalente |
| `*PruebasUnitarias.sql` | agente de pruebas (modo GENERAR) | `/test` (auto al cerrar el design) |
| `impl.md` | agentes de auditoría | `/revisar` o equivalente |
| `TKT-XXXX-APIS.md` | generador de contexto (fase REVISAR, paso 5) | `/revisar` (auto, si APROBADO + endpoints tocados) |
| `delta.md` + `release.md` | agentes de cierre + git | `/completar` o equivalente |

## Por target en scope

| Target | Agentes de implementación | Agentes de revisión |
|---|---|---|
| `database` | desarrollador-sql, tester-sql | auditor-sql |
| `backend` | desarrollador-api, api-tester | auditor-codigo, auditor-seguridad |
| `frontend` | desarrollador-frontend, frontend-tester | auditor-codigo |
| `mobile` | desarrollador-mobile, mobile-tester | auditor-mobile |

## Skills del generador de contexto

| Skill | Trigger | Qué produce |
|---|---|---|
| `sdd-workflow` | TKT / spec / design / delta / planificación | spec.md + design.md + TKT-APIS.md |
| `austero` | Siempre (hook UserPromptSubmit) | Disciplina de contexto |
| `abogado-del-diablo` | `/definir`, `/diseñar`, fase TEST; antes de cambiar código existente | Objeciones / veredicto (sin artefacto) |
| `documentar-sp` | Documentar / mapa de un SP (hook) | `<SP>.md` de lectura rápida |
| `mockup-a-contexto` | Mockup con UI | Contexto implementable + mockup anotado + PNG |

## Routing de modelo por tarea

| Tarea | Modelo recomendado |
|---|---|
| `spec.md`, `design.md`, `delta.md` | Strong (razonamiento + investigación MCP) |
| `TKT-XXXX-APIS.md` | Strong (necesita leer impl.md + controllers para extraer endpoints reales) |
| `_index.md`, `_graph.md`, `compound_loop` | Weak (admin, bajo costo) |
