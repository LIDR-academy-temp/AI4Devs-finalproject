---
name: enrich-us
description: Analyze and enhance user stories with complete, implementation-ready technical detail from direct ticket input or Azure DevOps.
author: Personal
version: 1.0.0
---
# enrich-us Skill

Use it when this workflow is required in the project.

## Instructions

Please analyze and enrich the ticket: $ARGUMENTS.

Follow these steps:

0. Load project standards before analyzing:
   - Read `docs/base-standards.md` first; it is mandatory project context for
     this workflow.
   - Read the relevant component `README.md`, `AGENT.md`, technical
     documentation, and active OpenSpec artifacts before drawing conclusions.
   - When relevant to the ticket, consult `docs/backend-standards.md`,
     `docs/frontend-standards.md`, `docs/documentation-standards.md`,
     `docs/api-spec.yml`, `docs/data-model.md`, and
     `VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md`.
   - Consult the applicable verification registers:
     `docs/VERIFICACIONES_PENDIENTES.md`,
     `docs/VERIFICACIONES_PENDIENTES_FRONTEND.md`,
     `docs/VERIFICACIONES_PENDIENTES_MODELOS.md`, and
     `docs/VERIFICACIONES_PENDIENTES_TRANSVERSALES.md`.
     Treat unresolved CR/V/V-DAT/V-T items as uncertainties, not as confirmed
     implementation facts or approved requirements.
   - If this skill conflicts with `docs/base-standards.md`, follow the project
     standard unless the current user request explicitly overrides it.
   - Treat the read-only analysis phase and the authorized write phase as
     separate phases.
1. Determine the ticket input source:
   - **Direct input mode (default when ticket text is provided):** Use the ticket content shared by the user in the prompt/chat.
   - **Azure DevOps mode (optional):** If the user provides an Azure DevOps work item ID or asks to use Azure DevOps (including references like "the one in progress"), use the authorized Azure DevOps MCP connection to fetch the ticket details. If the connection is unavailable or the work item cannot be identified unambiguously, request the ID or ticket text; do not guess.
2. Act as a product expert with technical knowledge.
3. Understand the problem described in the ticket.
4. Decide whether or not the User Story is completely detailed according to product best practices. Validate that it includes:
   - Full functionality description
   - Comprehensive list of fields to update
   - Required endpoints structure and URLs, when applicable and verified in the project
   - Files/modules to modify according to architecture and best practices
   - Definition of done (implementation and delivery steps)
   - Documentation and unit test updates
   - Non-functional requirements (security, performance, observability, etc.)
5. If the story lacks enough technical detail for autonomous implementation, provide an improved version that is clearer, more specific, and concise, aligned with step 4. Use the relevant verified project documentation under `docs/` and `VES/Bccr.Supen.Ves.*/`, plus approved OpenSpec specifications; do not assume an `@documentation` alias exists. Return the result in markdown.
6. Output format must always include:
   - `## Original`
   - `## Enhanced`
7. Azure DevOps write-back is optional and only applies in Azure DevOps mode when an existing work item is identified and write-back is authorized:
   - Update only the existing Azure Boards work item, preserving the original content and appending the enhanced content under clearly labeled `Original` and `Enhanced` sections, with readable formatting (lists/code snippets when supported). Do not overwrite the original story.
   - If a workflow-state transition is explicitly requested and the target state exists in that Azure DevOps project, use the approved transition; do not assume Jira states such as `To refine` or `Pending refinement validation` exist in Azure Boards.

## Notes

- Do not require Azure DevOps when the user already provided full ticket content directly.
- If input is ambiguous (for example, user gives a short reference without content), ask whether to resolve it through an authorized Azure DevOps connection or request the full ticket text.
- The documentation package confirms the VES `docs/` files cited above, but the actual API/UI/MAPI source tree, active work items, skill installation path, and OpenSpec change directories must be checked in the user's workspace before asserting they exist.
- A repository skill located under `ai-specs/` is not necessarily auto-discovered by GitHub Copilot. Keep its present location unless relocation is explicitly requested; verify skill discovery in the active environment.

## OpenSpec Traceability

When the enhanced user story corresponds to an OpenSpec change:

1. Identify the associated OpenSpec change. If its name was not specified, derive one in `kebab-case` from the story’s goal; check existing change names in the workspace before creating a duplicate.
2. Save or add the complete story to `openspec/changes/<change-name>/historia.md`.
3. The file must include the `## Original` and `## Enhanced` sections, containing the input text and the enhanced user story.
4. `historia.md` is an additional traceability artifact; it does not replace or modify `proposal.md`, `specs/<capability>/spec.md`, `design.md`, or `tasks.md`.
5. Do not generate the other OpenSpec artifacts from this skill. Their creation belongs to the OpenSpec proposal workflow (for example, `/opsx-propose` or `/openspec-propose` when available in the installed version).
6. Verify that `historia.md` exists in the correct change directory before reporting that enrichment is complete. If the file already exists, preserve it and update it with the current story.
7. The creation or update of `historia.md` is an authorized documentation
   output of this skill after the read-only analysis is complete; do not ask for
   a second approval for that file.

## Tambien haz lo siguiente:

Actúa como un arquitecto de software senior, analista funcional y especialista en desarrollo basado en especificaciones (SDD) con OpenSpec.

## 1. Análisis de la historia

- Localiza y lee la historia de usuario HU-XX, si existe
- Revisa su descripción, alcance, reglas de negocio y criterios de aceptación.
- Consulta las especificaciones OpenSpec, la arquitectura y los estándares del proyecto.
- Identifica ambigüedades, inconsistencias, requisitos faltantes y oportunidades de mejora.
- Verifica que la historia sea coherente con las demás historias y con el alcance aprobado del proyecto.

## 2. Verificación de documentación y código existente

- Identifica los archivos que necesitas consultar y explica por qué.
- Inspecciona, exclusivamente en modo lectura, los componentes frontend, backend, API, modelos, servicios y pruebas relacionados que estén documentados.
- Verifica qué funcionalidades ya están implementadas y cuáles están pendientes.
- No supongas comportamientos que no puedas comprobar.
- Diferencia claramente entre hechos verificados, inferencias y recomendaciones.
- Consulta los registros CR/V/V-DAT/V-T pertinentes antes de afirmar comportamientos o contratos; conserva como pendientes los que no estén corroborados.
- Distingue la arquitectura vigente React → API → MAPI → SQL Server de la documentación histórica de Web Forms; no trates los prototipos como funcionalidades implementadas.

## 3. Identificación de cambios e impactos

Para cada cambio propuesto, indica:

- Archivo o componente involucrado.
- Comportamiento actual verificado.
- Modificación sugerida.
- Justificación funcional o técnica.
- Impacto sobre otros componentes o historias.
- Riesgos y dependencias.
- Pruebas necesarias para validar el cambio.
- Prioridad: obligatorio, recomendado u opcional.

Si no puedes identificar un archivo concreto, indícalo expresamente. No inventes rutas ni componentes.

## 4. Propuesta de mejora

Presenta:

1. Diagnóstico de la historia actual.
2. Archivos consultados y propósito de cada consulta.
3. Problemas, inconsistencias y requisitos incompletos.
4. Versión mejorada de la historia de usuario.
5. Criterios de aceptación claros, medibles y verificables.
6. Matriz de archivos y componentes potencialmente afectados.
7. Análisis de impacto funcional y técnico.
8. Riesgos, dependencias y decisiones pendientes.
9. Plan de cambios propuesto, ordenado por prioridad.

## 5. Relación con OpenSpec

Indica qué información debería incorporarse posteriormente en:

- `proposal.md`: justificación, objetivos y alcance del cambio.
- `design.md`: componentes afectados, decisiones técnicas y análisis de impacto.
- `specs/<capability>/spec.md`: requisitos y escenarios de aceptación.
- `tasks.md`: actividades necesarias para implementar y verificar los cambios.

Presenta únicamente el contenido propuesto. No crees ni actualices estos archivos durante el análisis.

## 6. Restricciones obligatorias

**MODO DE SOLO LECTURA PARA IMPLEMENTACIÓN**

- NO modificar código fuente.
- NO crear, editar, eliminar ni renombrar archivos distintos de
  `openspec/changes/<change-name>/historia.md` cuando la historia enriquecida
  corresponda a un cambio OpenSpec.
- NO modificar `proposal.md`, `design.md`, `spec.md` ni `tasks.md`.
- NO ejecutar comandos que alteren el repositorio, dependencias, configuraciones o bases de datos.
- NO ejecutar `/opsx-apply` ni implementar soluciones.
- Azure DevOps puede consultarse y actualizarse mediante el servidor MCP
  autorizado cuando la historia enriquecida tenga un work item asociado y la
  conexión esté disponible; no asumir acceso ni permisos no comprobados.
- Las actualizaciones de Azure Boards deben ser limitadas a la historia
  existente: descripción, criterios de aceptación, prueba funcional, trazabilidad,
  estado y campos directamente relacionados con el enriquecimiento. No crear
  work items nuevos ni modificar tareas no relacionadas.
- NO realizar commits, push ni pull requests.
- La creación o actualización de `historia.md` es la salida documental propia de
  este skill y no requiere aprobación adicional.
- Para el análisis y la verificación utiliza únicamente herramientas y comandos
  de lectura. Después del análisis, las únicas escrituras permitidas son guardar
  `historia.md` y actualizar el work item existente asociado, únicamente en los
  campos directamente relacionados con el enriquecimiento.
- Si una verificación requiere ejecutar una operación que pueda modificar el entorno, explicar primero la necesidad y solicitar autorización.

## 7. Aprobación para cambios adicionales

Al finalizar, presenta la propuesta completa y detente.

La creación o actualización de `historia.md` ya está autorizada por el flujo de
`enrich-us`. No esperes aprobación adicional para ese archivo.

La autorización para modificar otros artefactos OpenSpec o implementar código
debe solicitarse por separado. La sincronización del work item existente en
Azure DevOps forma parte del enriquecimiento cuando existe un identificador
asociado y está limitada a los campos directamente relacionados con la
historia; no autoriza crear work items ni modificar tareas no relacionadas.

**Primero analiza, verifica y documenta los hallazgos; no implementes código.**