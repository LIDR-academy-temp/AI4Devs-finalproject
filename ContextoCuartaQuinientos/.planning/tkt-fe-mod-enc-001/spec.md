[← index](_index.md) | [design →](design.md)

# spec.md — FE-MOD-ENC-001: Módulo encuestas (paridad Web_diseño)

## Problema

El admin actual trata la encuesta como **un formulario único** (título + una pregunta con opciones en texto). El diseño acordado (`Web_diseño`) define **tres superficies admin**:

1. **Bandeja** — listado, filtro “solo activas”, panel lateral solo **metadatos** (título, descripción, vigencia, activa).
2. **Detalle** — ruta dedicada para **preguntas y opciones** (tipos de catálogo, orden, requerida).
3. **Resultados** — agregados por pregunta (ya existe ruta; alinear visual).

## Objetivo

Entregar el módulo encuestas admin (y ajustes residente mínimos si bloquean CA) con **mismo flujo** que `Web_diseño`, usando **patrón CuartaQuinientos** (`cq-admin`, AppShell), sin endpoints legacy con headers `UserID`/`WindowName`.

## Alcance Must

### Admin

| ID | Historia | Criterio |
|----|----------|----------|
| M-1 | Bandeja | `/admin/encuestas`: tabla (título, inicio, fin, estado); checkbox “Solo activas”; KPIs encuestas/activas/con fechas. |
| M-2 | Metadatos | Panel lateral **solo** datos de `enc.Encuestas` (crear/editar); **sin** capturar preguntas ahí. |
| M-3 | Acciones fila | Íconos/enlaces: **Preguntas** → detalle; **Resultados** → `/admin/encuestas/:id/resultados`; **Editar** → panel metadatos; **Eliminar** con confirmación. |
| M-4 | Detalle | `/admin/encuestas/:id` (o `/preguntas`): listar preguntas; alta/edición/baja pregunta; alta/edición/baja opción (tipos que requieren opciones). |
| M-5 | Publicar | Acción explícita **Publicar** (o toggle activa alineado a INV-1): `PUT .../publicar` o equivalente documentado; no confundir con “guardar metadatos”. |
| M-6 | Resultados | Mejorar `ResultadosEncuestaPage` con hero + barras/chips como `ResultadosEncuesta.cshtml` (solo lectura). |

### Residente (mínimo para CA)

| ID | Historia | Criterio |
|----|----------|----------|
| R-1 | Listar | `/encuestas`: activas + vigencia; badge “Ya respondiste”. |
| R-2 | Responder | `/encuestas/:id`: una pregunta por tipo; envío único (INV-3). |

## Out of scope

- Bot Telegram (HU-BOT-13).
- Endpoints `ENC/*/legacy` y GraphQL ENC desde la SPA.
- Reordenar preguntas drag-and-drop (solo `Orden` numérico si el diseño lo pide).
- Nuevos tipos de pregunta fuera de `enc.TiposPregunta` existente.

## API (contrato esperado — verificar en design)

- Existente Cuarta: `GET/POST /ENC/Encuestas`, `GET /ENC/Encuestas/{id}`, `PUT /ENC/Encuestas/{id}/publicar`, `GET .../resultados`, `POST .../respuestas`, `GET /ENC/Encuestas/activas`.
- **Nuevo (delta ticket):** `PUT /ENC/Encuestas/{id}` (metadatos), `DELETE /ENC/Encuestas/{id}`; CRUD JWT de preguntas/opciones bajo rutas Cuarta (p. ej. `/ENC/Encuestas/{id}/preguntas`, `/ENC/Preguntas/{id}/opciones`) — detalle en [design.md](design.md).

## Criterios de aceptación

- **CA-1:** Admin crea encuesta (solo metadatos) → entra a detalle → agrega ≥2 preguntas (opción múltiple + texto) con opciones → publica → residente responde una vez.
- **CA-2:** Admin ve resultados con conteos/% coherentes con respuestas de prueba.
- **CA-3:** Editar metadatos y una pregunta no borra respuestas ya capturadas (soft delete / reglas INV-7).
- **CA-4:** Eliminar encuesta con confirmación; no aparece en listados admin ni activas.
- **CA-5:** Sin uso de `window.prompt`/`confirm`; Zod en formularios; `apiGet` desestructurado (`{ data, problem, status }`).

## Pasada adversarial (abogado del diablo)

| Riesgo | Mitigación en design |
|--------|----------------------|
| BE Cuarta sin PUT/DELETE/CRUD preguntas | Fase BE obligatoria antes de FE detalle |
| Publicar vs checkbox “Activa” en panel (INV-1) | Separar “Guardar” de “Publicar”; documentar en UI |
| Tipos pregunta por nombre vs ID hardcode | Resolver por catálogo `GET TiposPregunta` |
| Editar encuesta con respuestas | Bloquear delete de pregunta con respuestas o soft-delete only |
| Paridad visual hero `cq-reserva-hero` vs PAT toolbar | Hero opcional bajo toolbar en admin encuestas (design) |

**Veredicto:** APROBADO para `/diseñar` y revisión humana del design; **no ejecutar** hasta aceptar design + gap BE cerrado en plan.

## Instancias

| Target | Repo |
|--------|------|
| frontend | `Web/` |
| backend | `GraphApi/` |
