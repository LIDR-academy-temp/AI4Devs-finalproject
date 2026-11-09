[← index](_index.md) | [design →](design.md)

# spec.md — FNZ-BE-011: Registrar pago de cuota (Admin)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `desarrollador-tdd`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como Administrador, quiero registrar el pago de una cuota (monto, fecha, método y referencia), para actualizar el estado de cuenta del residente y que este reciba la notificación (HU-FNZ-02, readme §5).

## Contexto / problema

- **Actual:** no hay forma de marcar una cuota como pagada; la conciliación se lleva en hojas de cálculo (readme §1.1). No existe tabla Pago: el pago vive en la propia fila de `fnz.Cuotas` (finanzas.md, INV-1).
- **Esperado (readme §6 Ticket 11):** `PATCH /FNZ/Cuotas/{cuotaId}/pago` (política `SoloAdministrador`) marca `Pagado = 1` + `FechaPago`, `MontoPagado`, `MetodoPago`, `ReferenciaPago`, inserta el abono en `fnz.Transacciones` (tipo "Pago de cuota", `bAbono = 1`, cuenta `CuentaID` de la cuota) y notifica `PAGO_REGISTRADO` vía `INotificacionService` (que encola la entrega Telegram en `ntf.NotificacionesEntrega`; en Fase 1 solo encola). Todo en una transacción atómica, resistente a doble registro concurrente.
- **Investigación:** [specs/finanzas.md](../../specs/finanzas.md) (INV-1, INV-2, INV-2b, INV-4, INV-5, INV-6), [specs/notificaciones.md](../../specs/notificaciones.md) (INV-4, INV-7), ADR-009 (outbox). El readme §6 Ticket 11 trae el fragmento de `FinanzasService.RegistrarPagoAsync` (`UPDLOCK, ROWLOCK` + `UPDATE … WHERE Pagado = 0` + `INSERT … SELECT` desde `fnz.TiposMovimiento` + `NotificarUsuarioAsync`). El consumidor UI es [[FE-039]] (modal con monto precargado no editable; `409` → mensaje y refresco).
- **Non-goals FNZ Fase 1 (readme §5):** sin pasarela de pago, sin conciliación bancaria, sin pagos parciales ni abonos a cuenta, sin recargos.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `PATCH /FNZ/Cuotas/{cuotaId}/pago` protegido con política `SoloAdministrador` (`bAdministrador = 1`).
- Validación (FluentValidation): `MontoPagado > 0` (`400`), `ReferenciaPago` requerida (`400`), `FechaPago ≤ hoy` (`400`).
- `404 NOT_FOUND` si la cuota no existe (o `bEliminado = 1`).
- `422 VALIDATION_ERROR` si `MontoPagado ≠ Monto` de la cuota (sin pagos parciales).
- `409 CONFLICT` "Cuota ya registrada como pagada" si ya lo estaba o si otro admin la pagó en paralelo: `UPDATE fnz.Cuotas … WHERE CuotaID = @id AND Pagado = 0` afecta exactamente 1 fila.
- En una sola `IDbTransaction`: `UPDATE fnz.Cuotas` (con auditoría `Modificado`, `UsuarioModificacionID`, `FechaModificacion`), `INSERT fnz.Transacciones` (`Abono = MontoPagado`, `Cargo = 0`, `Motivo = "Pago cuota #id"`, `CuentaID` de la cuota), `INotificacionService.NotificarUsuarioAsync(..., "PAGO_REGISTRADO", ...)`; cualquier fallo → rollback.
- Tests: éxito, ya pagada (409), concurrente (409 en el segundo), monto cero (400), monto distinto (422), inexistente (404).

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Si el tipo "Pago de cuota" no existe (DB-002 no aplicado) el `INSERT … SELECT` afecta 0 filas → rollback y error, no pago sin abono `(asumido)`.
- Si la cuota no tiene `CuentaID` → `422 VALIDATION_ERROR` antes de escribir `(asumido)`.
- Swagger con 204/400/401/403/404/409/422 (DoD endpoint, readme §5).

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Ninguno.

### Won't — fuera de alcance explícito
- Pagos parciales, abonos a cuenta, recargos o intereses (Non-goals FNZ Fase 1).
- Pasarela de pago en línea / conciliación bancaria / CFDI (Non-goals FNZ Fase 1).
- Anular o revertir un pago ya registrado (no pedido en Ticket 11).
- Envío real a Telegram (Fase 2, BOT-BE-020); aquí solo se encola vía `INotificacionService`.
- Tabla o entidad `Pago` nueva (finanzas INV-1).
- UI del modal (FE-039).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Escritura en `fnz.Cuotas` (UPDATE) y `fnz.Transacciones` (INSERT); lectura de `fnz.TiposMovimiento`; escritura indirecta en `ntf.Notificaciones` / `ntf.NotificacionesEntrega` vía `INotificacionService`; sin DDL |
| `backend:cuartaquinientos-api` | Nueva acción `PATCH` en `CuotasController` + `FinanzasService.RegistrarPagoAsync` + `RegistrarPagoInput` + validador |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | El pago se registra en la misma fila de `fnz.Cuotas` (`Pagado`, `FechaPago`, `MontoPagado`, `MetodoPago`, `ReferenciaPago`) + abono en `fnz.Transacciones` en la misma transacción; no hay entidad Pago (finanzas INV-1) | `specs/finanzas.md` |
| INV-2 | Monto > 0 y, en Fase 1, `MontoPagado = Monto` (`422` si difiere) (finanzas INV-2) | `specs/finanzas.md` · readme §5 Non-goals FNZ |
| INV-3 | Una cuota ya pagada no se paga de nuevo: `UPDATE … WHERE Pagado = 0` afecta exactamente 1 fila, si no `409` (finanzas INV-2b) | `specs/finanzas.md` |
| INV-4 | Cada transacción es cargo **o** abono, consistente con `bCargo`/`bAbono` de su `TipoMovimientoID` (finanzas INV-4) | `specs/finanzas.md` |
| INV-5 | Al registrar un pago se notifica al residente (finanzas INV-5) | `specs/finanzas.md` |
| INV-6 | `INotificacionService` es el único punto que inserta en `ntf.Notificaciones`, usa la conexión/transacción del llamador y encola `PENDIENTE` en `ntf.NotificacionesEntrega` si hay Telegram vinculado; un fallo de Telegram no revierte la operación de negocio (notificaciones INV-7, ADR-009) | `specs/notificaciones.md` |
| INV-7 | Soft delete `bEliminado`; los movimientos contables no se borran físicamente (finanzas INV-6) | `specs/finanzas.md` |

## Criterios de aceptación

- [ ] **CA-1 [M]**: pago exitoso — **Dado** un Administrador y la cuota 50 (`Pagado = 0`, `Monto = 1200.00`, `CuentaID = 1`, `UsuarioID = 10`) **Cuando** llama `PATCH /FNZ/Cuotas/50/pago` con `{ montoPagado: 1200.00, fechaPago: hoy, metodoPago: "Transferencia", referenciaPago: "REF-001" }` **Entonces** `CuotasController` responde `204` `(asumido)`; la fila 50 queda con `Pagado = 1`, esos 4 campos, `Modificado` = correo del admin, `UsuarioModificacionID` = `sub`, `FechaModificacion` no nula; existe 1 fila nueva en `fnz.Transacciones` (`CuentaID = 1`, `UsuarioID = 10`, `Abono = 1200.00`, `Cargo = 0`, `Motivo = "Pago cuota #50"`, tipo "Pago de cuota") y 1 fila en `ntf.Notificaciones` tipo `PAGO_REGISTRADO` para el usuario 10.
- [ ] **CA-2 [M]**: ya pagada — **Dado** la cuota 50 con `Pagado = 1` **Cuando** un Administrador llama `PATCH /FNZ/Cuotas/50/pago` con body válido **Entonces** `409 CONFLICT` "Cuota ya registrada como pagada" y no se inserta `fnz.Transacciones` ni notificación.
- [ ] **CA-3 [M]**: concurrencia — **Dado** la cuota 50 con `Pagado = 0` **Cuando** dos Administradores llaman `PATCH /FNZ/Cuotas/50/pago` en paralelo **Entonces** exactamente una responde `204` y la otra `409`; `fnz.Transacciones` tiene 1 sola fila `Motivo = "Pago cuota #50"` y `ntf.Notificaciones` 1 sola `PAGO_REGISTRADO` para esa cuota.
- [ ] **CA-4 [M]**: monto cero — **Dado** un Administrador **Cuando** envía `montoPagado: 0` **Entonces** `400 VALIDATION_ERROR` "El monto debe ser mayor a cero" y la cuota no cambia.
- [ ] **CA-5 [M]**: monto distinto — **Dado** la cuota 50 con `Monto = 1200.00` **Cuando** envía `montoPagado: 600.00` **Entonces** `422 VALIDATION_ERROR` "El monto debe coincidir con la cuota (pagos parciales fuera de alcance)" y la cuota no cambia.
- [ ] **CA-6 [M]**: inexistente — **Dado** que no existe `CuotaID = 9999` activa **Cuando** llama `PATCH /FNZ/Cuotas/9999/pago` **Entonces** `404 NOT_FOUND`.
- [ ] **CA-7 [M]**: referencia y fecha — **Dado** un Administrador **Cuando** envía `referenciaPago` vacía o `fechaPago` = mañana (`America/Mexico_City`) **Entonces** `400 VALIDATION_ERROR` sin escrituras.
- [ ] **CA-8 [M]**: solo Administrador — **Dado** un Residente autenticado **Cuando** llama `PATCH /FNZ/Cuotas/50/pago` **Entonces** `403 FORBIDDEN` y la cuota no cambia.
- [ ] **CA-9 [M]**: atomicidad — **Dado** que `INotificacionService.NotificarUsuarioAsync` lanza excepción (p. ej. tipo `PAGO_REGISTRADO` inexistente) **Cuando** el Administrador registra el pago **Entonces** rollback total: la cuota sigue `Pagado = 0` y no hay fila nueva en `fnz.Transacciones`.
- [ ] **CA-10 [S]**: tipo de movimiento ausente — **Dado** que no existe "Pago de cuota" (`bAbono = 1`) en `fnz.TiposMovimiento` **Cuando** se registra el pago **Entonces** el `INSERT … SELECT` afecta 0 filas, se hace rollback y se responde error sin marcar la cuota `(asumido)`.
- [ ] **CA-11 [S]**: cuota sin cuenta — **Dado** una cuota con `CuentaID = NULL` **Cuando** se registra el pago **Entonces** `422 VALIDATION_ERROR` sin escrituras `(asumido)`.
- [ ] **CA-R1 [M]**: regresión de INV-6 / ADR-009 — **Dado** el residente 10 con `bot.CuentasTelegram.Activo = 1` **Cuando** se registra el pago de su cuota **Entonces** dentro de la misma transacción queda 1 fila `PENDIENTE` (canal TELEGRAM) en `ntf.NotificacionesEntrega`; ningún código de FNZ-BE-011 inserta directo en `ntf.*` ni llama a Telegram.
- [ ] **CA-R2 [M]**: regresión de INV-4 — **Dado** un pago registrado **Cuando** se lee la transacción creada **Entonces** `Cargo = 0`, `Abono > 0` y su `TipoMovimientoID` tiene `bAbono = 1`.

## Reutilización detectada (evidencia de la escalera — regla 6)

- `fnz.Cuotas` (columnas de pago ya existen + `MontoPagado`/`CuentaID` de DB-001) → se reutiliza; no se crea tabla Pago (INV-1).
- `fnz.Transacciones` + `fnz.TiposMovimiento` ("Pago de cuota" sembrado por DB-002) → se reutilizan; tipo resuelto por nombre, sin ID hardcodeado.
- `INotificacionService.NotificarUsuarioAsync(conn, tx, usuarioId, "PAGO_REGISTRADO", …)` ([[NTF-BE-013]]) → se reutiliza; encola outbox.
- `CuotasController` y `FinanzasService` ([[FNZ-BE-010]]) → se extienden (peldaño 4), no se duplican.
- Política `SoloAdministrador`, `UsuarioActual`, `Result<T>` → mapeo HTTP (SETUP-000) → se reutilizan.
- Bloqueo optimista vía `WHERE Pagado = 0` + `UPDLOCK, ROWLOCK` (nativo SQL Server) → evaluado frente a columna `rowversion`: descartada (requiere DDL, peldaño 2 ya resuelve).

## Definition of Ready

- [x] **I**ndependent — depende de FNZ-BE-010 y NTF-BE-013 (readme §6 Ticket 11); documentado en `_index.md`
- [x] **N**egotiable — Should ajustables vía escalación
- [x] **V**aluable — el Admin concilia y el residente es notificado
- [x] **E**stimable — 4 h (readme §6 Ticket 11)
- [x] **S**mall — una acción + un método de servicio transaccional
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (declarados en readme §3.2 / DB-002; MCP pendiente Entrega 2)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must (abiertas con supuesto adoptado)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Doble registro concurrente genera dos abonos | Alta | `UPDLOCK, ROWLOCK` + `WHERE Pagado = 0` con verificación `filas == 1`; test CA-3 con dos conexiones reales |
| `INSERT … SELECT` desde `fnz.TiposMovimiento` inserta 0 filas si falta el catálogo → cuota pagada sin abono | Alta | Verificar filas insertadas = 1; si no, rollback (CA-10) |
| Orden de validaciones del fragmento del readme: con cuota ya pagada y monto distinto responde `422` en vez de `409` | Media | Validar `Pagado` tras leer con `UPDLOCK` antes del monto → `404 → 409 → 422` `(asumido)`; ver Preguntas abiertas |
| Firma de `INotificacionService` definida en NTF-BE-013 y aún sin implementar | Media | Usar la firma del readme §6 Ticket 11; si cambia, ajustar en NTF-BE-013 primero |
| `FechaPago ≤ hoy` evaluado en UTC | Media | "hoy" en `America/Mexico_City` con `TimeProvider`, igual que FNZ-BE-010 `(asumido)` |

## Preguntas abiertas

- Código de éxito del `PATCH` → **pendiente; supuesto: `204 No Content`** (el readme no lo fija; FE-039 refresca la tabla) `(asumido)`.
- Orden de chequeos cuando la cuota ya está pagada y el monto difiere → **pendiente; supuesto: `409` tiene prioridad sobre `422`** `(asumido)`.
- `MetodoPago` ¿requerido? → **pendiente; supuesto: opcional (el readme solo exige `ReferenciaPago`)** `(asumido)`.
- Cuota sin `CuentaID` → **pendiente; supuesto: `422`** `(asumido)`.
- Catálogo "Pago de cuota" ausente → **pendiente; supuesto: rollback + `500`/error controlado, nunca pago sin abono** `(asumido)`.
- Zona de "hoy" para `FechaPago` → **pendiente; supuesto: `America/Mexico_City`** `(asumido)`.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
