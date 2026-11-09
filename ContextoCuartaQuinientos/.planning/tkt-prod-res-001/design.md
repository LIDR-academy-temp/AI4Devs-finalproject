[← spec](spec.md) | [index](_index.md) | [impl →](impl.md)

# design.md — PROD-RES-001

## Estrategia

Retro-documentación de fixes mínimos ya aplicados en código; despliegue prod **GraphApi → Web → SQL menú** (SQL menú puede ir en paralelo con Web si se usa `supplementApiNavWithManifest`).

## Encuestas Web

- Reutilizar patrón admin `encuestaMappers` / `normalizeEncuestaListItem` en hooks y páginas residente.
- `encuestaQuestionTypes.ts`: `esPreguntaTextoLibre` — `tipoPregunta` contiene «texto» (case insensitive).

## Encuestas API

- `CuartaEncuestasRepository`: incluir `o.Orden` en `GROUP BY` al agregar votos por opción.

## Tickets API

- `TicketCatalogoRepository.ResolveCanalIdAsync` → `Task<int?>`; `null` si no hay tabla `tkt.CanalesTicket`.
- `CuartaTicketService` / admin: capturar `NotSupportedException` en notificación admins (no rollback ticket).

## Navegación Web

- `supplementApiNavWithManifest(apiNav, staticItems, staticGroups)`: añade rutas del manifest faltantes en árbol API; grupo resuelto por hermano (p. ej. `/areas-comunes` → `menu-{id}` Mi Comunidad).
- `allowedPaths` incluye rutas suplementadas para `NavMenuGuard`.

## SQL menú visitas

- Script idempotente tipo `20261029_vts_areas_menus_y_seed.sql`: MERGE `sgr.Menus` ruta `/visitas/pases` + `sgr.PerfilMenus` Residente.

## Auth (comportamiento)

| Evento | Resultado |
|--------|-----------|
| Carga SPA sin cookie `rt` | `refreshOnce()` → 401 → login OK |
| Tras login, F5 con `rt` válido | 200 → sesión restaurada |
| Prod sin `sgr.RefreshTokens` | Login OK; refresh siempre 401 hasta DB-009 |

## Riesgos

- Prod con API viejo: tickets/resultados siguen en 500 hasta deploy GraphApi.
- Solo SQL sin Web: menú depende de BD; Web supplement mitiga omisiones SGR.

## Plan de pruebas (ejecutado local)

| ID | Verificación |
|----|----------------|
| T-1 | Vitest encuestas residente + `menuToNav.test` supplement |
| T-2 | `CuartaTicketServiceTests`, tests encuestas GraphApi |
| T-3 | `tsc --noEmit` Web |
