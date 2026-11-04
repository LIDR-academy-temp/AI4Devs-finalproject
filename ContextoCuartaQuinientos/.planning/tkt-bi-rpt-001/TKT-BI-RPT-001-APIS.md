# TKT-BI-RPT-001-APIS — Reportes + BI (GraphApi)

APIs **nuevas o usadas** por el front en BI-RPT-001. Auth: `Authorization: Bearer <JWT>`. Admin: claim `perfil=Administrador` y claim `condominioId` numérico (requerido en BI/export RPT/aviso admin).

- **Base URL (dev):** `http://localhost:5180`
- **Prefijo:** sin `/api` (ej. `GET /Reports/Bi/tendencias`)

---

## 1. BI — tendencias y export

### 1.1 Tendencias KPI (`GET /Reports/Bi/tendencias`)

| Verbo | Ruta | Uso |
|-------|------|-----|
| GET | `/Reports/Bi/tendencias?meses={1-24}` | Snapshots históricos del condominio del token |

**Query:** `meses` (default 6, clamp 1–24).

**Response 200** (array JSON camelCase):

```json
[
  {
    "fecha": "2026-11-04",
    "ticketsAbiertos": 2,
    "ticketsCerrados": 1,
    "tiempoMedioResolucionHoras": 12.5,
    "ingresosMXN": 1500.0,
    "egresosMXN": 200.0,
    "residentesMorosos": 3,
    "casasTotales": 20,
    "casasOcupadas": 18
  }
]
```

**Errores:** `403` sin perfil admin · `400` sin `condominioId` en JWT (`code`: `VALIDATION_ERROR`).

> El worker/API pueden insertar snapshot del día bajo demanda al leer tendencias (idempotente por índice único).

### 1.2 Export BI (`GET /Reports/Bi/export`)

| Verbo | Ruta | Uso |
|-------|------|-----|
| GET | `/Reports/Bi/export?meses=6&formato=pdf` | PDF tendencias |
| GET | `/Reports/Bi/export?meses=6&formato=xlsx` | Excel tendencias |

**Response 200:** binario (`application/pdf` o spreadsheet). Mismos requisitos auth/condominio que tendencias.

---

## 2. Reportes período (RPT)

### 2.1 Finanzas mes (`GET /Reports/Reportes/FinanzasMes/export`)

| Verbo | Ruta | Uso |
|-------|------|-----|
| GET | `/Reports/Reportes/FinanzasMes/export?mes=11&anio=2026&formato=pdf` | Cuotas pagadas + transacciones del mes (condominio JWT) |
| GET | `...&formato=xlsx` | Mismo contenido en Excel (hojas Cuotas / Transacciones) |

### 2.2 Tickets período (`GET /Reports/Reportes/TicketsPeriodo/export`)

| Verbo | Ruta | Uso |
|-------|------|-----|
| GET | `/Reports/Reportes/TicketsPeriodo/export?mes=11&anio=2026&formato=pdf` | Tickets creados en el mes (condominio JWT) |
| GET | `...&formato=xlsx` | Excel con columnas ID, título, solicitante, prioridad, estado, fechas |

**Errores comunes:** `400` validación mes/año · `400` sin `condominioId`.

---

## 3. NTF — aviso general (fase G)

### 3.1 Aviso (`POST /NTF/Notificaciones/aviso`)

| Verbo | Ruta | Uso |
|-------|------|-----|
| POST | `/NTF/Notificaciones/aviso` | Notificación masiva a **residentes del condominio** del admin |

**Body:**

```json
{
  "titulo": "Aviso asamblea",
  "mensaje": "Texto del aviso"
}
```

**Response 201:**

```json
{
  "destinatarios": 42
}
```

**Errores:** `403` no admin · `400` validación · `400` sin `condominioId`.

---

## 4. Regresión (ya existente, UI Reportes)

| Verbo | Ruta | Uso |
|-------|------|-----|
| GET | `/Reports/Reportes/Morosos` | Pestaña morosos en `AdminReportesPage` |

---

## Resumen endpoints BI-RPT-001

| Método | Ruta | Nuevo |
|--------|------|-------|
| GET | `/Reports/Bi/tendencias` | Sí |
| GET | `/Reports/Bi/export` | Sí |
| GET | `/Reports/Reportes/FinanzasMes/export` | Sí |
| GET | `/Reports/Reportes/TicketsPeriodo/export` | Sí |
| POST | `/NTF/Notificaciones/aviso` | UI nueva (endpoint existente, scope condominio) |
| GET | `/Reports/Reportes/Morosos` | No (regresión) |

Pruebas manuales: [BI-RPT-001_api_tests.http](BI-RPT-001_api_tests.http).
