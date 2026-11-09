# APIs — Calendario comunitario de reservas (`VTS`)

Lectura de ocupación por área común para el calendario en `/areas-comunes`. Autenticación JWT (cualquier residente autenticado). Respuesta en camelCase (ASP.NET Core default).

- **Base URL (dev):** `http://localhost:5180`
- **Prefijo:** `/VTS/ReservacionesArea`

---

## 1. Consultas

### 1.1 `calendario` — Ocupación comunitaria del área en un rango → **GET**

`GET /VTS/ReservacionesArea/calendario`

Query (todos requeridos salvo validación):

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `areaComunId` | int | ID del área (`> 0`) |
| `desde` | DateTime ISO | Inicio del rango (inclusive en filtro SQL) |
| `hasta` | DateTime ISO | Fin del rango (exclusive recomendado: inicio de semana + 7 días) |

Validaciones de negocio (422 `ProblemDetails`, `title` = código):

| Código | Condición |
|--------|-----------|
| `VTS_AREA_INVALIDA` | `areaComunId <= 0` |
| `VTS_RANGO_INVALIDO` | `hasta <= desde` |
| `VTS_RANGO_EXCESIVO` | rango > 62 días |

Response **200** — arreglo JSON (no wrapper `success`):

```json
[
  {
    "reservacionAreaId": 12,
    "areaComunId": 1,
    "fechaInicio": "2026-10-27T16:00:00Z",
    "fechaFin": "2026-10-27T18:00:00Z",
    "estado": "Confirmada",
    "etiqueta": "Salón de eventos (Reservado)"
  },
  {
    "reservacionAreaId": 15,
    "areaComunId": 1,
    "fechaInicio": "2026-10-28T20:00:00Z",
    "fechaFin": "2026-10-28T22:00:00Z",
    "estado": "Pendiente",
    "etiqueta": "Salón de eventos (Reservado)"
  }
]
```

> No incluye correo ni nombre del residente. Estados `Cancelada` no se devuelven (filtro SQL por nombre de catálogo).

> Ejemplo obtenido de contrato DTO + proyección SQL en `CuartaVisitasRepository` (smoke HTTP pendiente con API levantada; ver `FE-VTS-CAL-001_api_tests.http`).

Estados posibles en `estado`: `Pendiente`, `Confirmada` (otros activos del catálogo si existieran).

---

## 2. Resumen de endpoints

| # | Recurso | GET | POST | DELETE |
|---|---------|:---:|:----:|:------:|
| 1 | `/VTS/ReservacionesArea/calendario` | ✔ ocupación por área/rango | — | — |
| 2 | `/VTS/ReservacionesArea` | — | ✔ crear (existente) | — |
| 3 | `/VTS/ReservacionesArea/mias` | ✔ mis reservas (existente) | — | — |

Endpoint **nuevo** en este ticket: fila 1.
