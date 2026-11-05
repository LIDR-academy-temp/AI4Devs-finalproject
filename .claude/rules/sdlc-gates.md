# Compuertas del AI SDLC y gestión de cambios

Sigue `docs/ai-sdlc-claude-code-openspec.md` y `docs/sdlc-checklist.md` sin esperar a que el usuario lo pida.

- **Antes de iniciar una fase**, revisa la compuerta anterior en `docs/sdlc-checklist.md`. Si tiene casillas abiertas, dilo y propón cerrarlas antes de continuar; no avances en silencio.
- **Después de redactar o cambiar el PRD**, propón la revisión adversarial con `docs/prompts/adversarial-prd.md` antes de pasar a la arquitectura. Lo mismo con la arquitectura y `docs/prompts/adversarial-architecture.md`.
- **Épicas**: el PRD debe definirlas (3 a 5, cada una con su capability de OpenSpec) antes de escribir historias.
- **ADRs**: nunca reescribas un ADR aceptado. Para una decisión nueva, crea un ADR que lo reemplace y cambia el estado del anterior a "reemplazada por ADR-X". Para una aclaración que no cambia la decisión, agrega una entrada con fecha en "Historial de cambios".
- **Cambio de decisión**: aplica la propagación de la sección 5.1 de la guía. Registra la decisión en el log del PRD, busca con `grep` todos los artefactos que la mencionan, actualízalos en el mismo cambio y ejecuta `python3 scripts/check_docs.py`.
- **Números**: no escribas a mano totales de horas ni conteos copiados de otro documento; calcúlalos con `scripts/check_docs.py`.
- **Backlog**: incluye como tickets las tareas que no son código (medir líneas base, etiquetar golden sets, verificaciones externas) y revisa las prioridades después de dividir o fusionar historias.
- **Antes de cada entrega**, ejecuta la revisión de consistencia con `docs/prompts/consistency-review.md`.
