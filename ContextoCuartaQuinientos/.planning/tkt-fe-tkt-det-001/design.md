[← spec](spec.md) | [← index](_index.md)

# design.md — FE-TKT-DET-001

## North star

**Consola única `/admin/tickets`** para administrar **todos los tickets** del condominio (listar → crear → ver/editar → operar → comentar → eliminar), más seguimiento JWT residente/trabajador en rutas propias.

## Mapa de capacidades vs API (admin)

| Capacidad ADM | UI | API Cuarta JWT | Estado |
|---------------|-----|----------------|--------|
| ADM-1 Listar todos | `AdminFilterableTable` + filtros | `GET /TKT/Tickets/admin` | Hecho |
| ADM-2 Crear | CTA + `TicketAdminForm` (create) | `POST /TKT/Tickets/admin` | Hecho |
| ADM-3 Ver detalle + comentarios | `TicketDetallePanel` en panel | `GET /TKT/Tickets/{id}`, `.../comentarios` | Hecho |
| ADM-4 Editar metadatos | Panel modo edit + Zod | `PATCH /TKT/Tickets/{id}/admin` | Hecho |
| ADM-5 Estado + asignación | Botones transición + select trabajador | `PATCH .../estado/{id}`, `POST TicketsUsuariosAsignados` | Hecho |
| ADM-6 Comentarios | Textarea + interno | `POST .../comentarios` | Hecho |
| ADM-7 Eliminar | `ConfirmDialog` | `DELETE /TKT/Tickets/{id}/admin` | Hecho |
| ADM-8 Patrón CRUD | Toolbar KPI + split | — | Hecho |

## Fase 3 — Catálogos (mapa)

| Capacidad | UI | API | Estado |
|-----------|-----|-----|--------|
| CAT CRUD | `/admin/tickets/catalogos` tab Categorías | `POST/PUT/DELETE .../CategoriasTicket/.../admin` | Pendiente |
| PRI CRUD | tab Prioridades | `GET /TKT/PrioridadesTicket` + CRUD admin | Pendiente |
| EST guía | tab Estados (solo lectura) | `GET /TKT/EstadosTickets` + matriz UI | Pendiente |

Mapeo coloquial → catálogo: Abierto→**Nuevo**; Trabajando→**En seguimiento**; Cerrado→**Cerrado**; «En espera»→**no existe** (Won't fase 3).

**EST-2 [M] (implementación):** `Web/src/features/tickets/ticketEstadoDisplay.ts` — mapa fijo catálogo→etiqueta admin; usar en `EstadoTicketBadge` (`variant="admin"`), botones transición en `AdminTicketsPage`, tab guía estados. No persistir en BD; PATCH estado sigue con `estadoId` del catálogo.

## Estado de implementación

| Bloque | Estado |
|--------|--------|
| Seguimiento residente/trabajador + operación admin (ADM-3,5,6) | **Implementado** (`impl.md`) |
| CRUD admin completo (ADM-2,4,7,8) | **Implementado** (`impl.md` § Fase 2) |
| Catálogos CAT/PRI/EST (fase 3) | **Implementado** (`impl.md` § Fase 3) |

## Estrategia técnica — fase 3

- **Patrón referencia:** `CuartaArchivosService` + `TiposArchivoController` (JWT, `SoloAdministrador` en mutaciones, Dapper, soft delete, `CATALOG_DUPLICADO` / `CATALOG_IN_USE`).
- **Servicio nuevo:** `ICuartaTicketCatalogoAdminService` + ampliar `ITicketCatalogoRepository` (insert/update/soft delete categoría y prioridad; `ExistsTicketsConCategoriaAsync`).
- **Controllers:** extender `CategoriasTicketController` con rutas admin **o** controller dedicado `CategoriasTicketAdminController` bajo `TKT/` (preferido: mismos recursos, sufijo `/admin` en POST/PUT/DELETE para no romper GET público).
- **Prioridades:** exponer `GET /TKT/PrioridadesTicket` (hoy forms hardcodean 4 valores); CRUD admin análogo a categorías; respetar tabla física vía `SqlSchemaCompat` ya usado en `TicketCatalogoRepository`.
- **Estados:** **sin** mutaciones API; componente `TicketEstadosGuiaPanel.tsx` con tabla + `TRANSICIONES_PERMITIDAS` (espejo de `TicketStatusTransitions.cs`).
- **Frontend:** `AdminTicketCatalogosPage.tsx` con tabs Bootstrap; schemas Zod; split panel CRUD como `AdminTiposArchivoPage`.
- **Menú:** enlace desde toolbar `AdminTicketsPage` → `/admin/tickets/catalogos` (ruta nueva en `App.tsx`).

### Escalera fase 3

| Peldaño | Entregable |
|---------|------------|
| 4 | Repo + servicio CRUD catálogo |
| 4 | Controllers JWT + validators |
| 3 | Página admin tabs + hooks |
| 3 | TicketAdminForm / TicketForm prioridad desde API |
| 2 | Vitest + xUnit negativos (in use, duplicado) |

## backend:cuartaquinientos-api — fase 3 (a implementar)

| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET | `/TKT/PrioridadesTicket` | `[Authorize]` | Lista `{ id, nombre, orden? }` |
| POST | `/TKT/CategoriasTicket/admin` | Admin | Body `{ nombre }` |
| PUT | `/TKT/CategoriasTicket/{id}/admin` | Admin | Renombrar |
| DELETE | `/TKT/CategoriasTicket/{id}/admin` | Admin | Soft delete; 409 si tickets referencian |
| POST | `/TKT/PrioridadesTicket/admin` | Admin | `{ nombre, orden? }` |
| PUT | `/TKT/PrioridadesTicket/{id}/admin` | Admin | |
| DELETE | `/TKT/PrioridadesTicket/{id}/admin` | Admin | 409 si tickets referencian |

DTOs: `UpsertCategoriaTicketInput`, `UpsertPrioridadTicketInput` + FluentValidation (nombre 1–100, orden 1–99 opcional).

## frontend:cuartaquinientos-web — fase 3

```mermaid
flowchart TB
  tickets[AdminTicketsPage]
  cat[AdminTicketCatalogosPage]
  tabs[Tabs: Categorías | Prioridades | Estados]
  tickets -->|CTA Catálogos| cat
  cat --> tabs
  tabs -->|CRUD| apiAdmin
  tabs -->|Estados| guia[Solo lectura INV-10]
```

Artefactos:

- `features/admin/tickets/catalogos/*` (schemas, hooks, table filters, guía estados)
- `pages/AdminTicketCatalogosPage.tsx` + test Vitest
- Ajuste `useCatalogosTicket` o hook `usePrioridadesTicket` para forms

## Estrategia técnica (fases 1–2 — histórico)

- **Una pantalla** `AdminTicketsPage`: modos panel `list | create | view | edit` sobre el mismo `AdminSplitLayout`.
- Backend: extender `CuartaTicketAdminService` / `ICuartaTicketService` — **no** controllers legacy con headers.
- Reusar insert `CuartaTicketRepository.InsertarAsync` para ADM-2; UPDATE/soft delete en `CuartaTicketAdminRepository`.

### Escalera (fase pendiente)

| Capacidad | Peldaño | Objeto |
|-----------|---------|--------|
| Insert | 4 | `CrearTicketAdminAsync` |
| Update metadatos | 4 | `UpdateMetadatosAsync` |
| Soft delete | 4 | `SoftDeleteAsync` |
| Form/panel | 3 | Patrón `AdminCasasPage` |
| Listado | 3 | Ya existe `useTicketsAdmin` |

## backend:cuartaquinientos-api

### Vigente (admin + seguimiento)

| Endpoint | Uso admin |
|----------|-----------|
| `GET /TKT/Tickets/admin` | ADM-1 |
| `GET /TKT/Tickets/{id}` | ADM-3 |
| `GET\|POST /TKT/Tickets/{id}/comentarios` | ADM-3, ADM-6 |
| `PATCH /TKT/Tickets/{id}/estado/{estadoId}` | ADM-5 |
| `POST /TKT/TicketsUsuariosAsignados` | ADM-5 |

### A implementar

| Endpoint | ADM |
|----------|-----|
| `POST /TKT/Tickets/admin` | ADM-2 |
| `PATCH /TKT/Tickets/{id}/admin` | ADM-4 |
| `DELETE /TKT/Tickets/{id}/admin` | ADM-7 |

DTOs: `CrearTicketAdminInput`, `ActualizarTicketAdminInput` + validators.

## frontend:cuartaquinientos-web

### `/admin/tickets` — flujo objetivo

```mermaid
flowchart LR
  toolbar[AdminListToolbar KPI + filtros + Nuevo ticket]
  table[Tabla todos los tickets]
  panel[AdminSidePanel]
  toolbar --> table
  table -->|Ver fila| panel
  toolbar -->|Nuevo| panel
  panel -->|Guardar create| apiPostAdmin
  panel -->|Guardar edit| apiPatchAdmin
  panel -->|Eliminar| ConfirmDialog
  panel -->|Estado/asignar/comentar| APIs existentes
```

Artefactos fase 2:

- `ticketAdminSchemas.ts`, `useTicketAdminMutations.ts`, `TicketAdminForm.tsx`
- `AdminTicketsPage`: CTA, modos create/edit, botones Editar/Eliminar en view
- Vitest: ADM-2, ADM-7 happy path

Residente: sin cambio de rutas `/tickets`, `/tickets/:id`, `/tickets/nuevo`.

## Contenido configurable

Toasts alta/edición/baja; copy confirm delete; `ProblemDetails.code`.

## Orden de implementación

| # | Entregable | ADM | Estado |
|---|------------|-----|--------|
| 1–5 | Detalle + comentarios + panel operación | 3,5,6 | ✓ Hecho |
| 6 | BE POST/PATCH/DELETE admin + xUnit | 2,4,7 | ✓ Hecho |
| 7 | Form + mutations | 2,4 | ✓ Hecho |
| 8 | Panel modos create/edit/delete en página | 8 | ✓ Hecho |
| 9 | Vitest + regresión ADM | todos | ✓ Hecho |
| 10 | APIS.md + `.http` | — | ✓ Hecho |
| 11 | BE repo + servicio CRUD catálogo + GET prioridades | CAT,PRI | ✓ Hecho |
| 12 | Controllers admin + xUnit | CAT,PRI | ✓ Hecho |
| 13 | `AdminTicketCatalogosPage` + tabs CRUD | CAT,PRI,EST | ✓ Hecho |
| 14 | Forms ticket leen prioridad vía API | PRI-2 | ✓ Hecho |
| 14b | `ticketEstadoDisplay` + badges/botones admin | EST-2 | ✓ Hecho |
| 15 | Vitest catálogos + regresión tickets | todos | ✓ Hecho |
| 16 | Actualizar APIS.md + `.http` | — | ✓ Hecho |

## Plan de pruebas — fase 3

| ID | Caso | Expected |
|----|------|----------|
| TC-TKT-K-1 | POST categoría admin | 201, aparece en GET |
| TC-TKT-K-2 | DELETE categoría con tickets | 409 |
| TC-TKT-K-3 | POST prioridad duplicada | 400/409 |
| TC-TKT-K-4 | GET prioridades autorizado | 200 lista |
| TC-TKT-K-5 | UI tab Estados muestra 4 estados + transiciones | render |
| TC-TKT-K-5b | Admin listado muestra etiqueta amigable + tooltip catálogo | EST-2 |
| TC-TKT-K-6 | Regresión CuartaTicket xUnit + Vitest admin tickets | PASS |

**Veredicto design fase 3:** **LISTO PARA EJECUTAR** (aceptado 2026-10-28; pasos 11–16).

## Plan de pruebas — fases 1–2 (cerrado)

| ID | ADM | Caso | Expected |
|----|-----|------|----------|
| TC-TKT-D-* | 3,6 | (fase 1) | PASS |
| TC-TKT-C-1 | 2 | POST admin válido | 201 |
| TC-TKT-C-2 | 2 | Solicitante inválido | 400 |
| TC-TKT-C-3 | 4 | PATCH cerrado | error |
| TC-TKT-C-4 | 7 | Soft delete | 204, sin fila listado |
| TC-TKT-C-5 | 8 | Nuevo ticket abre panel | UI |
| TC-TKT-C-6 | 8 | Confirm delete | apiDelete |
| TC-TKT-C-7 | 1 | Listado admin con ≥1 ticket tras create | 200 |

**Veredicto design fases 1–2:** implementado — ver `impl.md`.
