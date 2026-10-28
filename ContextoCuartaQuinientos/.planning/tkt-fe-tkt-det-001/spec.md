[← index](_index.md) | [design →](design.md)

# spec.md — FE-TKT-DET-001: Administración de todos los tickets

## Documentos de entrada

- Requerimiento: **administración completa** del dominio tickets — crear, listar **todos**, asignar, cerrar, comentar, seguimiento ([GAPS_MVP_ROADMAP](../GAPS_MVP_ROADMAP.md), HU-TKT-03 en [specs/tickets.md](../../specs/tickets.md))
- **Ampliación fase 3 (2026-10-28):** CRUD admin de **categorías y prioridades** de ticket; guía operativa de **estados** (máquina INV-10, sin CRUD de estados ni “En espera” en Must)
- Técnico: `GET /TKT/Tickets/admin`, transiciones, asignación, capa Cuarta JWT, [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md); patrón catálogo admin → `ARC/TiposArchivo` (Cuarta + JWT)
- Visual: [ui-referencia-visual.md](../../referencia/ui-referencia-visual.md)

## Problema

La administración del condominio debe **gestionar todos los tickets** (no solo los propios) desde `/admin/tickets`. Hoy:

- Falta **ciclo completo** en un solo lugar: alta admin, edición, baja, listado global, detalle, comentarios, estado y asignación.
- El residente necesita **seguimiento** en `/tickets/:id` (parcialmente resuelto en fase 1).

Este ticket SDD cubre **toda la administración de tickets** (backend JWT + SPA admin + seguimiento residente/trabajador).

## Objetivo

Entregar en **`/admin/tickets`** la consola de **todos los tickets** del condominio:

| Capacidad | Qué implica |
|-----------|-------------|
| **Listar** | Todos los tickets con filtros estado/prioridad, KPIs, tabla filtrable |
| **Crear** | Alta a nombre de un residente (canal WEB, estado Nuevo) |
| **Ver** | Detalle completo + hilo de comentarios (públicos e internos admin) |
| **Editar** | Metadatos (título, descripción, categoría, prioridad) |
| **Operar** | Transición de estado (máquina INV-10) + asignar trabajador |
| **Comentar** | Público o interno (INV-6) |
| **Eliminar** | Baja lógica (`bEliminado`) |

Paralelo: residente/trabajador ven **solo** tickets autorizados con el mismo detalle/comentarios JWT (fase 1).

## Alcance Must — Administración (todos los tickets)

| ID | Ámbito | Criterio | Entrega |
|----|--------|----------|---------|
| **ADM-1** | Listado | Admin ve **todos** los tickets vía `GET /TKT/Tickets/admin` con filtros y paginación; KPIs en toolbar | [[FE-CRUD-001]] base |
| **ADM-2** | Crear | CTA **Nuevo ticket** → form panel: residente solicitante + título/descripción/categoría/prioridad → `POST /TKT/Tickets/admin` | Fase 2 |
| **ADM-3** | Ver | Panel lateral: detalle + comentarios (todos si admin) | Fase 1 |
| **ADM-4** | Editar | PATCH metadatos admin; bloqueado si **Cerrado** `(asumido)` | Fase 2 |
| **ADM-5** | Operar | Cambiar estado (`PATCH .../estado/{id}`) + asignar trabajador (`POST TicketsUsuariosAsignados`) sin regresión | Fase 1 |
| **ADM-6** | Comentar | POST comentario; checkbox interno solo admin | Fase 1 |
| **ADM-7** | Eliminar | Soft delete con `ConfirmDialog` → desaparece de listados admin y `mis` | Fase 2 |
| **ADM-8** | UX | Patrón `PATRON_CRUD_ADMIN` (split panel, RHF+Zod, sin prompt nativo) | Fase 2 |

## Alcance Must — Seguimiento (no admin)

| ID | Actor | Criterio | Entrega |
|----|-------|----------|---------|
| M-1 | Residente | `/tickets/:id` detalle + comentarios públicos | Fase 1 |
| M-2 | Residente | Solo tickets propios (404 ajeno) | Fase 1 |
| M-6 | Trabajador | Asignado activo: ver + comentar | Fase 1 |

## Should

| ID | Criterio |
|----|----------|
| S-1 | Timeline estado + comentarios `(asumido)` |
| S-2 | Enlace “Nuevo ticket” en detalle residente | Hecho |
| S-3 | Selector residente con búsqueda en alta admin `(asumido)` |
| S-4 | Filtro prioridad en toolbar además de estado `(asumido: API ya lo soporta)` |

## Won't

- Adjuntos, calificación HU-TKT-05, lista “mis tareas” trabajador, GraphQL comentarios legacy
- Reasignar solicitante en edición
- Admin crea ticket sin residente explícito

## Invariantes

- INV-1..INV-11 `specs/tickets.md`
- INV-6, INV-7 (residente `sub`; admin alta con `usuarioSolicitanteId` validado), INV-9 soft delete, INV-10 transiciones

## Criterios de aceptación

### Administración — Definition of Done pantalla

- **CA-ADM [M]:** Desde `/admin/tickets` un admin puede **listar todos**, **crear**, **abrir detalle**, **editar**, **comentar** (interno), **cambiar estado**, **asignar**, **eliminar** un ticket de prueba end-to-end.
- **CA-REG [M]:** Residente sigue creando en `/tickets/nuevo`; ve cambios del admin en detalle; tests Vitest/xUnit existentes verdes.

### Detalle (fase 1 verificada)

- CA-1..CA-5 en `impl.md`

### CRUD admin (fase 2)

- **CA-6:** Alta admin → visible en listado admin + mis tickets del residente
- **CA-7:** Edición metadatos → residente ve en detalle
- **CA-8:** Delete confirm → no listado
- **CA-9:** Regresión ADM-3..6

### Catálogos admin (fase 3 — pendiente ejecutar)

| ID | Ámbito | Criterio |
|----|--------|----------|
| **CAT-1 [M]** | Categorías | Admin CRUD (listar, crear, editar nombre, soft delete) sobre `tkt.CategoriasTicket`; formularios ticket consumen `GET` actualizado |
| **CAT-2 [M]** | Categorías | No eliminar categoría en uso por tickets activos (`bEliminado=0`) → `409 CONFLICT` |
| **PRI-1 [M]** | Prioridades | Admin CRUD sobre catálogo prioridad (`PrioridadesTicket` o `PrioridadEstickets` según esquema); campo **Orden** si existe columna `(asumido DB-001)` |
| **PRI-2 [M]** | Prioridades | Alta/edición ticket (residente + admin) resuelve prioridad **por nombre** desde catálogo (dejar de hardcodear solo en FE) |
| **EST-1 [M]** | Estados | Sección **solo lectura**: nombres reales del catálogo + matriz de transiciones (INV-10); operación de cambio sigue en detalle ticket (ADM-5) |
| **EST-2 [M]** | Etiquetas UI | En pantallas **admin** (listado, badge, botones transición, tab Estados): mostrar etiqueta amigable (**Abierto**, **En trabajo**, **Resuelto**, **Cerrado**) con `title`/tooltip del nombre de catálogo (`Nuevo`, `En seguimiento`, …). Residente/trabajador siguen viendo nombres de catálogo `(asumido)` |
| **EST-3 [W]** | Estados | CRUD de estados o estado **“En espera”** — requiere rediseño de `TicketStatusTransitions` + bot; **fuera de fase 3** |

- **CA-CAT [M]:** Tras crear categoría en admin, aparece en combo “Nuevo ticket” sin desplegar BD manual.
- **CA-PRI [M]:** Tras crear prioridad, disponible en forms admin y residente.
- **CA-EST [M]:** Admin entiende cómo pasar ticket entre estados desde `/admin/tickets` (doc en pantalla catálogos + botones existentes).
- **CA-EST2 [M]:** Listado y panel admin muestran etiquetas amigables (EST-2); API sigue usando IDs/nombres de catálogo.
- **CA-REG2 [M]:** Fases 1–2 siguen verdes (Vitest + xUnit tickets).

## Pasada adversarial

| Riesgo | Mitigación |
|--------|------------|
| Admin no ve “todos” (filtro condominio) | `(asumido)` MVP single-condominio; listado admin sin filtro solicitante |
| IDOR mutaciones admin | `SoloAdministrador` + tests 403 residente |
| CRUD duplicado vs residente | Rutas `/admin` separadas; núcleo insert compartido en repo |
| Borrar categoría/prioridad en uso | Soft delete bloqueado si hay FK tickets `(asumido)` |
| Renombrar catálogo rompe tickets abiertos | Update por ID; tickets guardan FK, no texto |
| CRUD estados rompe INV-10 / bot | **Won't** en fase 3; solo guía + PATCH existente |
| Dropdown vacío sin DB-002 | Mensaje vacío + link a catálogos admin; seed sigue siendo setup ops |

**Veredicto fase 3:** **LISTO PARA EJECUTAR** (design aceptado 2026-10-28).

**Veredicto fases 1–2:** cerradas en `impl.md` — **LISTO PARA PR**.

## Instancias

| Target | Repo |
|--------|------|
| backend | `GraphApi/` |
| frontend | `Web/` |
