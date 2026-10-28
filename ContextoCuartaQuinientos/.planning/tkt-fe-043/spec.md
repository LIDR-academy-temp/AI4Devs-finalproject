[← index](_index.md) | [design →](design.md)

# spec.md — FE-043: Anuncios (Admin + Residente)

> **Tipo:** Feature

## User story

Como **residente**, quiero ver los comunicados del fraccionamiento ordenados por fecha y marcarlos como leídos, para enterarme sin usar WhatsApp (HU-ANM-01).

Como **administrador**, quiero publicar y administrar anuncios desde la web, para comunicar avisos oficiales (HU-ANM-02).

## Contexto / problema

| Tipo | Fuente |
|------|--------|
| Requerimiento | readme HU-ANM-01..02; nav §1.3 (Residente: Anuncios; Admin: Anuncios); [ENTREGA_MODULOS.md](../ENTREGA_MODULOS.md) |
| Técnico | [ANM-BE-027](../tkt-anm-be-027/spec.md); [specs/anuncios.md](../../specs/anuncios.md) |
| Mockup | Patrón admin: `AdminUsuariosPage` / `AdminCasasPage`; residente: lista tipo `TicketsPage` + detalle simple |

**Actual:** ítem sidebar **Anuncios** en `appNavigation.ts` con `implemented: false` y sin rutas.

**Esperado:** pantallas consumiendo solo endpoints JWT de ANM-BE-027 (sin legacy).

## Alcance (MoSCoW)

### Must — Residente

- Ruta `/anuncios` bajo `PrivateRoute` (no admin-only).
- Lista: título, tipo, fecha publicación, indicador leído/no leído (`visto` del DTO).
- Detalle (ruta `/anuncios/:id` o panel expandible): contenido completo; al abrir detalle llamar `PATCH /ANM/Anuncios/{id}/visto`.
- Estados loading / error / vacío (“No hay comunicados vigentes”).

### Must — Administrador

- Ruta `/admin/anuncios` bajo `AdminRoute`.
- Tabla de anuncios (título, tipo, publicación, vigencia); opción `incluirNoVigentes` si API lo expone.
- Alta/edición: modal o formulario — título, contenido (textarea), select `tipoAnuncio` desde `GET /ANM/TiposAnuncio`, `vigenteHasta` opcional (date).
- `POST` / `PUT` / `DELETE` según ANM-BE-027; confirmación en baja.
- Habilitar enlace sidebar **Anuncios** (`implemented: true`) para admin; añadir **Anuncios** en nav residente.

### Should

- Badge “nuevo” en filas con `visto === false` en lista residente.
- Tras publicar, refrescar lista admin sin recargar página completa.

### Won't

- Editor rich-text / adjuntos.
- Estadísticas de lecturas en UI (Could backend).
- GraphQL / Apollo para este módulo (REST `apiClient` como USR).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | `pages/AnunciosPage.tsx`, `pages/AdminAnunciosPage.tsx`, `features/anuncios/*`, `appNavigation.ts`, `App.tsx` |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | Sin endpoints `*/legacy` ni headers `UserID` | ENTREGA_MODULOS |
| INV-2 | Residente no accede `/admin/anuncios` | AdminRoute |
| INV-3 | Token vía `apiClient` / sesión auth | FE-030 |

## Criterios de aceptación

- [x] **CA-1 [M]**: Admin publica anuncio → visible en `/admin/anuncios` y en `/anuncios` como residente (otra sesión o usuario).
- [x] **CA-2 [M]**: Residente abre detalle → `PATCH visto`; al volver a lista el ítem aparece como leído.
- [x] **CA-3 [M]**: Admin elimina (soft) → deja de aparecer en lista residente tras refetch.
- [x] **CA-4 [M]**: Sidebar admin muestra **Anuncios** activo; residente ve **Anuncios** y no ve rutas `/admin/*`.
- [x] **CA-5 [M]**: `tsc --noEmit` + `npm test` + `vite build` verdes; al menos 1 test Vitest (nav o página lista).

## Reutilización detectada

- Layout: `AppShell` + hooks patrón `useCasasAdmin` / `usePadronUsuarios`.
- API: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPatch` en `apiClient.ts`.

## Definition of Ready

- [x] Independent — depende ANM-BE-027 documentado; shell ya implementado
- [x] Negotiable — Should badge negociable
- [x] Valuable — segundo módulo ola ENTREGA_MODULOS
- [x] Estimable
- [x] Small — dos pantallas, un dominio
- [x] Testable

## Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| FE antes de API | Alta | Bloquear `/ejecutar` hasta ANM-BE-027 en rama integrada |
| Contenido largo en móvil | Baja | `prose` / scroll en detalle |

## Preguntas abiertas

- ¿Zod + react-hook-form obligatorio en admin? `(asumido: sí, alineado FE-041 spec original; implementación actual AdminUsuarios usa estado local — design puede unificar mínimo Zod en admin anuncios)`.

## Pasada adversarial (/abogado-del-diablo)

| # | Objeción | Resolución |
|---|----------|------------|
| B1 | CA-1 requiere dos usuarios | Test manual o Vitest mock API; E2E opcional |
| B2 | Auto `PATCH` al scroll lista | Solo en detalle, no en listado |
| B3 | Admin también ve `/anuncios` | Admin puede usar bandeja admin; no Must duplicar |

**Veredicto:** APROBADO para `/diseñar` tras [[ANM-BE-027]].

## Agentes previstos

- `desarrollador-react`, `frontend-tester`, `git-frontend`
