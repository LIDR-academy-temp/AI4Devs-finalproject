# APIs — Registrar pago de cuota (`FNZ`)

Backend REST para que un **Administrador** marque una cuota como pagada. El residente ve el estado en `GET /FNZ/Cuotas/mis` (FNZ-BE-010 / FE-032).

- **Base URL (local):** `http://localhost:5180`
- **Auth:** `Authorization: Bearer <JWT>` (login `POST /SGR/AuthService/GenerateToken`)
- **Errores:** `ProblemDetails` con extension `code` (`NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `FORBIDDEN`)

---

## 1. Finanzas — Pago de cuota

### Variante B — Acción única

### `PATCH /FNZ/Cuotas/{cuotaId}/pago`

Registra el pago **completo** de la cuota (sin pagos parciales). Solo **Administrador** (`SoloAdministrador`).

| Aspecto | Valor |
|--------|--------|
| Método | `PATCH` |
| Ruta | `/FNZ/Cuotas/{cuotaId}/pago` |
| Éxito | `204 No Content` |
| Body | JSON (camelCase) |

Body:

```json
{
  "montoPagado": 1200.00,
  "fechaPago": "2026-10-16",
  "metodoPago": "Transferencia",
  "referenciaPago": "REF-001"
}
```

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `montoPagado` | number | sí | Debe ser **igual** al `monto` de la cuota; `> 0` |
| `fechaPago` | date (ISO) | sí | No futura (zona `America/Mexico_City`) |
| `metodoPago` | string | no | máx. 100 |
| `referenciaPago` | string | sí | máx. 200, no vacía |

Respuestas de error (ejemplos):

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `VALIDATION_ERROR` | Validador FluentValidation (monto 0, referencia vacía, etc.) |
| 401 | — | Sin JWT |
| 403 | `FORBIDDEN` | Usuario no administrador |
| 404 | `NOT_FOUND` | Cuota inexistente o eliminada |
| 409 | `CONFLICT` | Cuota ya pagada o carrera concurrente (segundo PATCH) |
| 422 | `VALIDATION_ERROR` | `montoPagado` ≠ monto de cuota; cuota sin `CuentaID`; catálogo "Pago de cuota" ausente |

> Tras `204`, el residente debe refrescar `GET /FNZ/Cuotas/mis`: la cuota aparece con `estado: "Pagada"` (FE-032 `/finanzas/cuenta`).

---

## 2. Relacionados (mismo flujo smoke)

| Método | Ruta | Rol | Uso |
|--------|------|-----|-----|
| POST | `/FNZ/Cuotas/generar` | Admin | Crear cuotas del período (FNZ-BE-037) |
| GET | `/FNZ/Cuotas/mis` | Residente | Estado de cuenta tras el pago |

---

## Resumen endpoints (este ticket)

| Método | Ruta | Tipo |
|--------|------|------|
| PATCH | `/FNZ/Cuotas/{cuotaId}/pago` | NUEVO |
