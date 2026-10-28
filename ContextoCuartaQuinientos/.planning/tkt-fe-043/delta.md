# Delta: tkt-fe-043-anuncios-ui

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Rutas residente `/anuncios` y `/anuncios/:id`: lista comunicados vigentes, badge «Nuevo» si `visto === false`, detalle con contenido completo.
- Al abrir detalle: `GET /ANM/Anuncios/{id}` y `PATCH /ANM/Anuncios/{id}/visto` (error visible si falla el PATCH).
- Ruta admin `/admin/anuncios`: tabla (título, tipo, publicación, vigencia), modal alta/edición, baja con confirmación y mensaje de error en fallo.
- Sidebar: **Anuncios** activo para residente (`/anuncios`) y administrador (`/admin/anuncios`).
- Hooks REST en `features/anuncios/useAnuncios.ts` (sin Apollo).

## Comportamiento modificado

- (Antes): ítem Anuncios en nav con `implemented: false`; sin pantallas ANM en SPA.
- (Después): módulo ANM consumible en web vía JWT y `apiClient`, alineado a [ANM-BE-027](../tkt-anm-be-027/delta.md).

## Comportamiento eliminado

- Ninguno.

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | No aplica (solo frontend) |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Consumidor únicamente (sin cambios en API) |

## Frontend afectado

| Ruta / artefacto | Acción |
|------------------|--------|
| `Web/src/pages/AnunciosPage.tsx` | Creado |
| `Web/src/pages/AnuncioDetallePage.tsx` | Creado |
| `Web/src/pages/AdminAnunciosPage.tsx` | Creado |
| `Web/src/features/anuncios/useAnuncios.ts` | Creado |
| `Web/src/shared/types/anuncios.ts` | Creado |
| `Web/src/App.tsx`, `appNavigation.ts` | Modificado |
| `AnunciosPage.test.tsx`, `useAnuncios.test.ts` | Creado / extendido |

## Para el reviewer

- **Qué se hizo**: UI de anuncios (residente + admin) sobre REST ANM-BE-027.
- **Por qué**: HU-ANM-01 / HU-ANM-02 en entrega módulos.
- **Riesgo**: Bajo — solo cliente; depende de API y seed `DB-003` tipos.
- **Qué probar**: Login admin → `/admin/anuncios` CRUD; login residente → `/anuncios` + detalle (desaparece «Nuevo» tras lectura); `npm test` (excl. smoke sin API).
- **Rollback**: Revertir PR Web; nav vuelve a deshabilitar Anuncios si se revierte `appNavigation`.

## Aprendizajes

- CA E2E admin↔residente sustituidos en CI por Vitest con mock `apiClient` (mismas rutas/contrato); smoke `fase1Routes` sigue opcional con API en `:5180`.

## Decisiones (ADR)

- REST `apiClient` para ANM (no GraphQL en este módulo), coherente con readme y ANM-BE-027.
