# APIs — Trabajador + Admin VTS (NAV-ROOT-001 fases C–D)

Backend REST JWT Cuarta. Autenticación: `Authorization: Bearer {token}` (`POST /SGR/AuthService/GenerateToken`).

- **Base URL (local):** `http://localhost:5180`
- **Errores:** `ProblemDetails` con extensión `code` (`FORBIDDEN`, `VALIDATION_ERROR`, …)

---

## 1. Tickets — cola del trabajador

### 1.1 Listado de tickets asignados

| Verbo | Ruta | Para qué |
|---|---|---|
| GET | `/TKT/Tickets/asignados` | Pagina tickets donde `TicketsUsuariosAsignados.UsuarioID = sub` (JWT). **Solo perfil Trabajador.** |

Query (todos opcionales salvo paginación):

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `terminado` | bool | (null = todos) | `false` = pendientes activos |
| `estadoTicketId` | int | null | Filtro por catálogo de estados |
| `pagina` | int | 1 | ≥ 1 |
| `tamano` | int | 20 | 1–100 |

Response 200 (cola vacía — verificado en xUnit + contrato DTO):

```json
{
  "total": 0,
  "pagina": 1,
  "items": []
}
```

Response 200 (con ítems — shape `MiTicketItemDto`):

```json
{
  "total": 1,
  "pagina": 1,
  "items": [
    {
      "ticketId": 3,
      "titulo": "Fuga en baño",
      "estado": "En seguimiento",
      "prioridad": "Alta",
      "categoria": "Plomería",
      "fechaCreacion": "2026-10-01T12:00:00Z"
    }
  ]
}
```

Response 403 (Residente, Administrador u otro perfil):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.4",
  "title": "FORBIDDEN",
  "status": 403,
  "detail": "Solo el perfil Trabajador puede listar tickets asignados.",
  "code": "FORBIDDEN"
}
```

> Detalle de un ticket asignado: reutilizar `GET /TKT/Tickets/{ticketId}` (documentado en [TKT-FE-TKT-DET-001-APIS.md](../tkt-fe-tkt-det-001/TKT-FE-TKT-DET-001-APIS.md)). El backend valida asignación activa para perfil Trabajador.

---

## Resumen endpoints (fase C)

| Método | Ruta | Perfil | Tipo |
|---|---|---|---|
| GET | `/TKT/Tickets/asignados` | Trabajador | **NUEVO** |

---

# APIs — Admin: reservaciones de áreas (NAV-ROOT-001 fase D)

Misma autenticación JWT que fase C. Calendario comunitario: reutilizar `GET /VTS/ReservacionesArea/calendario` ([FE-VTS-CAL-001-APIS.md](../tkt-fe-vts-cal-001/FE-VTS-CAL-001-APIS.md)).

## 2. Reservaciones — listado condominio (admin)

### 2.1 Listado paginado

| Verbo | Ruta | Para qué |
|---|---|---|
| GET | `/VTS/ReservacionesArea/admin` | Todas las reservaciones del condominio (vista `vts.vsReservacionesArea`). **Solo perfil Administrador.** Solo lectura (v1 epic). |

Query:

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `areaComunId` | int | null | Filtrar por área |
| `desde` | datetime | null | Reservas que terminan después de `desde` |
| `hasta` | datetime | null | Reservas que empiezan antes de `hasta` |
| `pagina` | int | 1 | ≥ 1 |
| `tamano` | int | 20 | 1–100 |

Response 200 (vacío — verificado xUnit + contrato serialización):

```json
{
  "total": 0,
  "pagina": 1,
  "items": []
}
```

Response 200 (con ítems — shape `ReservacionAdminItemDto`, verificado `ReservacionAdminItemJsonTests`):

```json
{
  "total": 1,
  "pagina": 1,
  "items": [
    {
      "reservacionAreaId": 9,
      "areaComunId": 2,
      "areaComun": "Salon",
      "usuarioId": 4,
      "usuarioNombre": "Ana Residente",
      "usuarioCorreo": "residente@local",
      "fechaInicio": "2026-10-15T18:00:00Z",
      "fechaFin": "2026-10-15T20:00:00Z",
      "estado": "Confirmada"
    }
  ]
}
```

Response 403 (Residente u otro perfil no admin — verificado `ReservacionesAdminAuthorizationTests`):

HTTP 403 Forbidden (middleware JWT policy `SoloAdministrador`).

---

## Resumen endpoints (fases C + D)

| Método | Ruta | Perfil | Tipo |
|---|---|---|---|
| GET | `/TKT/Tickets/asignados` | Trabajador | **NUEVO** (fase C) |
| GET | `/VTS/ReservacionesArea/admin` | Administrador | **NUEVO** (fase D) |
