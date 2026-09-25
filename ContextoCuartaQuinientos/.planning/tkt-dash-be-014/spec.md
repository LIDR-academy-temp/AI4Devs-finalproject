[← index](_index.md) | [design →](design.md)

# spec.md — DASH-BE-014: Dashboard — KPIs Admin y resumen residente

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `api-tester`)
> **Tipo:** Feature

## User story

Como Administrador, quiero ver los KPIs operativos del fraccionamiento del mes en curso, y como Residente, quiero ver un resumen de mi actividad al iniciar sesión, para tomar decisiones operativas y conocer mi situación sin navegar por varios módulos.

## Contexto / problema

- **Actual:** no existe endpoint de dashboard. El dominio **no tiene tablas propias** ([specs/dashboard.md](../../specs/dashboard.md)); agrega datos de TKT (`tkt.vsTickets`, `tkt.Tickets.CanalID`), FNZ (`fnz.Cuotas`), SGR (`sgr.CasaOcupantes`, `sgr.Casas`) y NTF (`ntf.Notificaciones` + `ntf.NotificacionesVisualizadas`).
- **Esperado (readme §6 Ticket 14 + §4 Endpoint 3):** `ResumenController` expone `GET /Dashboard/Resumen?mes=&anio=` que detecta el perfil por el claim `bAdministrador` y devuelve `ResumenAdmin` (`tipo = ADMIN`: `ticketsNuevos`, `ticketsEnSeguimiento`, `morososMes`, `montoCobrado`, `montoPendiente`, `ocupacion`, `ticketsPorCanal { web, telegram }`) o `ResumenResidente` (`tipo = RESIDENTE`: `ticketsActivos`, `estadoCuotaMes { monto, fechaVencimiento, estado }`, `notificacionesNoLeidas`, `avisoVencida`); Guardia/Trabajador → `403`; sin token → `401`.
- **Reglas compartidas:** morosidad = `Pagado = 0 AND FechaVencimiento < hoy` (readme §3.2, §4, compartida con RPT FNZ-BE-012); estado de cuota Pagada/Pendiente/Vencida calculado en C# como en FNZ-BE-010; no leídas = sin fila en `ntf.NotificacionesVisualizadas` (readme §3.2, NTF-BE-013).
- **`estadoCuotaMes` confirmado (readme §6 Ticket 14 alineado con §4 Endpoint 3):** `{ monto, fechaVencimiento, estado ∈ Pagada | Pendiente | Vencida }` de la cuota del período actual, con `estado` derivado de `Pagado` y `FechaVencimiento`; `null` si no hay cuota del período.
- **Non-goals Dashboard Fase 1 (readme §5):** solo lectura sobre `vs*`, sin drill-down ni exportación, período fijo al mes actual en la UI, sin tendencias (BI Fase 3).

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `GET /Dashboard/Resumen` único, autenticado, con respuesta `oneOf` por perfil y campo `tipo`; Guardia/Trabajador → `403`.
- KPIs Admin: `ticketsNuevos`, `ticketsEnSeguimiento`, `morososMes`, `montoCobrado`, `montoPendiente`, `ocupacion`, `ticketsPorCanal { web, telegram }` con las fórmulas de readme Ticket 14.
- Resumen Residente: `ticketsActivos`, `estadoCuotaMes`, `notificacionesNoLeidas`, `avisoVencida`, filtrados por `UsuarioID = sub`.
- Sin datos → KPIs en 0 (no error); "hoy" y mes en curso en `America/Mexico_City`.
- Consultas parametrizadas; ninguna escritura; ninguna tabla propia.
- Tests: Admin con datos mixtos (cada KPI), Admin sin datos (ceros), Residente con cuota vencida, Residente al corriente.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Parámetros opcionales `mes` (1-12) y `anio` (≥ 2024) de §4 con validación `400 VALIDATION_ERROR`; por defecto mes en curso.

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Exposición equivalente por GraphQL (ADR-002 menciona dashboard) — ninguno en este ticket si no sale gratis.

### Won't — fuera de alcance explícito
- Tablas, vistas o snapshots propios del dashboard; tendencias o comparativas (`bi.KpiSnapshots`, BI-BE-023).
- "Últimas notificaciones" dentro del payload (HU-DASH-02): FE-040 las obtiene de `GET /NTF/Notificaciones` (asumido).
- Monto total a regularizar en el payload (HU-DASH-02 "aviso destacado con monto"): §4 solo define `avisoVencida` booleano; el detalle sale de `GET /FNZ/Cuotas/mis` (FNZ-BE-010) (asumido).
- Drill-down, exportación, rango de fechas configurable en la UI.
- Tablero para Guardia o Trabajador.
- Frontend de tarjetas KPI (FE-040).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Sin DDL ni escrituras. Lecturas Dapper sobre `tkt.vsTickets` (ampliada por DB-001 con canal/casa), `fnz.Cuotas`, `sgr.CasaOcupantes`, `sgr.Casas`, `ntf.Notificaciones`, `ntf.NotificacionesVisualizadas`, `tkt.CanalesTicket`. |
| `backend:cuartaquinientos-api` | Nuevo `ResumenController` (`/Dashboard/Resumen`), `IDashboardService`/`DashboardService`, `DashboardRepository`, DTOs `ResumenAdmin`/`ResumenResidente`. |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Dashboard es solo lectura; no persiste datos propios. | `specs/dashboard.md` INV-1; readme §6 Ticket 14 |
| INV-2 | Perfil por claim `bAdministrador`: `1` → `ResumenAdmin`; Residente → `ResumenResidente`; Guardia/Trabajador → `403`. | `specs/dashboard.md` INV-2; readme §4 Endpoint 3 |
| INV-3 | `morososMes` = `COUNT DISTINCT UsuarioID` de `fnz.Cuotas` con `Pagado = 0` y `FechaVencimiento < hoy` (definición única compartida con RPT/BI). | `specs/dashboard.md` INV-3; readme §3.2 |
| INV-4 | `ticketsPorCanal` (`web`, `telegram`) agrupa los tickets del mes por `tkt.Tickets.CanalID`. | `specs/dashboard.md` INV-4; readme HU-DASH-01 |
| INV-5 | El resumen del residente muestra solo datos del `UsuarioID` autenticado (`sub`). | `specs/dashboard.md` INV-5; readme ADR-003 |
| INV-6 | Sin datos en el período los KPI valen 0 (no error); "hoy"/mes en curso en `America/Mexico_City`. | `specs/dashboard.md` INV-6; readme HU-DASH-01, §4 |
| INV-7 | No leída = notificación del usuario con `bEliminado = 0` sin fila en `ntf.NotificacionesVisualizadas` (columna `Leido` no se usa). | `specs/notificaciones.md` INV-2; readme §3.2 |
| INV-8 | Estado de cuota: `Pagado = 1` → Pagada; `Pagado = 0 AND FechaVencimiento >= hoy` → Pendiente; `Pagado = 0 AND FechaVencimiento < hoy` → Vencida; calculado en C#. | readme §6 Ticket 10 (FNZ-BE-010); `specs/finanzas.md` |

## Criterios de aceptación

- [ ] **CA-1 [M]**: KPIs Admin con datos mixtos — **Dado** un Administrador (`bAdministrador = 1`) y datos de prueba con 4 tickets `Nuevo`, 2 `En seguimiento`, 3 usuarios con cuotas vencidas, cuotas del mes pagadas y pendientes, 8 casas con 7 ocupadas (`Vigente = 1`) y tickets del mes 5 WEB / 2 TELEGRAM **Cuando** llama `GET /Dashboard/Resumen` **Entonces** `ResumenController` responde `200` con `tipo = ADMIN`, `ticketsNuevos = 4`, `ticketsEnSeguimiento = 2`, `morososMes = 3`, `montoCobrado`/`montoPendiente` iguales a las sumas del dataset, `ocupacion = 87.5` y `ticketsPorCanal = { web: 5, telegram: 2 }`.
- [ ] **CA-2 [M]**: Admin sin datos — **Dado** una BD sin tickets, cuotas ni ocupantes vigentes **Cuando** el Administrador llama `GET /Dashboard/Resumen` **Entonces** responde `200` con todos los KPI en `0` (incluida `ocupacion` aunque el total de casas sea 0) y `ticketsPorCanal = { web: 0, telegram: 0 }`.
- [ ] **CA-3 [M]**: Residente con cuota vencida — **Dado** un Residente con una cuota del mes `Pagado = 0` y `FechaVencimiento` < hoy (`America/Mexico_City`), 2 tickets no cerrados y 3 notificaciones sin fila de lectura **Cuando** llama `GET /Dashboard/Resumen` **Entonces** responde `200` con `tipo = RESIDENTE`, `ticketsActivos = 2`, `estadoCuotaMes.estado = Vencida`, `notificacionesNoLeidas = 3` y `avisoVencida = true`.
- [ ] **CA-4 [M]**: Residente al corriente — **Dado** un Residente con la cuota del mes `Pagado = 1` y sin cuotas vencidas **Cuando** llama `GET /Dashboard/Resumen` **Entonces** `estadoCuotaMes.estado = Pagada` y `avisoVencida = false`.
- [ ] **CA-5 [M]**: perfil sin tablero — **Dado** un usuario con perfil Guardia o Trabajador **Cuando** llama `GET /Dashboard/Resumen` **Entonces** responde `403` `ProblemDetails` `code = FORBIDDEN`.
- [ ] **CA-6 [M]**: no autenticado — **Dado** una petición sin JWT válido **Cuando** llama `GET /Dashboard/Resumen` **Entonces** responde `401`.
- [ ] **CA-7 [M]**: aislamiento del residente — **Dado** dos residentes con tickets, cuotas y notificaciones distintos **Cuando** el residente A llama `GET /Dashboard/Resumen` **Entonces** ningún valor incluye datos del residente B.
- [ ] **CA-8 [M]**: vence hoy sigue pendiente — **Dado** un Residente con cuota `Pagado = 0` y `FechaVencimiento` = hoy en `America/Mexico_City` **Cuando** llama el endpoint **Entonces** `estadoCuotaMes.estado = Pendiente` y `avisoVencida = false`.
- [ ] **CA-9 [S]**: parámetros de período — **Dado** un Administrador **Cuando** llama `GET /Dashboard/Resumen?mes=13` o `?anio=2023` **Entonces** responde `400` `VALIDATION_ERROR`; con `?mes=8&anio=2026` los KPI por mes (`montoCobrado`, `montoPendiente`, `ticketsPorCanal`) se calculan sobre agosto 2026.
- [ ] **CA-10 [M]**: residente sin cuota del mes — **Dado** un Residente sin cuota generada para el período **Cuando** llama el endpoint **Entonces** responde `200` con `estadoCuotaMes = null` (readme §6 Ticket 14) y el resto de campos calculados.
- [ ] **CA-R1 [M]**: regresión de INV-1 — **Dado** cualquier llamada a `GET /Dashboard/Resumen` (Admin o Residente) **Cuando** se ejecuta **Entonces** `DashboardRepository` solo emite `SELECT`, no abre transacción de escritura y no existe ningún objeto `dash.*` ni tabla propia.
- [ ] **CA-R2 [M]**: regresión de INV-3 — **Dado** el mismo dataset **Cuando** se comparan `morososMes` y el número de usuarios de `GET /Reports/Reportes/Morosos` (FNZ-BE-012) **Entonces** ambos valores coinciden.
- [ ] **CA-R3 [M]**: regresión de INV-7/INV-8 — **Dado** el mismo residente **Cuando** se comparan `notificacionesNoLeidas` con `totalNoLeidas` de `GET /NTF/Notificaciones` y `estadoCuotaMes.estado` con el estado de esa cuota en `GET /FNZ/Cuotas/mis` **Entonces** los valores coinciden.

## Reutilización detectada (evidencia de la escalera — regla 6)

- `tkt.vsTickets` (ampliada por DB-001 con canal y casa) → conteos por `EstadoTicket` y por canal; tickets activos del residente.
- `fnz.Cuotas` → morosos, montos del mes, cuota del residente; regla de morosidad compartida con FNZ-BE-012 (no se duplica la definición: mismo predicado).
- Clasificación de estado de cuota de FNZ-BE-010 → se reutiliza la función/servicio C# existente al implementar; si no está disponible, se extrae a un helper compartido en vez de copiar (asumido).
- Conteo de no leídas de NTF-BE-013 (`NotificacionRepository`) → se reutiliza la consulta/método en vez de reescribirla.
- `sgr.CasaOcupantes` + `sgr.Casas` → ocupación.
- Tabla o vista propia de KPIs → evaluado y descartado: Non-goal y INV-1; `bi.KpiSnapshots` es de BI (Fase 3).

## Definition of Ready

- [x] **I**ndependent — depende de USR-BE-007, FNZ-BE-010 y NTF-BE-013, documentados como bloqueos en `_index.md`
- [x] **N**egotiable — Should/Could recortables vía escalación
- [x] **V**aluable — cada Must entrega una vista observable para Admin o Residente
- [x] **E**stimable — 3 horas (readme §6 Ticket 14)
- [x] **S**mall — cada Must cabe en una sesión de implementador
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [ ] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí — BD no desplegada; verificación MCP pendiente Entrega 2 (objetos declarados en readme §3/§4)
- [x] Cada Must cabe en una sesión de implementador (regla "Small")
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must — `estadoCuotaMes` confirmado por readme §6 Ticket 14 / §4 Endpoint 3
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Definición de morosidad divergente respecto a RPT | Media | CA-R2 compara contra FNZ-BE-012; mismo predicado |
| Zona horaria: "hoy" en UTC marca vencidas un día antes/después | Media | Cálculo de `hoy` y rango del mes en C# con `America/Mexico_City` (CA-8) |
| División por cero en `ocupacion` sin casas | Baja | CA-2: `0` cuando el total es 0 |
| Consultas lentas al crecer datos | Baja | Un solo condominio en Fase 1; índices de DB-001; medir en Entrega 2 |

## Preguntas abiertas

- `estadoCuotaMes`: forma y regla → **respondida (readme §6 Ticket 14 = §4 Endpoint 3)**: `{ monto, fechaVencimiento, estado ∈ Pagada | Pendiente | Vencida }` derivado de `Pagado` y `FechaVencimiento`; `null` sin cuota del período
- `ticketsNuevos`/`ticketsEnSeguimiento`: ¿estado actual (sin filtro de fecha) o solo tickets creados en el mes? → **pendiente (asumido: estado actual, sin filtro de fecha, como la fórmula de Ticket 14)**
- `morososMes`: la fórmula de Ticket 14 no filtra por mes → **pendiente (asumido: morosos a hoy, independiente de `mes`/`anio`)**
- `montoCobrado`/`montoPendiente` "del mes": ¿por `PeriodoInicio` en el mes? ¿cobrado = `SUM(MontoPagado)` de `Pagado = 1` y pendiente = `SUM(Monto)` de `Pagado = 0`? → **pendiente (asumido)**
- `ocupacion`: "total de casas del condominio" → **pendiente (asumido: condominio del claim `condominioId`)**
- ¿Los KPI Admin se filtran por condominio (`condominioId`) además de `ocupacion`? → **pendiente (asumido: Fase 1 opera un condominio; filtro solo en `ocupacion`)**
- Residente con varias cuotas del período (varias casas) → **pendiente (asumido: la de `FechaVencimiento` más antigua)**; sin cuota → `null` (confirmado, readme §6 Ticket 14)
- ¿Residente se identifica por claim `perfil = 'Residente'`? → **pendiente (asumido: claim `perfil` del JWT, USR-BE-007)**

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [ ] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente — declarados en readme; MCP pendiente Entrega 2
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
