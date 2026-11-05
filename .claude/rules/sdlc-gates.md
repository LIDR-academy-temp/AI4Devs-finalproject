# Compuertas del AI SDLC y gestión de cambios

Sigue `docs/ai-sdlc-claude-code-openspec.md` y `docs/sdlc-checklist.md` sin esperar a que el usuario lo pida.

- **Antes de iniciar una fase**, revisa la compuerta anterior en `docs/sdlc-checklist.md`. Si tiene casillas abiertas, dilo y propón cerrarlas antes de continuar; no avances en silencio.
- **Después de redactar o cambiar el PRD**, propón la revisión adversarial con `docs/prompts/adversarial-prd.md` antes de pasar a la arquitectura. Lo mismo con la arquitectura y `docs/prompts/adversarial-architecture.md`.
- **Épicas**: el PRD debe definirlas (3 a 5, cada una con su capability de OpenSpec) antes de escribir historias.
- **ADRs**: nunca reescribas un ADR aceptado. Para una decisión nueva, crea un ADR que lo reemplace y cambia el estado del anterior a "reemplazada por ADR-X". Para una aclaración que no cambia la decisión, agrega una entrada con fecha en "Historial de cambios".
- **Cambio de decisión**: aplica la propagación de la sección 5.1 de la guía. Registra la decisión en el log del PRD con un `D-xx` nuevo (y marca como reemplazada la anterior), cita el `D-xx` en cada frase que la aplique, busca con `grep` todas sus apariciones, actualiza hacia abajo y hacia arriba (empezando por el documento más antiguo) en el mismo cambio y ejecuta `python3 scripts/check_docs.py`.
- **Números**: no escribas a mano totales de horas ni conteos copiados de otro documento; calcúlalos con `scripts/check_docs.py`.
- **Backlog**: incluye como tickets las tareas que no son código (medir líneas base, etiquetar golden sets, verificaciones externas) y revisa las prioridades después de dividir o fusionar historias.
- **Contratos de ticket**: cada ticket nuevo o modificado declara `Expone` y `Consume`; si consume algo, depende del ticket que lo expone. El orden de construcción se ajusta a las dependencias, no al revés.
- **Revisión de consistencia**: aplica el criterio de parada de la sección 5.3 de la guía. Si encuentras un tipo de error que un script puede detectar, agrega la comprobación a `scripts/check_docs.py` con una prueba de mutación en `scripts/test_check_docs.py` antes de otra pasada manual.
- **Antes de cada entrega**, ejecuta la revisión de consistencia con `docs/prompts/consistency-review.md`.
