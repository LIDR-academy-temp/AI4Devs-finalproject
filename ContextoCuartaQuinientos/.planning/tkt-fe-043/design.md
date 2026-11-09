[← index](_index.md) | [← spec](spec.md) | [ANM-BE-027](../tkt-anm-be-027/design.md)

# design.md — FE-043: Anuncios (Admin + Residente)

## Estrategia técnica

REST vía `apiClient` (sin Apollo). Dos rutas React Router v6; hooks por rol reutilizando patrón `useCasasAdmin`. Admin: tabla + modal (estado local, validación mínima inline — alineado a `AdminCasasPage`; Zod opcional en iteración). Residente: lista + ruta detalle `/anuncios/:id` con `PATCH visto` en `useEffect` al montar detalle.

**Dependencia dura:** contrato [ANM-BE-027](../tkt-anm-be-027/design.md) desplegado o mockeado en dev.

### Escalera

| Capacidad | Peldaño | Objeto |
|-----------|---------|--------|
| Listar comunicados | 3 | Hooks + páginas nuevas |
| Publicar admin | 3 | `AdminAnunciosPage` + `apiPost` |

## frontend:cuartaquinientos-web

### Tipos (`Web/src/shared/types/anuncios.ts`)

Alineados a `AnuncioListItemDto`, `AnuncioCrearRequest`, `TipoAnuncioItemDto`.

### Hooks (`Web/src/features/anuncios/`)

| Hook | API |
|------|-----|
| `useAnunciosResidente()` | `GET /ANM/Anuncios` |
| `useAnuncioDetalle(id)` | `GET /ANM/Anuncios/{id}` + `PATCH …/visto` on mount |
| `useAnunciosAdmin(incluirNoVigentes)` | `GET /ANM/Anuncios?incluirNoVigentes=true` |
| `useTiposAnuncio()` | `GET /ANM/TiposAnuncio` |

### Páginas

| Archivo | Ruta | Comportamiento |
|---------|------|----------------|
| `AnunciosPage.tsx` | `/anuncios` | Lista + links a detalle; badge “Nuevo” si `!visto` |
| `AnuncioDetallePage.tsx` | `/anuncios/:id` | Contenido; loading/error |
| `AdminAnunciosPage.tsx` | `/admin/anuncios` | Tabla; modal alta/edición; delete confirm |

### Navegación

- `appNavigation.ts`: `{ path: '/anuncios', label: 'Anuncios', residentOnly: true, implemented: true }`
- Admin: `{ path: '/admin/anuncios', … implemented: true }` (reemplaza placeholder)

### `App.tsx`

```txt
PrivateRoute: /anuncios, /anuncios/:id
AdminRoute: /admin/anuncios
```

## Contrato API (congelado para FE)

| Método | Ruta | Body |
|--------|------|------|
| GET | `/ANM/Anuncios` | — |
| GET | `/ANM/Anuncios?incluirNoVigentes=true` | admin |
| GET | `/ANM/Anuncios/{id}` | — |
| PATCH | `/ANM/Anuncios/{id}/visto` | `{}` |
| POST | `/ANM/Anuncios` | `{ titulo, contenido, tipoAnuncio, vigenteHasta? }` |
| PUT | `/ANM/Anuncios/{id}` | parcial |
| DELETE | `/ANM/Anuncios/{id}` | — |
| GET | `/ANM/TiposAnuncio` | — |

## Contenido configurable

Textos de UI en componentes (ARB): “No hay comunicados vigentes”, “Nuevo”, títulos de columna — sin catálogo backend.

## Orden de implementación

| # | Paso | Verificación |
|---|------|--------------|
| 1 | Tipos + hooks | `tsc` |
| 2 | `AnunciosPage` + detalle | manual residente |
| 3 | `AdminAnunciosPage` | manual admin |
| 4 | Nav + rutas | sidebar test |
| 5 | Vitest | `npm test` |

## Plan de pruebas

| Prueba | Tipo | CA |
|--------|------|-----|
| `AppSidebar.test.tsx` | extend | CA-4 residente/admin links |
| `AnunciosPage.test.tsx` | Vitest + mock fetch | lista vacía muestra mensaje |
| Manual | smoke | CA-1..3 |

**TC-ERR-1:** error API → mensaje `problem.detail` visible.

## Pasada adversarial (design)

| # | Objeción | Resolución |
|---|----------|------------|
| F1 | Doble PATCH en StrictMode | `useRef` guard o ignorar 204 duplicado |
| F2 | Admin sin tipos seed | Modal deshabilitado + texto “Sin tipos configurados” |

**Veredicto:** APROBADO para `/ejecutar` tras ANM-BE-027.

## Pre-mortem

API antigua sin reiniciar → 404 en `/visto`; documentar reinicio GraphApi en impl.md.
