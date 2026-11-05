# Plantilla — Revisión de consistencia (G3)

Usar al cerrar el backlog, después de cualquier cambio de decisión y antes de cada entrega.

```markdown
Revisa toda la documentación (docs/, readme.md, prompts.md, CLAUDE.md, openspec/config.yaml) en busca de inconsistencias y compárala con docs/ai-sdlc-claude-code-openspec.md:

1. Ejecuta python3 scripts/check_docs.py y corrige lo que reporte.
2. Trazabilidad: OBJ → épica → HU → RF → escenario → ticket. ¿Falta algún eslabón?
3. ¿Hay prioridades, estimaciones, estados o alcances distintos para lo mismo en dos documentos?
4. ¿Algún ADR aceptado contradice al PRD? ¿Los reemplazados apuntan a su sustituto?
5. ¿Hay tareas que el PRD exige (medición, etiquetado, verificaciones) sin ticket?
6. ¿Algún paso de la guía o compuerta de docs/sdlc-checklist.md quedó sin hacer?
7. ¿Está completo el contenido obligatorio de la entrega (docs/reglas-proyecto-final-ai4devs.md)?

Lista los hallazgos con el archivo y la corrección propuesta.
```
