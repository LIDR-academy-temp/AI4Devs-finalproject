# Delta: tkt-fe-ux-004-admin-mobile-cards-toasts

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Listas admin en móvil (`<768px`): `AdminMobileCard` + `AdminMobileCardList` alimentadas por el mismo `filteredRows` que la tabla.
- `useQueryErrorToast`: errores de carga de listado → `toast.error` (sin banner superior).
- Mappers por dominio: `CasaAdminMobileCard`, `UsuarioAdminMobileCard`, `TicketAdminMobileCard`.
- CSS: `.cq-admin-table-pane` oculta tabla en móvil; estilos `.cq-admin-mobile-card*`.

## Comportamiento modificado

- **(Antes):** Pilotos Casas/Usuarios/Tickets — solo tabla con scroll horizontal en móvil; errores de listado con `alert` dismissible arriba.
- **(Después):** Cards + toolbar de filtro global en móvil; toasts para listado y feedback de mutaciones en esas 3 pantallas; `formError` / errores en panel lateral sin cambio.

- **(Antes):** `AdminFilterableTable` — `table-responsive` siempre visible.
- **(Después):** Wrapper `cq-admin-table-pane` oculto en breakpoint móvil admin.

## Comportamiento eliminado

- Banners dismissibles de error de listado en `AdminCasasPage`, `AdminUsuariosPage`, `AdminTicketsPage`.
- `actionError` banner en Usuarios (sustituido por toast en toggle activo).

## Objetos SQL afectados

N/A.

## Endpoints API afectados

N/A.

## Para el reviewer

- **Qué se hizo:** Cards móvil y toasts en admin Casas, Usuarios y Tickets.
- **Por qué:** FE-UX-004 / AC9 diferido de FE-UX-001.
- **Riesgo:** Bajo — solo `Web/`; resto de `Admin*` sigue con tabla-only hasta Should futuro.
- **Qué probar:** Viewport 375px en 3 rutas; filtro global; error API listado → toast; editar en panel sigue mostrando errores inline.
- **Rollback:** Revertir commits `Web/` + contexto.

## Aprendizajes

- Duplicar fila tabla+card en DOM es aceptable en tests (usar `getAllBy*`); CSS oculta tabla en móvil sin tocar paneles.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | Cards hermanas de `AdminFilterableTable`, no props genéricas en tabla | Refactor tabla a componente genérico `<T>` | Menor diff; mappers por feature |
| 2026-10-27 | `useQueryErrorToast` con dedupe por mensaje | Banner persistente | Spec M3; re-toast al cambiar error |

## Diferido (Should spec)

- Rollout cards + toasts al resto de pantallas `Admin*` con `AdminFilterableTable`.
