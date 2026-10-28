# Delta: tkt-sgr-fe-001-navegacion

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Sidebar dinámico: `NavegacionProvider` + `useNavegacionMenus` → `GET /SGR/Navegacion/menus`; árbol → grupos/ítems (`menuToNav`).
- Sin filas en menú API: fallback a `APP_NAV` estático por perfil.
- `NavMenuGuard`: si menú API activo (`tree.length > 0`), rutas no listadas → `/403` (`ForbiddenPage`).
- Pantallas admin: `/admin/menus` (árbol + CRUD), `/admin/perfiles`, `/admin/perfiles/:id/permisos`.
- `refetch` de navegación tras guardar permisos de menú por perfil.

## Comportamiento modificado

- (Antes): `AppSidebar` solo `appNavigation.ts` estático.
- (Después): `AppSidebar` lee `useNavegacion()`; rutas envueltas en `NavMenuGuard` en `App.tsx`.

## Comportamiento eliminado

- Ninguno.

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | N/A (consumo API) |

## Endpoints API afectados (consumo + add-on)

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/SGR/Navegacion/menus` | GET | Consumido (sidebar) |
| `/SGR/Menus/admin` | GET/POST/PUT/DELETE | Consumido (admin menús) |
| `/SGR/Perfiles/admin` | GET | **Add-on BE** (listado perfiles SPA) |
| `/SGR/Perfiles/{id}/permisos-menus` | GET/PUT | Consumido |

Contrato: [TKT-SGR-BE-030-APIS.md](../tkt-sgr-be-030/TKT-SGR-BE-030-APIS.md).

## Para el reviewer

- **Qué se hizo**: SPA con navegación JWT, admin SGR menús/permisos y guard 403.
- **Por qué**: [[SGR-FE-001]] tras [[SGR-BE-030]].
- **Riesgo**: **Medio** — CA-1/CA-2 E2E deferidos a DB-006; pre-seed sidebar sigue estático.
- **Qué probar**: Vitest 179; login admin → `/admin/perfiles` lista; `/admin/menus`; tras DB-006, sidebar y guard.
- **Rollback**: revert Web + GraphApi add-on `Perfiles/admin`.

## Aprendizajes

- No usar `GET /SGR/Perfiles` legacy desde React (`vsPerfiles` / columna `Perfil`).

## Decisiones (ADR)

- **ADR-SGR-FE-001-1**: Escalar verificación CA-1/CA-2 a DB-006 con código listo (2026-10-27).
