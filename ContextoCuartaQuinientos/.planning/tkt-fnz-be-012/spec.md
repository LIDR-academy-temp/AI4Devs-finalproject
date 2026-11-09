[← index](_index.md) | [design →](design.md)

# spec.md — FNZ-BE-012: Reporte de morosos (Admin)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como Administrador, quiero ver la lista de residentes con cuotas vencidas (casa, nombre, cuotas adeudadas y total pendiente), para gestionar la cobranza mensual (HU-FNZ-03, readme §5).

## Contexto / problema

- **Actual:** la cobranza se sigue en hojas de cálculo; no hay consulta de adeudos por residente (readme §1.1).
- **Esperado (readme §6 Ticket 12):** `GET /Reports/Reportes/Morosos` (solo `bAdministrador = 1`) devuelve `[{ usuarioId, nombre, casa, cuotasVencidas, totalAdeudado }]` con las cuotas `Pagado = 0` y `FechaVencimiento < hoy`, agrupadas por usuario y casa (`UsuarioID, CasaID`), con filtro opcional `?mes=9&anio=2026` (misma convención que `/Dashboard/Resumen`, readme §4 Endpoint 3: `mes` 1–12, `anio` ≥ 2024). Sin morosos → `[]` con `200`.
- **Investigación:** [specs/finanzas.md](../../specs/finanzas.md) (INV-3, INV-6, INV-7), [specs/reportes-bi.md](../../specs/reportes-bi.md) (INV-1 solo lectura, INV-2 definición de morosidad, INV-3 solo Admin). Mismo criterio de "vencida" que [[FNZ-BE-010]] y que `morososMes` de [[DASH-BE-014]]. El consumidor UI es [[FE-039]] (empty state "Sin morosos en el período seleccionado.").
- **Agrupación confirmada (readme §6 Ticket 12):** descripción y CA coinciden en agrupar por `UsuarioID, CasaID`; un usuario con adeudos en dos casas aparece una vez por casa.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `GET /Reports/Reportes/Morosos` con política `SoloAdministrador`.
- Query Dapper parametrizada sobre `fnz.Cuotas` + `sgr.vsUsuarios` + `sgr.Casas`, filtrando `Pagado = 0`, `FechaVencimiento < @Hoy` (fecha `America/Mexico_City`) y `bEliminado = 0`; suma de `Monto` y conteo agrupados por `UsuarioID, CasaID`.
- Respuesta `[{ usuarioId, nombre, casa, cuotasVencidas, totalAdeudado }]`; sin morosos → `[]` (`200`, no `404`).
- Filtro opcional `?mes=&anio=` que acota a cuotas de ese período.
- Tests: morosos mezclados con pagados, todos al corriente (`[]`), filtro por mes.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Orden por `totalAdeudado DESC` `(asumido)`.
- Validación del filtro: `mes` 1–12 y `anio` ≥ 2024 (readme §4 Endpoint 3); `mes` sin `anio` (o viceversa) → `400 VALIDATION_ERROR` `(asumido)`.
- Swagger con 200/400/401/403.

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Ninguno.

### Won't — fuera de alcance explícito
- Export PDF/Excel del reporte (QuestPDF/ClosedXML; reportes financieros fuera de Fase 1, finanzas.md Endpoints).
- Recargos o intereses por mora (Non-goals FNZ Fase 1).
- Sugerencias proactivas de cobro por Telegram (BOT/Fase 2).
- Snapshot en `bi.KpiSnapshots` (BI-BE-023).
- UI del reporte (FE-039).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Solo lectura de `fnz.Cuotas`, `sgr.vsUsuarios`, `sgr.Casas`; sin DDL (depende de DB-001: `sgr.vsUsuarios.Nombre`, `sgr.Casas.Numero`) |
| `backend:cuartaquinientos-api` | Nuevo `ReportesController` (`/Reports/Reportes`) con acción `Morosos` + `FinanzasService.ObtenerMorososAsync` + `MorosoDto` |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Morosidad = cuotas con `Pagado = 0` y `FechaVencimiento < hoy`, misma definición que Dashboard (finanzas INV-3 · reportes-bi INV-2) | `specs/finanzas.md` · `specs/reportes-bi.md` |
| INV-2 | RPT es solo lectura sobre los dominios origen; no muta datos operativos (reportes-bi INV-1) | `specs/reportes-bi.md` |
| INV-3 | Acceso a reportes restringido a Administrador (`bAdministrador = 1`) (reportes-bi INV-3) | `specs/reportes-bi.md` |
| INV-4 | Soft delete `bEliminado`: cuotas eliminadas no cuentan como adeudo (finanzas INV-6) | `specs/finanzas.md` |
| INV-5 | Toda cuota está ligada a `UsuarioID` y `CasaID` (finanzas INV-7) | `specs/finanzas.md` |

## Criterios de aceptación

- [ ] **CA-1 [M]**: morosos mezclados con pagados — **Dado** el usuario 10 con 2 cuotas vencidas (1 200.00 c/u) y 1 pagada, y el usuario 11 con todas pagadas **Cuando** un Administrador llama `GET /Reports/Reportes/Morosos` **Entonces** `ReportesController` responde `200` con un solo elemento `{ usuarioId: 10, nombre, casa, cuotasVencidas: 2, totalAdeudado: 2400.00 }`.
- [ ] **CA-2 [M]**: todos al corriente — **Dado** que ninguna cuota activa cumple `Pagado = 0 AND FechaVencimiento < hoy` **Cuando** un Administrador llama `GET /Reports/Reportes/Morosos` **Entonces** `200` con `[]`.
- [ ] **CA-3 [M]**: filtro por período — **Dado** el usuario 10 con una cuota vencida de agosto 2026 y otra de septiembre 2026 **Cuando** un Administrador llama `GET /Reports/Reportes/Morosos?mes=9&anio=2026` **Entonces** el elemento del usuario 10 trae `cuotasVencidas: 1` y solo el monto de septiembre `(asumido: período = mes/año de PeriodoInicio)`.
- [ ] **CA-4 [M]**: pendiente no es moroso — **Dado** una cuota `Pagado = 0` con `FechaVencimiento` = hoy (`America/Mexico_City`) **Cuando** se consulta el reporte **Entonces** esa cuota no cuenta.
- [ ] **CA-5 [M]**: solo Administrador — **Dado** un Residente autenticado **Cuando** llama `GET /Reports/Reportes/Morosos` **Entonces** `403 FORBIDDEN`; sin token → `401`.
- [ ] **CA-6 [S]**: filtro inválido — **Dado** un Administrador **Cuando** llama con `?mes=13&anio=2026` o solo `?mes=9` **Entonces** `400 VALIDATION_ERROR` `(asumido: mes sin anio es inválido)`.
- [ ] **CA-R1 [M]**: regresión de INV-4 — **Dado** una cuota vencida del usuario 10 con `bEliminado = 1` y ninguna otra adeudada **Cuando** un Administrador llama el reporte **Entonces** el usuario 10 no aparece.
- [ ] **CA-R2 [M]**: regresión de INV-2 — **Dado** cualquier llamada al reporte **Cuando** termina **Entonces** `fnz.Cuotas` no tiene cambios (`FechaModificacion` intacta; la consulta no abre transacción de escritura).

## Reutilización detectada (evidencia de la escalera — regla 6)

- `fnz.Cuotas`, `sgr.vsUsuarios` (nombre + casa vigente tras DB-001), `sgr.Casas` → se reutilizan; sin vista nueva.
- `FinanzasService` ([[FNZ-BE-010]]) → se agrega `ObtenerMorososAsync`; reutiliza el mismo cálculo de "hoy" en `America/Mexico_City` (`TimeProvider`) para no divergir del estado de cuenta.
- Política `SoloAdministrador` (FNZ-BE-011) → se reutiliza.
- Convención `?mes=&anio=` de `/Dashboard/Resumen` (readme §4 Endpoint 3) → se reutiliza el mismo rango de validación.
- Vista `fnz.vsMorosos` → evaluada y descartada (una sola consulta con `GROUP BY`; agrega DDL sin consumidores adicionales).

## Definition of Ready

- [x] **I**ndependent — depende de FNZ-BE-010 (readme §6 Ticket 12); documentado en `_index.md`
- [x] **N**egotiable — Should ajustables vía escalación
- [x] **V**aluable — el Admin obtiene la lista de cobranza
- [x] **E**stimable — 2 h (readme §6 Ticket 12)
- [x] **S**mall — una acción + una consulta agregada
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (declarados en readme §3.2 / DB-001; MCP pendiente Entrega 2)
- [x] Cada Must cabe en una sesión de implementador
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must (abiertas con supuesto adoptado)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Criterio de "vencida" divergente del estado de cuenta y del Dashboard | Alta | Misma fuente de "hoy" (`TimeProvider` + `America/Mexico_City`) pasada como parámetro `@Hoy`; test CA-4 |
| Usuario con cuotas en dos casas: el consumidor podría esperar una sola fila por usuario | Baja | Contrato del readme Ticket 12: una fila por (`UsuarioID`, `CasaID`); `casa` identifica cada fila |
| `sgr.vsUsuarios` con alias heredado (`NombreUsuario`) si DB-001 no la recrea | Media | Paso 1 del design verifica columnas vía MCP |
| Semántica del filtro `mes/anio` (período de la cuota vs mes de vencimiento) | Media | Supuesto `PeriodoInicio` en el mes; documentado y testeado (CA-3) |

## Preguntas abiertas

- Agrupación → **respondida (readme §6 Ticket 12)**: `GROUP BY UsuarioID, CasaID`.
- ¿El filtro `?mes=&anio=` se aplica sobre `PeriodoInicio` o sobre `FechaVencimiento`? → **pendiente; supuesto: `PeriodoInicio` dentro del mes** `(asumido)`.
- `mes` sin `anio` → **pendiente; supuesto: `400`** `(asumido)`.
- Contenido de `casa` → **pendiente; supuesto: `sgr.Casas.Numero`** `(asumido)`.
- Orden de la lista → **pendiente; supuesto: `totalAdeudado DESC`** `(asumido)`.

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
