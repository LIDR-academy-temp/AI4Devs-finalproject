# Delta: tkt-fe-tkt-det-001-tkt-detalle-comentarios-crud-admin-catalogos

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Detalle de ticket JWT (`GET /TKT/Tickets/{id}`) con acceso solicitante, admin o trabajador asignado; 404 unificado `NOT_FOUND` (anti-enumeración).
- Hilo de comentarios (`GET|POST /TKT/Tickets/{id}/comentarios`); `esInterno` efectivo solo para admin (INV-6).
- Residente: rutas `/tickets/:ticketId`, panel detalle + comentarios públicos.
- Admin: CRUD metadatos ticket (`POST|PATCH|DELETE .../admin`) en `/admin/tickets` (create/view/edit/delete, confirmación soft delete).
- Admin: operación en panel (transiciones `PATCH .../estado/{estadoId}`, asignación `POST /TKT/TicketsUsuariosAsignados`, comentarios internos).
- Admin: CRUD catálogos categoría y prioridad (`.../CategoriasTicket/admin`, `.../PrioridadesTicket/admin`); `GET /TKT/PrioridadesTicket` para listados autorizados.
- Admin: pantalla `/admin/tickets/catalogos` (tabs CRUD + guía estados INV-10 solo lectura).
- Admin UI **EST-2**: etiquetas amigables (Abierto, En trabajo, …) con tooltip del nombre de catálogo en listado, badges y botones de transición.
- Forms residente y admin: prioridades desde API (no lista hardcodeada en FE).

## Comportamiento modificado

- (Antes): Admin tickets solo listado + operación parcial.
- (Después): Administración end-to-end ADM-1..8 + catálogos CAT/PRI + guía estados.

- (Antes): Sin detalle/comentarios en SPA residente vía REST unificado.
- (Después): `TicketDetallePanel` compartido residente/admin con reglas de visibilidad por rol.

## Comportamiento eliminado

- Ninguno (compatibilidad con endpoints TKT-BE-015/016 existentes).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin DDL en ticket (Dapper sobre tablas `tkt.*` existentes) |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/TKT/Tickets/{ticketId}` | GET | Creado |
| `/TKT/Tickets/{ticketId}/comentarios` | GET, POST | Creado |
| `/TKT/Tickets/admin` | POST | Creado |
| `/TKT/Tickets/{ticketId}/admin` | PATCH, DELETE | Creado |
| `/TKT/PrioridadesTicket` | GET | Creado |
| `/TKT/CategoriasTicket/admin` | POST | Creado |
| `/TKT/CategoriasTicket/{id}/admin` | PUT, DELETE | Creado |
| `/TKT/PrioridadesTicket/admin` | POST | Creado |
| `/TKT/PrioridadesTicket/{id}/admin` | PUT, DELETE | Creado |

## Para el reviewer

- **Qué se hizo**: Portal tickets completo — detalle/comentarios, CRUD admin de tickets, CRUD catálogos categoría/prioridad y etiquetas EST-2 en UI admin.
- **Por qué**: [[FE-TKT-DET-001]] / Gaps MVP — cerrar administración de tickets y configuración de catálogos sin tocar máquina de estados en BD.
- **Riesgo**: **Medio-bajo** — muchas rutas nuevas pero patrón ya usado (TiposArchivo); validar smoke HTTP con token admin.
- **Qué probar**: xUnit `CuartaTicket` 13/13; Vitest tickets 16/16; flujo manual `/admin/tickets` → Catálogos → crear categoría/prioridad → nuevo ticket; EST-2 en listado; residente `/tickets/nuevo` con prioridades API.
- **Rollback**: Revertir PR en `GraphApi` + `Web`; datos catálogo creados en BD persisten (soft delete admin si aplica).

## Aprendizajes

- Reutilizar patrón `TiposArchivo` acelera CRUD catálogo JWT + `CATALOG_IN_USE`.
- EST-2 solo en capa presentación admin evita divergencia con API/catálogo.

## Decisiones (ADR)

- Estados de ticket **sin** CRUD admin en fase 3; guía INV-10 en UI + `PATCH` existente.
- Prioridades/categorías: resolución por **nombre** en alta/edición ticket (alineado readme).
