[← index](_index.md) | [design →](design.md)

# spec.md — FE-PAT-001: Patrones UI admin (paridad Web_diseño)

## 0. Documentos de entrada

| Documento | Ubicación |
|-----------|-----------|
| Contexto requerimiento | Investigación chat 2026-10-23 + `Web_diseño/Web/Views/Admin/*.cshtml` |
| Contexto técnico | `referencia/ui-referencia-visual.md`, `Web/src/index.css`, FE-UX-001 |
| Mockup | Referencia: `Web_diseño` — **Fase 1:** patrones Tailwind mínimos. **Paridad visual completa (split + Bootstrap):** ver [[FE-PAT-002]] |

## 1. User story

**Como** administrador o residente del portal,  
**quiero** pantallas con la misma jerarquía visual que el prototipo MVC (título, contexto, alertas, acciones claras),  
**para** operar CRUD sin sensación de “pantalla a medias” y sin depender de `prompt` del navegador.

## 2. Alcance MoSCoW

### Must

- Componentes compartidos en `Web/src/shared/components/admin/` (o `ui/` si ya existe convención):
  - `PageHeader` (título, descripción, slot acciones).
  - `SectionHero` (equivalente funcional a card hero Web_diseño).
  - `AlertBanner` (success / error / warning dismissible).
  - `FormModal` (dialog accesible: `role="dialog"`, `aria-modal`, `aria-labelledby`).
  - `ConfirmDialog` (reemplazo de `window.confirm`).
  - `AdminDataTable` shell (thead + empty + loading skeleton; celdas vía children).
  - `EmptyState` (icono + mensaje + CTA opcional).
- Guía en `design.md` con clases Tailwind canónicas (sin nuevos colores fuera de `@theme`).
- **Piloto obligatorio:** refactor visual de **una** pantalla admin existente (`AdminCasasPage`) usando solo patrones nuevos (sin cambiar contrato API).
- Tests Vitest de componentes críticos (`FormModal`, `ConfirmDialog`, `PageHeader`).

### Should

- `ResponsiveTable`: patrón tabla desktop + cards móvil (ADR FE-UX-001).
- Story o página dev interna `/dev/patterns` (solo dev, no en menú producción) — opcional si no hay tiempo.

### Won’t (este ticket)

- Migrar todas las pantallas (van en FE-CRUD-*).
- Menús dinámicos SGR (SGR-FE-001).

## 3. Criterios de aceptación

| ID | Criterio |
|----|----------|
| CA-1 | `AdminCasasPage` usa `PageHeader`, `SectionHero`, `FormModal`, `AlertBanner`; sin `window.prompt` en edición (form en modal o drawer). |
| CA-2 | Modal cumple a11y mínima (focus trap básico o documentado si se difiere). |
| CA-3 | `npm test` + `tsc --noEmit` + `vite build` verdes. |
| CA-4 | Documentación en design.md lista “cómo migrar una pantalla” en ≤10 pasos. |

## 4. Invariantes

- INV-PAT-1: No cambiar paleta Pantone (`index.css` @theme).
- INV-PAT-2: No nueva dependencia UI (Radix/shadcn/Bootstrap) **en fase 1** — ver [[FE-PAT-002]] para Bootstrap scoped en piloto Casas.

## 5. TKTs relacionados

- [[FE-UX-001]] · [[FE-CRUD-001]] · [[SGR-FE-001]]

## 6. Pasada adversarial (resumen)

- Riesgo: sobre-abstracción → **mitigación:** solo 6–7 componentes, piloto en una página.
- Riesgo: duplicar `RegistrarPagoModal` → **mitigación:** evaluar extender modal existente en design.

**Veredicto:** APROBADO para `/diseñar` y `/ejecutar`.
