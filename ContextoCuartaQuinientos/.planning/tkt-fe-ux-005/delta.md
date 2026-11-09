# Delta: tkt-fe-ux-005-admin-mobile-rollout

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Rollout FE-UX-004 a **9** listados admin con `AdminFilterableTable`: Anuncios, Encuestas, Archivos, Tipos de documento, Juntas, Visitas, Vehículos, Mascotas, Perfiles.
- Cards por dominio: `AnuncioAdminMobileCard`, `EncuestaAdminMobileCard`, `ArchivoAdminMobileCard`, `TipoArchivoAdminMobileCard`, `JuntaAdminMobileCard`, `VisitaAdminMobileCard`, `VehiculoAdminMobileCard`, `MascotaAdminMobileCard`, `PerfilAdminMobileCard`.
- `useTiposArchivo` expone `error` para alinear toast de listado en Tipos de documento.
- Tests Vitest: toast de error de listado por página; `Web/src/test/stubToast.ts` para mocks centralizados.

## Comportamiento modificado

- **(Antes):** Esas 9 pantallas — tabla con scroll horizontal en móvil; varias con `alert alert-danger alert-dismissible` para error de carga de listado.
- **(Después):** Tabla + `AdminMobileCardList` con el mismo `filteredRows`; `useQueryErrorToast` (y `toast.success` en mutaciones CRUD); errores de panel/`ConfirmDialog` sin cambio.

- **(Antes):** `useTiposArchivo` — fallo API silenciado (`console.warn`, lista vacía).
- **(Después):** `error` en hook + toast; empty state solo si `!error`.

- **(Antes):** `AdminAlmacenPage` — banners dismissibles por tab al fallar inventario o préstamos.
- **(Después):** `useQueryErrorToast` por hook; sin cards móvil (Could cards sigue diferido).

- **(Antes):** Toggle activa/cerrada en Juntas sin feedback de éxito.
- **(Después):** `toast.success` («Junta activada» / «Junta cerrada»).

## Comportamiento eliminado

- Banners dismissibles de error de **listado** en las 9 páginas del Must.
- Banners dismissibles de error de listado en `AdminAlmacenPage` (tabs inventario y préstamos).

## Objetos SQL afectados

N/A.

## Endpoints API afectados

N/A.

## Para el reviewer

- **Qué se hizo:** Cards móvil + toasts en 9 admin restantes (completa Must de FE-UX-004 Should).
- **Por qué:** FE-UX-005 — paridad UX admin en móvil fuera de pilotos.
- **Riesgo:** Bajo — solo `Web/`; sin contratos API.
- **Qué probar:** Viewport ~375px en rutas `/admin/anuncios`, encuestas, archivos, tipos, juntas, visitas, vehículos, mascotas, perfiles; filtro global; error API → toast; guardar inválido en panel → error inline.
- **Rollback:** Revertir commits `Web/` + contexto.

## Aprendizajes

- Hook de datos debe exponer `error` si la página usa `useQueryErrorToast` (TiposArchivo).
- Matriz M4: un test `toast.error` por página evita regresión de banners.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-10-27 | `stubToast.ts` importado por tests de página | Mock global en `setup.ts` | No romper `ToastContext.test.tsx` |

## Diferido (Could / Should)

- `toast.success` en toggle activa/inactiva Juntas (Should) — entregado en follow-up mismo día.
- `AdminAlmacenPage`, `AdminMenusPage`, `FinanzasAdminPage` — entregado en follow-up (cards/toasts).
- Residente + modo oscuro + onboarding ([[FE-UX-001]] Could) → [[FE-UX-006]] ([delta](../tkt-fe-ux-006/delta.md)); no forma parte de este delta.
