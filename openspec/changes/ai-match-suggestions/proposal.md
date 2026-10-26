# Proposal

> **Nota de planificación:** este change pertenece a la entrega E3 (2026-11-11). Solo tiene `proposal.md`; completar `specs/`, `design.md` y `tasks.md` con `/opsx:continue` cuando los changes de E2 estén archivados y existan las specs principales en `openspec/specs/`.

## Why

Tras los niveles determinísticos quedan partidas que un humano resuelve combinando pistas débiles: una referencia parecida, un desfase inusual, un lote partido en dos abonos. Un modelo de lenguaje puede proponer esos cruces con una explicación legible y dejar la decisión al analista, acelerando los casos difíciles sin arriesgar falsos positivos automáticos (HU-09, readme §1.2 nivel 4 y §6.2 TK-20, PRD RF-35..RF-37, §10).

## What Changes

- Acción "Sugerir con IA" sobre los pendientes de una conciliación: el backend pre-filtra candidatos (ventana de fechas, ±15 % del monto), procesa en bloques de hasta 50 movimientos, envía solo campos no sensibles y pide una respuesta JSON estructurada con los cruces propuestos, confianza y explicación.
- Validación estricta de la respuesta: se descartan propuestas con identificadores inexistentes, transacciones ya cruzadas o combinaciones rechazadas previamente; la diferencia se recalcula en el backend.
- Las propuestas se persisten como cruces de método AI en estado PROPOSED y nunca se confirman solas.
- Pestaña Propuestas enriquecida: tarjetas con ambos lados, diferencia, confianza, explicación y botones Aceptar / Rechazar (reutiliza confirmar/rechazar de `manual-matching`).
- Manejo de errores: timeout de 60 s, un reintento, mensaje amigable si el servicio no responde; el resto de la aplicación no se ve afectado.
- El prompt se documenta en `prompts.md`.

## Capabilities

### New Capabilities
- `ai-match-suggestions`: generación de propuestas de cruce asistidas por IA para transacciones pendientes, con pre-filtrado, validación de la respuesta, persistencia como propuestas y revisión humana obligatoria.

### Modified Capabilities
- `results-dashboard`: la pestaña Propuestas muestra tarjetas con explicación y confianza y la acción de solicitar sugerencias. Nota: la spec existirá tras archivar `results-and-manual-matching`.

## Impact

- **HU:** HU-09. **Tickets:** TK-20 (8 SP). **RF:** RF-35, RF-36, RF-37. **RNF:** RNF-08, RNF-09, RNF-11. **Métrica:** tasa de aceptación de sugerencias ≥ 60 % (PRD §11.1).
- **Endpoints:** `POST /reconciliations/{id}/ai-suggestions`.
- **Código:** `apps/api/src/ai/`, `apps/api/src/matching/` (persistencia de propuestas AI), `apps/web/src/features/results/` (tarjetas).
- **Coste:** medir tokens por bloque de 50 movimientos y documentar el coste por conciliación (decisión abierta nº 6 del PRD).
