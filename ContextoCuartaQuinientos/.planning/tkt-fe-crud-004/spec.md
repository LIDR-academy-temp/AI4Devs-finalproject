[← index](_index.md) | [design →](design.md)

# spec.md — FE-CRUD-004: Residente — flujos completos (UX + CRUD propio)

> Generado por: **/definir**
> **Tipo:** Feature

## §0 — Documentos de entrada (gate)

| # | Documento | Ubicación |
|---|-----------|-----------|
| 1 | Contexto del requerimiento | `readme.md` §5 (historias residente), §1.3 (Tailwind, sidebar, flujos) |
| 2 | Contexto técnico | `ContextoCuartaQuinientos/specs/frontend.md`, dominios en `specs/{tickets,visitas-areas,anuncios,encuestas,juntas,archivos,finanzas,vehiculos,mascotas,usuarios}.md`, `CLAUDE.md` |
| 3 | Diseño visual | `ContextoCuartaQuinientos/referencia/ui-referencia-visual.md` (patrones Tailwind + kit admin sin Bootstrap en residente); referencia layout `Web_diseño/Web` donde exista paridad |

## User story

Como **residente** autenticado en la SPA, quiero **completar los flujos de mi día a día** (tickets, finanzas, comunidad, reservas y registro personal) con la misma fiabilidad de sesión y UX que el portal admin, para **no depender de hacks locales** (`localStorage` manual, descargas rotas) y cumplir las historias del readme.

## Contexto / problema

Las pantallas residente (`/tickets`, `/encuestas`, `/archivos`, etc.) existen con cobertura Vitest parcial, pero **no cerraron la oleada CRUD** del roadmap: mezclan estilos legacy, no reutilizan de forma consistente el kit `shared/components/admin` (sin importar Bootstrap en rutas residente) y hay **flujos rotos conocidos** — p. ej. `ArchivosPage` descarga con `localStorage.getItem('token')` en lugar del cliente HTTP con JWT/cookies alineado al resto de la app (`AuthContext` / `apiClient`).

El admin ya sigue [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md) ([[FE-CRUD-001]]–[[FE-CRUD-003]]). Este ticket **no** migra `/admin/*`; solo endurece **rutas residente** y CRUD de datos propios (vehículos, mascotas).

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra

- **M1 — Auth HTTP uniforme:** toda llamada y descarga residente usa `apiClient` / helpers que incluyen credenciales JWT (sin `localStorage` directo para token).
- **M2 — Tickets:** `TicketsPage` + `NuevoTicketPage` — listar mis tickets, crear ticket (Zod/RHF), estados vacío/carga/error; el nuevo ticket aparece en lista tras éxito (**CA-2**).
- **M3 — Reservas:** `AreasYReservacionesPage` — flujo crear reservación de área con validación de formulario y feedback de error API (**CA-1**).
- **M4 — Patrón UI residente:** Tailwind + tokens `index.css`; `PageHeader` / `AlertBanner` / `EmptyState` / `ConfirmDialog` / `FormModal` desde `shared/components/admin`; **prohibido** importar Bootstrap en páginas residente.
- **M5 — DoD por pantalla restante (checklist):** cada ruta residente del inventario cumple loading/error/empty y contrato API existente (sin endpoints `*/legacy`).

Inventario de rutas (orden de implementación en `design.md`):

| Página | Ruta | Modo |
|--------|------|------|
| TicketsPage / NuevoTicketPage | `/tickets`, `/tickets/nuevo` | Crear + listar |
| AreasYReservacionesPage | `/areas-comunes` | Reservar |
| MisVehiculosPage | `/mis-vehiculos` | CRUD propio (API residente existente) |
| MisMascotasPage | `/mis-mascotas` | CRUD propio |
| ArchivosPage | `/archivos` | Listar + descargar |
| AnunciosPage / AnuncioDetallePage | `/anuncios`, `/anuncios/:id` | Lectura + marcar visto si API lo expone |
| EncuestasPage / EncuestaDetallePage | `/encuestas`, `/encuestas/:id` | Responder (una vez) |
| JuntasPage / JuntaDetallePage | `/juntas`, `/juntas/:id` | Lectura |
| EstadoCuentaPage | `/finanzas/cuenta` | Solo lectura |
| PerfilPage | `/perfil` | Actualizar datos de contacto; cambio de contraseña si endpoint ya existe |

### Should — negociable si tiempo aprieta

- KPIs ligeros en cabecera (conteos) donde aporten contexto sin duplicar admin.
- Reutilizar `shared/components/resident/` solo si un layout diverge del patrón listado (decisión en `design.md`).

### Could — no bloquea

- Adjuntos en creación de ticket (readme Fase 2 / INV tickets).
- Smoke Playwright residente (delegable a [[FE-QA-001]]).

### Won't — fuera de alcance explícito

- Pantallas `/admin/*` (ya cubiertas por oleada CRUD admin).
- Nuevos endpoints o cambios de contrato API salvo bug bloqueante documentado en `impl.md` con ticket BE aparte.
- Bot Telegram, tema editable runtime, Bootstrap scoped en residente.
- Refactor global de `AppShell` / navegación ([[SGR-FE-001]] cerrado).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | Páginas, hooks y tests Vitest listados; posible helper de descarga en `shared/lib` |
| `backend:cuartaquinientos-api` | **Sin cambio por defecto** — consumir REST existente. Si falta endpoint para marcar anuncio visto o perfil, escalar antes de `/ejecutar` |
| `database:CuartaQuinientos` | No aplica |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Identidad del solicitante desde JWT (`sub`), nunca del body | `CLAUDE.md`, `specs/tickets.md` INV-7 |
| INV-2 | Ticket nuevo nace en estado **Nuevo**; transiciones solo vía API | `specs/tickets.md` |
| INV-3 | Reserva: sin solapamiento de horario; área con `RequiereReservacion` | `specs/visitas-areas.md` INV-2, INV-3 |
| INV-4 | Encuesta: una respuesta por residente (reglas API ENC) | `specs/encuestas.md` |
| INV-5 | Rutas residente protegidas por sesión (`PrivateRoute` / `RequireSessionRoute`) | `specs/frontend.md` |
| INV-6 | Menú dinámico: `NavMenuGuard` cuando hay menú API | `specs/frontend.md` [[SGR-FE-001]] |
| INV-7 | Sin `window.prompt` / `window.confirm` | Roadmap CRUD, PATRON admin |

## Criterios de aceptación

- [ ] **CA-1 [M]**: Reservación área común — **Dado** un residente autenticado y un área disponible en el listado API, **Cuando** envía una reserva válida (fechas/área) desde `AreasYReservacionesPage`, **Entonces** la UI confirma éxito y la reserva aparece en el listado del residente (o mensaje API claro si conflicto de horario).
- [ ] **CA-2 [M]**: Ticket nuevo — **Dado** un residente en `/tickets/nuevo`, **Cuando** envía título, categoría y descripción válidos, **Entonces** `POST` al API de tickets tiene éxito y el ticket es visible en `TicketsPage` sin recargar manualmente la sesión.
- [ ] **CA-3 [M]**: Descarga archivos — **Dado** un archivo listado en `/archivos`, **Cuando** el residente pulsa descargar, **Entonces** la petición usa el mismo mecanismo de auth que `apiClient` (no lectura directa de `localStorage` para el token) y obtiene el blob o muestra error con `problem.detail`.
- [ ] **CA-4 [M]**: DoD pantallas — **Dado** el inventario M5, **Cuando** se revisa cada ruta, **Entonces** cumple estados loading/error/empty y formularios con Zod donde hay alta/edición (tickets, reservas, vehículos, mascotas, perfil).
- [ ] **CA-R1 [M]**: Regresión navegación — **Dado** menú API poblado (DB-007), **Cuando** un residente sin permiso admin navega a `/admin/menus`, **Entonces** sigue redirigiendo a `/403` (sin cambio [[SGR-FE-001]]).
- [ ] **CA-R2 [M]**: Regresión admin — **Dado** un administrador, **Cuando** usa cualquier `/admin/*` ya migrado, **Entonces** el patrón CRUD admin no se degrada (smoke Vitest admin existente en verde).

## Reutilización detectada (evidencia de la escalera — regla 6)

- `apiClient` + `AuthContext` → todas las mutaciones y descargas.
- Kit `shared/components/admin` (`PageHeader`, `AlertBanner`, `FormModal`, `ConfirmDialog`, `EmptyState`) → residente sin Bootstrap.
- Hooks existentes: `useTickets`, `useJuntas`, `useEncuestas`, `useArchivos`, `useVisitas`, `useVehiculos`, `useMascotas` — extender, no duplicar.
- Patrón formulario: `LoginPage.tsx` + schemas Zod por dominio (como admin `*AdminSchemas.ts`).
- Tests: ampliar `*.test.tsx` ya presentes en `Web/src/pages/`.

## Definition of Ready

- [x] **I**ndependent — dependencias [[FE-PAT-002]], [[FE-CRUD-002]], [[FE-CRUD-003]], [[SGR-FE-001]] archivadas
- [x] **N**egotiable — fase Should/Could acotada arriba
- [x] **V**aluable — CA-1/CA-2 alineados a historias readme
- [x] **E**stimable — APIs existentes; riesgo acotado a gaps de endpoint (pregunta abierta anuncio visto)
- [ ] **S**mall — talla **L**; ejecución **por fases** en `design.md` (no un solo PR monolítico obligatorio, pero un cierre de ticket cuando M1–M5 + CA cumplidos)
- [x] **T**estable — CA en G/W/T + Vitest

- [x] Todos los Must tienen CA verificable
- [x] Instancias en scope identificadas
- [x] Sin preguntas abiertas que afecten un Must
- [x] Reutilización evaluada
- [x] Pasada `/abogado-del-diablo` — ver nota al pie de `_index.md` log

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Ticket L con muchas pantallas | Media | Orden fijo en `design.md`; PRs internos por fase |
| Marcar anuncio visto mal cableado en UI | Baja | API `PATCH /ANM/Anuncios/{id}/visto` existe — usar `apiClient` |
| Descarga archivos distinta a JSON API | Media | Helper `downloadAuthenticated(url)` centralizado + test mock fetch |
| Solapamiento con [[FE-QA-001]] en apiClient | Baja | CA-3 cubre regresión local; FE-QA-001 suite transversal |

## Preguntas abiertas

- ¿Existe `PATCH` marcar anuncio visto? → **respondida:** sí (`AnunciosController` `/{id}/visto`).
- Rama Git `feature/fe-crud-004-residente-ux` → **pendiente** checkout (working tree en `feature/fe-crud-003-registro-admin` con cambios sin commit).

## Quick Checks

- [x] CA con actor y página nombrados
- [x] Criterios medibles G/W/T
- [x] Reutilización documentada
- [x] Sin Must sobre objeto no confirmado salvo anuncio visto (marcado pendiente)
- [ ] DoR ítem Small — aceptado por fases (L gestionado en design)
