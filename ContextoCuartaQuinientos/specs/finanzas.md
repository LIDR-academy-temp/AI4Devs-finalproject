# specs/finanzas.md — Finanzas (source of truth SDD)
> Contexto de dominio para SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo del proyecto se marca (delta).
#finanzas #fnz #cuotas #cuentas #transacciones #cobranza #morosos

## Propósito
Dominio financiero del fraccionamiento (esquema `fnz`). Cubre las cuotas del residente (estado de cuenta, pagos, morosos) y la contabilidad básica del fraccionamiento (cuentas y transacciones de cargo/abono). NO existe una tabla "Pago" separada: el pago se marca directamente en la Cuota.

## Objetos del dominio (tablas + vistas reales)
- `fnz.Cuotas` — CuotaID(PK), UsuarioID(FK), CasaID(FK), CuentaID(FK → `fnz.Cuentas`, cuenta que recibe el abono), Monto, MontoPagado, PeriodoInicio, PeriodoFin, FechaVencimiento, Pagado(bit), FechaPago, MetodoPago, ReferenciaPago. (`CuentaID INT NULL` y `MontoPagado DECIMAL(18,2) NULL` los agrega DB-001.)
- `fnz.Cuentas` — CuentaID(PK), Nombre, Tipo, Saldo, ResponsableUsuarioID(FK). (Físico actual `Cuenta` → readme `Nombre`, DB-001.)
- `fnz.Transacciones` (vista `fnz.vsTransacciones`) — TransaccionID(PK), CuentaID(FK), UsuarioID(FK), TipoMovimientoID(FK), Cargo, Abono, Motivo.
- `fnz.TiposMovimiento` — catálogo con banderas `bCargo` / `bAbono`.
- `fnz.DocumentosTransaccion` — comprobantes ligados a una transacción.
- Auditoría estándar en todas las tablas + soft delete `bEliminado`.

## Catálogos y estados
- Estado de la cuota (derivado en el servicio C#, no en SQL ni columna): **Pagada** (`Pagado=1`), **Pendiente** (`Pagado=0` y `FechaVencimiento >= hoy`), **Vencida** (`Pagado=0` y `FechaVencimiento < hoy`); "hoy" en `America/Mexico_City` (readme §6 FNZ-BE-010).
- `fnz.TiposMovimiento` — tipifica cada transacción como cargo (`bCargo`) o abono (`bAbono`); DB-002 siembra "Pago de cuota" (`bAbono = 1`) y "Gasto" (`bCargo = 1`).
- `fnz.Cuentas` — DB-002 siembra la cuenta "Cuenta de mantenimiento"; valores de `Tipo` `(asumido)`.

## Invariantes (INV-x)
- **INV-1** El pago de una cuota se registra marcando `Pagado = 1` y grabando `FechaPago`, `MontoPagado`, `MetodoPago` y `ReferenciaPago` en la misma fila de `fnz.Cuotas` + abono en `fnz.Transacciones` (cuenta `CuentaID`, tipo "Pago de cuota") en la misma transacción; no se crea una entidad Pago aparte.
- **INV-2** El monto de un pago/cuota debe ser mayor a cero (error "El monto debe ser mayor a cero"); en Fase 1 `MontoPagado` = `Monto` (sin pagos parciales, `422` si difiere).
- **INV-2b** Una cuota ya pagada no se paga de nuevo (`UPDATE … WHERE Pagado = 0` afecta exactamente 1 fila; si no, `409` "Cuota ya registrada como pagada").
- **INV-2c** La generación de cuotas es idempotente por (`CasaID`, `PeriodoInicio`).
- **INV-3** Una cuota está **Vencida** si `Pagado = 0` y `FechaVencimiento < hoy`; el reporte de morosos se construye con este criterio.
- **INV-4** Cada `fnz.Transacciones` referencia un `TipoMovimientoID` cuyo `bCargo`/`bAbono` es consistente con las columnas `Cargo`/`Abono` (una transacción es cargo o abono, no ambos).
- **INV-5** Al registrar un pago se notifica al residente (portal y Telegram si está vinculado).
- **INV-6** Soft delete con `bEliminado`; los movimientos no se borran físicamente para preservar la contabilidad.
- **INV-7** Toda cuota está ligada a un `UsuarioID` y a una `CasaID`; el estado de cuenta se consulta por residente/casa.

## Historias del dominio
- **HU-FNZ-01 [M]** Consultar estado de cuenta — tabla de cuotas (período, monto, vencimiento, estado); las vencidas se destacan con el total a regularizar.
- **HU-FNZ-02 [M]** Registrar pago de cuota (Admin) — al registrar monto/fecha/referencia deja `Pagado=1`, `FechaPago`, `MontoPagado`, `ReferenciaPago` y notifica al residente (portal; Telegram si está vinculado, entrega en Fase 2); rechaza monto cero, monto distinto a la cuota y doble registro.
- **HU-FNZ-03 [M]** Reporte de morosos (Admin) — lista con casa, nombre, cuotas adeudadas y total pendiente; mensaje "Sin morosos" si todos al corriente.
- **HU-FNZ-04 [S]** Registro de movimientos contables (Admin) — cargos y abonos en `fnz.Transacciones` para la contabilidad básica.
- **HU-FNZ-05 [C]** Exportar estado de cuenta en PDF — descarga de comprobante (QuestPDF).
- **HU-FNZ-06 [M]** Generar cuotas del período (Admin, habilitador) — período (mes/año), monto y vencimiento → una cuota por casa con ocupante vigente, a nombre del responsable (propietario que habita o arrendatario vigente); idempotente (omite casas ya generadas y reporta creadas/omitidas); monto ≤ 0 o vencimiento anterior al período → error.
- **HU-BOT-03 [M]** Consultar estado de cuenta desde Telegram — `/cuotas` responde últimas cuotas (período, monto, estado) y destaca el total adeudado.
- **HU-BOT-07 [S]** (relacionada) Sugerencia proactiva de cobro — el bot avisa de cuotas vencidas con botón de acción (registro en `bot.Sugerencias`, ver dominio Bot).

## UI web (admin / residente)
- `/finanzas/cuenta` (residente, FE-032) — estado de cuenta propio.
- `/admin/finanzas` (admin, FE-039) — búsqueda `usuarioId`, registrar pago, morosos, generar cuotas del período.

## Endpoints (/FNZ/{Controller})
- `GET /FNZ/Cuotas/mis` (residente, `sub`) y `GET /FNZ/Cuotas?usuarioId={id}` (Admin) → `{ cuotas: [...], totalPendiente, totalVencido }` con `esVencida` — FNZ-BE-010.
- `PATCH /FNZ/Cuotas/{cuotaId}/pago` (Admin, `SoloAdministrador`; `404`/`409`/`422`) — FNZ-BE-011.
- `POST /FNZ/Cuotas/generar` (Admin) body `{ anio, mes, monto, fechaVencimiento, cuentaId }` → `{ creadas, omitidas }` — FNZ-BE-037.
- `GET /Reports/Reportes/Morosos?mes=&anio=` (Admin) → `[{ usuarioId, nombre, casa, cuotasVencidas, totalAdeudado }]` — FNZ-BE-012.
- `/FNZ/Cuentas`, `/FNZ/Transacciones`, `/FNZ/TiposMovimiento`, `/FNZ/DocumentosTransaccion` — controladores del inventario §4 (HU-FNZ-04 `[S]`, fuera de Fase 1).
- Reportes financiero mensual / estado de cuenta PDF vía `/Reports/Reportes` (QuestPDF/ClosedXML), fuera de Fase 1.

## Reutilización / objetos existentes (escalera)
- Reusar `fnz.vsTransacciones` para lecturas de movimientos.
- El pago vive en la Cuota — NO crear tabla Pago ni entidad Payment.
- El estado (Pagada/Pendiente/Vencida) es derivado — calcularlo en el servicio, no persistir una columna de estado nueva.
- Reportes con QuestPDF (PDF) y ClosedXML (Excel) ya disponibles — reutilizar el servicio de reportes.
- El bot consulta los mismos endpoints REST con el JWT del residente — no duplicar la lógica financiera.

## Deltas del proyecto (nuevo)
- **(delta)** Notificación de pago a Telegram vía el notificador saliente + idempotencia en `ntf.NotificacionesEntrega` (ver dominios Notificaciones/Bot).
- **(delta)** Sugerencias proactivas de cobro en `bot.Sugerencias` (Tipo COBRO) — no altera el esquema `fnz`.
- **(delta)** `fnz.Cuotas.CuentaID` + `MontoPagado` (DB-001).
- Sin pasarela de pagos (Non-goal FNZ Fase 1, readme §5); el pago lo registra el Admin.

## Frontend admin (SPA) — vigente

- Ruta `/admin/finanzas` ([[FE-CRUD-001]]): shell `cq-admin`; tab **Morosos** con `AdminFilterableTable`; tab **Cuotas** aún con `CuotasTable` legacy; pagos en `RegistrarPagoModal`.

## Notas
- Sin stored procedures: Dapper + vistas `vs*` + servicios C#; validación con FluentValidation; transacciones vía `IDbTransaction`.
- Nombres reales del esquema español (`fnz`); soft delete con `bEliminado` (NO `IsActive`).
- No existe tabla de auditoría dedicada; la auditoría es por columnas (Creado/Modificado/Usuario…/Fecha…).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-30 | [[PROD-UX-001]] | Morosos: columna moras, aplicar/condonar lote; `MontoMora` + endpoints batch |
| 2026-10-23 | [[FE-CRUD-001]] | Finanzas admin: morosos con tabla filtrable; tabs Bootstrap |
