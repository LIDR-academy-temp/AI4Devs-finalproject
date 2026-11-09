[← index](_index.md) | [← impl](impl.md)

# delta.md — FNZ-BE-011: Registrar pago de cuota (Admin)

## Resumen del cambio

`PATCH /FNZ/Cuotas/{cuotaId}/pago` (Admin): marca cuota pagada, abono en `fnz.Transacciones`, notificación vía outbox. Tests xUnit del servicio y validador.

## Objetos creados / modificados

| Target:Instancia | Objeto | Acción |
|---|---|---|
| backend:cuartaquinientos-api | `CuotasController` (PATCH pago) | MODIFICADO |
| backend:cuartaquinientos-api | `FinanzasService.RegistrarPagoAsync` | MODIFICADO |
| backend:cuartaquinientos-api | `CuotaPagoRepository`, `RegistrarPagoRequest`, validator | MODIFICADO/NUEVO |
| backend:cuartaquinientos-api | `FinanzasServiceRegistrarPagoTests` | NUEVO |

## Invariantes verificados

| Invariante | Test | Resultado |
|---|---|---|
| INV-1..INV-5 (spec) | `FinanzasServiceRegistrarPagoTests` | ✅ 11/11 |

## Desviaciones vs design.md

Ninguna relevante; smoke HTTP manual pendiente (credenciales entorno).

## Specs de dominio a actualizar

- `specs/finanzas.md` — ya documenta PATCH pago (sin cambio).

## Actualización de _graph.md

- [[FNZ-BE-011]] cierra HU-FNZ-02; desbloquea [[FE-039]] (modal pago).
