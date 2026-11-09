# 15 — Integración OPCIONAL con implementaciones originales

El coordinador funciona por sí solo para los procesos de diseño y auditoría descritos. **No incluye ejecutables, bibliotecas, licencias Pro ni scripts originales**. Si se necesita una característica concreta de una herramienta, comprobar si está instalada en el proyecto y preguntar antes de incorporar dependencias nuevas.

## Política de selección

1. Identificar si la tarea necesita una capacidad **literal** (ej. `bundle.html` de un proyecto React complejo, transición oficial concreta o auditoría de un catálogo completo) o solo principios UX/UI.
2. Revisar skills existentes bajo `.claude/skills/`, `.cursor/skills/`, `.agents/skills/` o el inventario de skills del agente.
3. Si existe la herramienta original y el flujo lo necesita, consultar su propio `SKILL.md` vigente. El coordinador no reproduce sus instrucciones completas.
4. Si no existe, explicar claramente la opción de instalación y continuar con un método local cuando sea posible, **sin afirmar que se ejecutaron herramientas ajenas**.
5. Si se instala externamente: fijar versión/commit cuando el entorno lo requiera, revisar permisos/código/licencia y registrar los cambios en el repositorio.

## Referencias de implementación original

| Necesidad literal | Repositorio | Nota |
|---|---|---|
| Inicializar frontend React y empaquetar en un HTML | [Anthropic Web Artifacts Builder](https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder) | Su propio `scripts/init-artifact.sh` y `scripts/bundle-artifact.sh` requieren recursos que NO están en este ZIP |
| Consultar toda la biblioteca UX de casos especializados | [UX Designer](https://github.com/szilu/ux-designer-skill) | Es una Skill adicional, no se incluyen todos sus documentos |
| Usar el workflow y presets exactos de Taste | [Taste Skill](https://github.com/leonxlnx/taste-skill) | Comprobar versión; v2 figura experimental y puede evolucionar |
| Aplicar una transición oficial o herramienta Refine | [Transitions.dev](https://github.com/Jakubantalik/transitions.dev) | Biblioteca con condiciones de licencia específicas; Pro requiere suscripción cuando proceda |

## Antiduplicidad

No invocar toda la cadena externa para una simple corrección de margen o texto. La Skill maestra decide `QUÉ` y `CUÁNDO`; la herramienta original disponible puede resolver `CÓMO` en una tarea especializada. Las reglas del proyecto y aprobación del usuario siguen aplicando.
