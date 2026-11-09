[← index](_index.md) | [design →](design.md)

# spec.md — FNZ-BE-010: Consulta de estado de cuenta del residente

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como Residente, quiero consultar mi estado de cuenta (cuotas pagadas, pendientes y vencidas con sus totales), para conocer mi situación con el fraccionamiento (HU-FNZ-01, readme §5).

## Contexto / problema

- **Actual:** no existe endpoint de estado de cuenta; el residente no puede consultar sus cuotas (readme §1.1). `fnz.Cuotas` existe en el esquema físico; `CuentaID` y `MontoPagado` los agrega DB-001 (readme §3.2, diccionario lógico ↔ físico).
- **Esperado (readme §6 Ticket 10):** `GET /FNZ/Cuotas/mis` (identidad del JWT, `UsuarioID = sub`) y `GET /FNZ/Cuotas?usuarioId={id}` (solo `bAdministrador = 1`) devuelven `{ cuotas: [...], totalPendiente, totalVencido }` con estado derivado Pagada / Pendiente / Vencida y `esVencida: true` en las vencidas.
- **Investigación:** [specs/finanzas.md](../../specs/finanzas.md) (INV-3, INV-6, INV-7; estado derivado en servicio C#, no persistido); `_graph.md` → consumidores del mismo contrato: [[FE-032]] (pantalla), [[DASH-BE-014]] (`estadoCuotaMes`, `avisoVencida`), [[BOT-BE-019]] (`/cuotas` llama `GET /FNZ/Cuotas/mis`, readme §6 Ticket 19). Las cuotas las crea [[FNZ-BE-037]] (HU-FNZ-06).
- Sin stored procedures (ADR-001): `FinanzasService` + Dapper parametrizado.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `GET /FNZ/Cuotas/mis` con `UsuarioID` tomado del claim `sub` (nunca de query/body).
- `GET /FNZ/Cuotas?usuarioId={id}` solo para `bAdministrador = 1`; residente → `403 FORBIDDEN`.
- Query Dapper parametrizada sobre `fnz.Cuotas` con join a `sgr.Casas` (`Direccion`, `Numero`) y `fnz.Cuentas` (vía `CuentaID`), `bEliminado = 0`.
- Clasificación en `FinanzasService` (C#): `Pagado = 1` → "Pagada"; `Pagado = 0 AND FechaVencimiento >= hoy` → "Pendiente"; `Pagado = 0 AND FechaVencimiento < hoy` → "Vencida"; "hoy" en `America/Mexico_City`.
- Respuesta `{ cuotas: [...], totalPendiente, totalVencido }`; cada vencida con `esVencida: true`.
- Tests: residente sin deudas, mezcla de estados, acceso cruzado (`403`).

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Orden de `cuotas` por `PeriodoInicio DESC` `(asumido)`.
- Contrato documentado en `/swagger` con códigos 200/401/403 (DoD endpoint, readme §5).

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Ninguno.

### Won't — fuera de alcance explícito
- Exportar estado de cuenta en PDF (HU-FNZ-05 `[C]`, Non-goals FNZ Fase 1).
- Recargos / intereses por mora, pagos parciales o abonos a cuenta (Non-goals FNZ Fase 1).
- Persistir una columna de estado en `fnz.Cuotas` (finanzas.md → Reutilización).
- Paginación o filtros por período en `/mis` (no pedidos en Ticket 10).
- UI (lo cubre FE-032).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Solo lectura de `fnz.Cuotas`, `sgr.Casas`, `fnz.Cuentas`; sin DDL (depende de DB-001: `CuentaID`, `Casas.Direccion/Numero`) |
| `backend:cuartaquinientos-api` | Nuevo `CuotasController` (`/FNZ/Cuotas`) + `FinanzasService.ObtenerEstadoCuentaAsync` + DTOs |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Una cuota está **Vencida** si `Pagado = 0` y `FechaVencimiento < hoy` (finanzas INV-3) | `specs/finanzas.md` |
| INV-2 | El estado (Pagada/Pendiente/Vencida) es derivado en el servicio C#; no se persiste columna de estado | `specs/finanzas.md` (Catálogos y estados; Reutilización) |
| INV-3 | Toda cuota está ligada a `UsuarioID` y `CasaID`; el estado de cuenta se consulta por residente (finanzas INV-7) | `specs/finanzas.md` |
| INV-4 | Soft delete `bEliminado`; las cuotas eliminadas no se muestran ni se suman (finanzas INV-6) | `specs/finanzas.md` |
| INV-5 | Identidad siempre del JWT (`sub` = `UsuarioID`); nunca del cuerpo/query para el propio residente | `CLAUDE.md` (convenciones) · readme ADR-003 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: residente con mezcla de estados — **Dado** un Residente autenticado (`sub = 10`) con 3 cuotas activas: una `Pagado = 1`, una `Pagado = 0` con `FechaVencimiento` = mañana y una `Pagado = 0` con `FechaVencimiento` = ayer (hora `America/Mexico_City`) **Cuando** llama `GET /FNZ/Cuotas/mis` **Entonces** `CuotasController` responde `200` con 3 cuotas con estados "Pagada", "Pendiente", "Vencida"; solo la vencida trae `esVencida: true`; `totalPendiente` = monto de la pendiente y `totalVencido` = monto de la vencida `(asumido: totalPendiente excluye vencidas)`.
- [ ] **CA-2 [M]**: vence hoy sigue pendiente — **Dado** una cuota `Pagado = 0` con `FechaVencimiento` = hoy en `America/Mexico_City` (aunque en UTC ya sea mañana) **Cuando** el residente llama `GET /FNZ/Cuotas/mis` **Entonces** la cuota llega con estado "Pendiente" y `esVencida: false`.
- [ ] **CA-3 [M]**: residente sin deudas — **Dado** un Residente cuyas cuotas activas tienen todas `Pagado = 1` **Cuando** llama `GET /FNZ/Cuotas/mis` **Entonces** `200` con todas en "Pagada", `totalPendiente = 0` y `totalVencido = 0`.
- [ ] **CA-4 [M]**: residente sin cuotas — **Dado** un Residente sin filas en `fnz.Cuotas` **Cuando** llama `GET /FNZ/Cuotas/mis` **Entonces** `200` con `{ cuotas: [], totalPendiente: 0, totalVencido: 0 }` (no `404`).
- [ ] **CA-5 [M]**: acceso cruzado — **Dado** un Residente (`bAdministrador = 0`) **Cuando** llama `GET /FNZ/Cuotas?usuarioId=11` **Entonces** `CuotasController` responde `403` `ProblemDetails` con `code = FORBIDDEN` y no ejecuta la consulta.
- [ ] **CA-6 [M]**: administrador consulta a un residente — **Dado** un usuario con `bAdministrador = 1` **Cuando** llama `GET /FNZ/Cuotas?usuarioId=10` **Entonces** `200` con el mismo payload que obtendría el residente 10 en `/mis`.
- [ ] **CA-7 [M]**: identidad del JWT — **Dado** un Residente `sub = 10` **Cuando** llama `GET /FNZ/Cuotas/mis?usuarioId=11` **Entonces** la respuesta contiene solo cuotas con `UsuarioID = 10` (el parámetro se ignora).
- [ ] **CA-8 [M]**: sin autenticación — **Dado** una petición sin `Authorization` **Cuando** llama `GET /FNZ/Cuotas/mis` **Entonces** `401`.
- [ ] **CA-9 [S]**: join de casa y cuenta — **Dado** una cuota con `CasaID` y `CuentaID` válidos **Cuando** se consulta **Entonces** el ítem incluye `Direccion`/`Numero` de `sgr.Casas` y `Nombre` de `fnz.Cuentas`; con `CuentaID = NULL` la cuota se devuelve igual con cuenta `null` `(asumido: LEFT JOIN)`.
- [ ] **CA-R1 [M]**: regresión de INV-4 — **Dado** una cuota `Pagado = 0`, vencida y con `bEliminado = 1` **Cuando** el residente llama `GET /FNZ/Cuotas/mis` **Entonces** no aparece en `cuotas` ni suma en `totalVencido`.
- [ ] **CA-R2 [M]**: regresión de INV-2 — **Dado** el esquema de `fnz.Cuotas` tras DB-001 **Cuando** se implementa FNZ-BE-010 **Entonces** no se agrega columna de estado ni vista nueva (diff de SQL vacío para este ticket).

## Reutilización detectada (evidencia de la escalera — regla 6)

- `fnz.Cuotas` + `sgr.Casas` + `fnz.Cuentas` → se reutilizan tal cual (post DB-001); no se crea vista `vs*` porque no existe una vista de cuotas (finanzas.md lista solo `fnz.vsTransacciones`) y un join de 3 tablas en Dapper basta.
- Política `SoloAdministrador` (readme Ticket 11) / claim `bAdministrador` → se reutiliza la verificación de admin para `?usuarioId=`.
- `IDbConnectionFactory`, `UsuarioActual`, `Result<T>` y mapeo `Result` → HTTP (readme Ticket 33 SETUP-000) → se reutilizan.
- `TimeProvider` (.NET 8+, nativo) → fuente de "ahora" inyectable para calcular "hoy" en `America/Mexico_City` y testear bordes.
- Vista nueva de estado de cuenta → evaluada y descartada (INV-2: el estado no vive en SQL).

## Definition of Ready

- [x] **I**ndependent — depende de USR-BE-007 (JWT) y DB-001 (columnas); dependencias documentadas en `_index.md`
- [x] **N**egotiable — Should/Could ajustables vía escalación
- [x] **V**aluable — cada Must entrega consulta observable del estado de cuenta
- [x] **E**stimable — 3 h (readme §6 Ticket 10)
- [x] **S**mall — un endpoint con dos rutas y un método de servicio
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (objetos declarados en readme §3.2; verificación MCP pendiente Entrega 2 — BD no desplegada)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must (las abiertas tienen supuesto adoptado y no bloquean)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Cálculo de "hoy" en UTC del servidor clasifica mal cuotas que vencen hoy | Alta | `TimeProvider` + `TimeZoneInfo` `America/Mexico_City`; CA-2 con reloj falso cerca de medianoche |
| `FechaVencimiento` es `datetime`: comparar con hora en vez de fecha | Media | Comparar `DateOnly` (fecha local) contra `FechaVencimiento.Date` `(asumido)` |
| Contrato consumido por FE-032, DASH-BE-014 y BOT-BE-019: cambiarlo rompe 3 clientes | Media | Contrato fijo en §4/swagger; test de contrato del payload |
| Id de zona horaria no resuelto en el host (Windows vs Linux) | Baja | .NET 6+ resuelve IANA con ICU; test de arranque que resuelva la zona |

## Preguntas abiertas

- ¿`totalPendiente` suma solo "Pendiente" o también "Vencida"? → **pendiente; supuesto adoptado: solo Pendiente (`totalVencido` aparte)** `(asumido)`.
- `GET /FNZ/Cuotas` de Admin sin `usuarioId` → **pendiente; supuesto: `400 VALIDATION_ERROR`** `(asumido)`.
- `?usuarioId=` de un usuario inexistente → **pendiente; supuesto: `200` con lista vacía (no se filtra existencia)** `(asumido)`.
- Guardia/Trabajador llamando `/mis` → **pendiente; supuesto: `200` con sus cuotas (normalmente vacías), sin restricción de perfil** `(asumido)`.
- Orden de `cuotas` → **pendiente; supuesto: `PeriodoInicio DESC`** `(asumido)`.
- `CuentaID = NULL` en cuotas previas a DB-001 → **pendiente; supuesto: `LEFT JOIN`, cuenta `null`** `(asumido)`.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
