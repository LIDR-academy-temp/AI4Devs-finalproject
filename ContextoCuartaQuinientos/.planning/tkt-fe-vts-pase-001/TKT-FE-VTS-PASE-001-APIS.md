# APIs — Pase de visita QR (`VTS/VisitasGeneradas`)

Backend REST JWT para pases pre-registrados con código QR. El front **no** usa GraphQL ni headers legacy (`UserID` / `WindowName`) en estas rutas.

- **Base URL (DEV):** `http://localhost:5180`
- **Auth:** `Authorization: Bearer <token>` (login `POST /SGR/AuthService/GenerateToken`)
- **Errores:** `ProblemDetails` con extensión `code` (ej. `PASE_NOMBRE_REQUERIDO`, `PASE_CASA_NO_ENCONTRADA`)

---

## 1. Operación — Pases QR

### 1.1 `VisitasGeneradas/mias` — Mis pases (residente)

| Verbo | Ruta | Para qué |
|---|---|---|
| GET | `/VTS/VisitasGeneradas/mias` | Lista pases del usuario autenticado (`sub`). |

Headers:

```http
Authorization: Bearer {{token}}
```

Response (ejemplo real, smoke 2026-10-28):

```json
[
  {
    "visitaGeneradaId": 1,
    "nombreVisitante": "Visitante HTTP Test",
    "codigoQr": "0C3705762AC9BB9CA6540E463E44FFB2",
    "fechaEmision": "2026-10-28T18:14:07.35",
    "fechaExpira": "2026-10-28T22:14:07.35",
    "bUsado": false,
    "estadoLista": "vigente",
    "casaId": 1,
    "direccionCasa": "cada 55",
    "tipoIdentificacion": "INE",
    "numeroIdentificacion": "N/A"
  }
]
```

> `estadoLista`: `vigente` | `expirado` | `usado` (calculado server-side UTC).

---

### 1.2 `VisitasGeneradas` — Crear pase

| Verbo | Ruta | Para qué |
|---|---|---|
| POST | `/VTS/VisitasGeneradas` | Crea pase; genera `codigoQr` único (128-bit hex). **201** |

Body POST:

```json
{
  "nombreVisitante": "Doc API",
  "tipoIdentificacionId": null,
  "numeroIdentificacion": null,
  "fechaInicio": "2026-10-28T18:00:00.000Z",
  "fechaFin": "2026-10-28T22:00:00.000Z",
  "todoElDia": false
}
```

Response **201** (ejemplo real):

```json
{
  "visitaGeneradaId": 4,
  "nombreVisitante": "Doc API",
  "codigoQr": "52B0B97181D9B37B1168312365B4564C",
  "fechaEmision": "2026-10-28T18:00:00",
  "fechaExpira": "2026-10-28T22:00:00",
  "bUsado": false,
  "estadoLista": "vigente",
  "casaId": 1,
  "direccionCasa": "cada 55",
  "tipoIdentificacion": "INE",
  "numeroIdentificacion": "N/A"
}
```

> Requiere casa vigente del residente (`sgr.CasaOcupantes` o propietario en `sgr.Casas`) y al menos un `vts.TipoIdentificacion` activo.

---

### 1.3 `VisitasGeneradas/validar` — Validar código (guardia/admin)

| Verbo | Ruta | Para qué |
|---|---|---|
| POST | `/VTS/VisitasGeneradas/validar` | Estado del pase por `codigoQr`. Policy **AdminOGuardia**. |

Body POST:

```json
{
  "codigoQr": "52B0B97181D9B37B1168312365B4564C"
}
```

Response vigente (ejemplo real):

```json
{
  "estado": "Valido",
  "detalle": "Pase vigente. Puedes registrar la entrada.",
  "pase": {
    "visitaGeneradaId": 4,
    "nombreVisitante": "Doc API",
    "codigoQr": "52B0B97181D9B37B1168312365B4564C",
    "fechaEmision": "2026-10-28T18:00:00",
    "fechaExpira": "2026-10-28T22:00:00",
    "bUsado": false,
    "estadoLista": "vigente",
    "casaId": 1,
    "direccionCasa": "cada 55",
    "tipoIdentificacion": "INE",
    "numeroIdentificacion": "N/A"
  }
}
```

Valores `estado`: `Valido` | `Expirado` | `Usado` | `NoEncontrado`.

Código inexistente (ejemplo real):

```json
{
  "estado": "NoEncontrado",
  "detalle": "No se encontró un pase con ese código.",
  "pase": null
}
```

Residente sin rol guardia → **403** (probar en `FE-VTS-PASE-001_api_tests.http`).

---

### 1.4 `VisitasGeneradas/{id}/usar` — Marcar entrada

| Verbo | Ruta | Para qué |
|---|---|---|
| POST | `/VTS/VisitasGeneradas/{visitaGeneradaId}/usar` | Marca `bUsado=1`. Policy **AdminOGuardia**. |

Body: `{}` (vacío).

Response (ejemplo real):

```json
{
  "ok": true,
  "yaUsado": false,
  "pase": {
    "visitaGeneradaId": 4,
    "nombreVisitante": "Doc API",
    "codigoQr": "52B0B97181D9B37B1168312365B4564C",
    "bUsado": true,
    "estadoLista": "usado"
  }
}
```

> Segundo uso concurrente: **409** `PASE_USO_CONFLICTO` o respuesta idempotente con `yaUsado: true` si ya estaba usado.

---

## Resumen endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/VTS/VisitasGeneradas/mias` | JWT residente | Mis pases |
| POST | `/VTS/VisitasGeneradas` | JWT residente | Crear pase + QR |
| POST | `/VTS/VisitasGeneradas/validar` | JWT AdminOGuardia | Validar código |
| POST | `/VTS/VisitasGeneradas/{id}/usar` | JWT AdminOGuardia | Registrar entrada |

Pruebas manuales: [FE-VTS-PASE-001_api_tests.http](FE-VTS-PASE-001_api_tests.http)
