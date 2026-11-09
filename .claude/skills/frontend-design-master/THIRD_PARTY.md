# Referencias, capacidades y terceros

Este paquete es **una skill nueva con instrucciones propias** que organiza cuatro áreas. Los nombres de las herramientas de terceros se utilizan únicamente para identificar las fuentes, sin implicar patrocinio ni afiliación.

| Proyecto | Referencia oficial | Aporte conceptual integrado | Qué no se incluye |
|---|---|---|---|
| Anthropic Web Artifacts Builder | https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder | Prototipos React complejos y empaquetado único | Script original `init-artifact.sh`, `bundle-artifact.sh` y tarball de componentes |
| szilu UX Designer | https://github.com/szilu/ux-designer-skill | UX basado en flujo, formularios, tablas, estados, revisión | Sus referencias extensas y su `SKILL.md` original |
| leonxlnx Taste Skill | https://github.com/leonxlnx/taste-skill | Dirección de arte específica, no UI genérica, validación visual real | Script de direcciones, búsqueda de imágenes, pruebas de browser y fotografías |
| Jakubantalik Transitions.dev | https://github.com/Jakubantalik/transitions.dev | Motion con propósito, patrones accesibles y reduced motion | CSS de la biblioteca, recetas Pro, CLI, efectos, servicio Refine |

## Licencias y uso correcto

- Web Artifacts Builder: licencia Apache-2.0 en su directorio (consultar versión vigente).
- UX Designer: MIT según repositorio.
- Taste Skill: MIT según repositorio; fotos y otros assets pueden tener derechos propios.
- Transitions.dev: permitir uso en proyectos no implica derecho a distribuir la biblioteca como kit competidor. Su sitio publica condiciones específicas para biblioteca/transiciones; el tooling puede llevar licencia diferente.
- **Este ZIP no redistribuye código o assets de esas herramientas.** Es contenido editorial y scripts propios.
- Si instalas por separado alguna herramienta, conserva sus avisos y revisa licencias, dependencias y políticas de seguridad antes de ejecutar.

## Instalación opcional de herramientas originales (NO automática)

### Anthropic Web Artifacts Builder

https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder

Usar desde su propio directorio el script de inicialización, implementar y ejecutar el bundle original. El script espera archivos incluidos en su repositorio. No afirmar que este ZIP proporciona ese script.

### UX Designer

https://github.com/szilu/ux-designer-skill

Puede convivir como skill separada si se desean todas sus referencias. Evitar enviar instrucciones duplicadas a la misma tarea sin propósito.

### Taste Skill

https://github.com/leonxlnx/taste-skill

Para el workflow original de exploración estética, búsqueda de referencias y screenshots: instalar la skill original y satisfacer sus requisitos actuales (según el repositorio, Node/Chrome e Internet). Esta skill universal puede coordinar esas ideas aun sin el motor original, pero **no puede garantizar su metodología automatizada de capturas** sin las herramientas correspondientes.

### Transitions.dev

https://github.com/Jakubantalik/transitions.dev

Para añadir recetas oficiales verificar la documentación vigente. Ejemplos de la herramienta original:

```bash
npx transitions-dev list
npx transitions-dev add card-resize
```

Estos comandos **no** son parte de este paquete y solo deben ejecutarse tras revisar y aprobar nuevas dependencias. El catálogo Free/Pro y licencias pueden cambiar.

## Lecturas y estándares

- Agent Skills: https://agentskills.io/specification
- Cursor Skills: https://prod.cursor.com/docs/skills
- Claude Code Skills: https://code.claude.com/docs/en/skills
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

Última revisión de fuentes: 2026-10-23.

> Nota v1.1: el catálogo y las capacidades exactas de los cuatro repositorios evolucionan independientemente. Esta Skill ofrece un workflow original autocontenido; la capacidad específica de empaquetado oficial de Anthropic, la biblioteca UX completa, los scripts de exploración de Taste y las recetas de Transitions.dev continúan siendo dependencias opcionales independientes.
