# Checklist de compuertas del AI SDLC

> Compuertas G0 a G3 de `docs/ai-sdlc-claude-code-openspec.md` (sección 3.1). No se inicia la fase siguiente con una compuerta abierta. G3 se repite antes de cada entrega. El estado refleja el proyecto al 2026-11-04.

## G0 — Descubrimiento cerrado

- [x] Restricciones documentadas: tiempo (30 h, tope 36 h), fechas de entrega y presupuesto de IA (`docs/vision.md` §7, `docs/prd.md` §10.1).
- [x] Datos de dominio que condicionan el diseño (empresas objetivo).
- [x] Spike de datos externos: plataformas de empleo y APIs disponibles (ADR-0002, ADR-0006). *Se hizo tarde, durante el PRD.*
- [x] Problema, usuario, competencia e hipótesis.
- [x] Cada métrica de la hipótesis dice cómo se mide.
- [x] Alcance etiquetado `MVP` / `v1.1` / `futuro` y lo que el producto no hará.

## G1 — PRD cerrado

- [x] Requisitos funcionales y no funcionales con identificador y prioridad MoSCoW.
- [x] Cada métrica indica el evento o campo que la registra (RNF-14).
- [x] Épicas (3 a 5) definidas en el PRD, cada una con su capability de OpenSpec. *Se agregaron tarde, después de los tickets.*
- [x] Cada requisito pertenece a una épica.
- [x] Log de decisiones en el PRD (§10.1) con identificadores `D-xx` citados en los documentos que los aplican.
- [x] Revisión adversarial con `docs/prompts/adversarial-prd.md`; cada hallazgo resuelto en `docs/prd-review.md`. *Se hizo tarde, después de los tickets.*

## G2 — Arquitectura cerrada

- [x] Arquitectura con diagramas, componentes, modelo de datos y API.
- [x] Decisiones relevantes como ADRs con estado.
- [x] Mapeo de épicas a módulos (`docs/architecture.md` §2.4.1).
- [x] `CLAUDE.md` con comandos, convenciones y definition of done.
- [x] Contexto de OpenSpec (`openspec/config.yaml`).
- [x] Revisión adversarial con `docs/prompts/adversarial-architecture.md`; hallazgos resueltos en `docs/architecture-review.md`. *Se hizo después de las historias y los tickets; obligó a propagar cambios.*

## G3 — Backlog y entrega consistentes

- [x] Historias por épica, cada una del tamaño de un cambio de OpenSpec, con criterios Given/When/Then.
- [x] Tickets técnicos y de producto con estimación, dependencias y contrato (`Expone` / `Consume`).
- [x] Orden de construcción derivado de las dependencias (verificado por `scripts/check_docs.py`).
- [x] Plan de entregas.
- [x] Prioridades revisadas tras dividir historias.
- [x] Ningún ADR aceptado contradice al PRD; los ADR reemplazados apuntan a su sustituto.
- [x] `python3 scripts/check_docs.py` en verde (totales, referencias y `readme.md` al día).
- [x] Revisión de consistencia con `docs/prompts/consistency-review.md` antes de la entrega (2026-11-04).
- [x] Criterio de parada (guía §5.3): `check_docs.py` en verde, decisiones cambiadas revisadas por su `D-xx` y una lectura completa por documento.
- [x] Cada comprobación de `check_docs.py` tiene una prueba de mutación en `scripts/test_check_docs.py`.
- [x] Contenido obligatorio de la Entrega 1 completo: ficha, descripción, arquitectura, modelo de datos, historias, tickets, stack y `prompts.md`. La URL del despliegue se agrega en la entrega final.
- [x] Formulario de Typeform enviado con el enlace a la rama (confirmado por el usuario el 2026-11-04).
