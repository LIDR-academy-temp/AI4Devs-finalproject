# APIs — Detalle de ticket y comentarios (TKT)

Backend REST JWT Cuarta para detalle y hilo de comentarios. Autenticación: header `Authorization: Bearer {token}` (login `POST /SGR/Auth/login`).

- **Base URL (local):** `http://localhost:5000`
- **Errores:** `ProblemDetails` con extensión `code` (`NOT_FOUND`, `VALIDATION_ERROR`, …)

---

## 1. Tickets — detalle y comentarios

### 1.1 Detalle de ticket

| Verbo | Ruta | Para qué |
|---|---|---|
| GET | `/TKT/Tickets/{ticketId}` | Detalle si el JWT es solicitante, admin, o trabajador asignado activo |

Response 200 (ejemplo):

```json
{
  "ticketId": 1,
  "titulo": "Fuga en baño",
  "descripcion": "Goteo en llave",
  "estado": "Nuevo",
  "prioridad": "Alta",
  "categoria": "Plomería",
  "fechaCreacion": "2026-10-01T12:00:00Z",
  "fechaCierre": null
}
```

Response 404 (no existe o sin acceso — mismo `code`):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "NOT_FOUND",
  "status": 404,
  "detail": "Ticket no encontrado",
  "code": "NOT_FOUND"
}
```

### 1.2 Comentarios

| Verbo | Ruta | Para qué |
|---|---|---|
| GET | `/TKT/Tickets/{ticketId}/comentarios` | Lista ordenada por `fechaComentario`; residente/trabajador sin internos; admin ve todos |
| POST | `/TKT/Tickets/{ticketId}/comentarios` | Agregar comentario (máx. 2000 chars); `esInterno` solo efectivo para admin |

Body POST:

```json
{
  "comentario": "Texto visible",
  "esInterno": false
}
```

Response GET 200:

```json
[
  {
    "comentarioTicketId": 10,
    "comentario": "Texto visible",
    "fechaComentario": "2026-10-28T16:00:00Z",
    "autorNombre": "Ana Residente",
    "esInterno": false
  }
]
```

Response POST 201: mismo shape que un ítem de la lista (incluye `comentarioTicketId`).

> **INV-6:** no confiar solo en el FE; el backend filtra `EsInterno=1` para no-admin.

---

## Resumen endpoints (nuevos/modificados)

| Método | Ruta | Tipo |
|---|---|---|
| GET | `/TKT/Tickets/{ticketId}` | NUEVO |
| GET | `/TKT/Tickets/{ticketId}/comentarios` | NUEVO |
| POST | `/TKT/Tickets/{ticketId}/comentarios` | NUEVO |
| POST | `/TKT/Tickets/admin` | NUEVO (SoloAdministrador) |
| PATCH | `/TKT/Tickets/{ticketId}/admin` | NUEVO (SoloAdministrador) |
| DELETE | `/TKT/Tickets/{id}/admin` | NUEVO (SoloAdministrador) |
| GET | `/TKT/PrioridadesTicket` | NUEVO |
| POST/PUT/DELETE | `/TKT/CategoriasTicket/.../admin` | NUEVO (SoloAdministrador) |
| POST/PUT/DELETE | `/TKT/PrioridadesTicket/.../admin` | NUEVO (SoloAdministrador) |

### 1.3 CRUD admin (metadatos)

| Verbo | Ruta | Para qué |
|---|---|---|
| POST | `/TKT/Tickets/admin` | Alta en nombre de `usuarioSolicitanteId` (residente activo) |
| PATCH | `/TKT/Tickets/{ticketId}/admin` | Editar título/descripción/categoría/prioridad; bloqueado si estado **Cerrado** (`TICKET_CLOSED` 422) |
| DELETE | `/TKT/Tickets/{ticketId}/admin` | Soft delete (`bEliminado`); desaparece de listados admin y `mis` |

Body POST admin (ejemplo):

```json
{
  "usuarioSolicitanteId": 5,
  "titulo": "Incidencia",
  "descripcion": "Detalle",
  "categoria": "Plomería",
  "prioridad": "Media",
  "canal": "WEB"
}
```

Response POST 201: `clReadTickets` (mismo shape que alta residente).

Pruebas manuales: [FE-TKT-DET-001_api_tests.http](FE-TKT-DET-001_api_tests.http)

---

## 2. Catálogos ticket (admin)

| Verbo | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/TKT/PrioridadesTicket` | JWT | `{ id, nombre, orden? }[]` |
| POST | `/TKT/CategoriasTicket/admin` | SoloAdministrador | Body `{ nombre }` → 201 |
| PUT | `/TKT/CategoriasTicket/{id}/admin` | SoloAdministrador | Renombrar |
| DELETE | `/TKT/CategoriasTicket/{id}/admin` | SoloAdministrador | Soft delete; `409 CATALOG_IN_USE` |
| POST | `/TKT/PrioridadesTicket/admin` | SoloAdministrador | `{ nombre, orden? }` |
| PUT | `/TKT/PrioridadesTicket/{id}/admin` | SoloAdministrador | |
| DELETE | `/TKT/PrioridadesTicket/{id}/admin` | SoloAdministrador | `409 CATALOG_IN_USE` |

Códigos: `CATALOG_DUPLICADO`, `CATALOG_IN_USE`, `NOT_FOUND`.

UI admin: `/admin/tickets/catalogos` (tabs Categorías | Prioridades | Estados solo lectura).
