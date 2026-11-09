[← index](_index.md) | [← spec](spec.md)

# design.md — FNZ-BE-010: Consulta de estado de cuenta del residente

> Generado por: **generador de contexto SDD** tras validar spec.md
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)

## Estrategia técnica

Un único método `FinanzasService.ObtenerEstadoCuentaAsync(int usuarioId)` ejecuta una consulta Dapper parametrizada (`fnz.Cuotas` + `LEFT JOIN sgr.Casas` + `LEFT JOIN fnz.Cuentas`, `bEliminado = 0`) y clasifica cada fila en C# con la fecha local de `America/Mexico_City` obtenida de `TimeProvider`. `CuotasController` expone dos acciones: `GET /FNZ/Cuotas/mis` (usa `UsuarioActual.UsuarioId` = `sub`) y `GET /FNZ/Cuotas?usuarioId=` (verifica `bAdministrador = 1`, si no `403`). Ambas llaman al mismo método, así el payload es idéntico (CA-6).

Alternativas descartadas:
- **Calcular el estado en SQL (`CASE` / vista `vs`)** — viola INV-2 y el CA de readme Ticket 10 ("calculada en servicio C#, no en SQL"); además `GETDATE()` del servidor no está en `America/Mexico_City`.
- **Columna de estado persistida** — requiere job de actualización diaria y rompe INV-2.
- **Un solo endpoint con `usuarioId` opcional para todos** — abre la puerta a acceso cruzado; `/mis` sin parámetro hace imposible pedir cuotas ajenas (INV-5).
- **`DateTime.Now` directo** — no testeable en el borde de medianoche (CA-2); se usa `TimeProvider`.

### Escalera de decisión (methodology.md regla 6) — recorrer ANTES de las tablas de objetos

| Capacidad pedida | Peldaño (1-5) | Objeto resultante | Por qué se descartaron los anteriores |
|---|---|---|---|
| Leer cuotas del usuario con casa y cuenta | 3 (reuso) | `fnz.Cuotas`, `sgr.Casas`, `fnz.Cuentas` (post DB-001) | 1: es Must; 2: no aplica feature nativa de lectura distinta a un SELECT |
| "Hoy" en `America/Mexico_City` testeable | 2 (nativo) | `TimeProvider` + `TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City")` | 1: Must (CA-2) |
| Restringir `?usuarioId=` a Admin | 3 (reuso) | claim `bAdministrador` / política `SoloAdministrador` | 2: `[Authorize]` nativo cubre `401`; la regla de perfil ya existe |
| Clasificación Pagada/Pendiente/Vencida + totales | 5 (nuevo) | método `FinanzasService.ObtenerEstadoCuentaAsync` + `ClasificarCuota` (privado/estático) | 2: SQL/vista descartada por INV-2; 3: no existe servicio de finanzas aún (primer ticket FNZ); 4: no hay objeto que modificar |
| Exponer REST `/FNZ/Cuotas` | 5 (nuevo) | `CuotasController` | 3: no existe controller FNZ; 4: agregar acciones a otro dominio rompe convención `/{Dominio}/{Controller}` |
| DTOs de respuesta | 5 (nuevo) | `EstadoCuentaDto { Cuotas, TotalPendiente, TotalVencido }`, `CuotaEstadoDto` | 3: no hay DTO de cuota previo |

## database:CuartaQuinientos

| Objeto | Tipo | Acción | Notas |
|---|---|---|---|
| `fnz.Cuotas` | tabla | reusar (sin DDL) | Requiere DB-001 (`CuentaID`, `MontoPagado`) |
| `sgr.Casas` | tabla | reusar (sin DDL) | Nombres lógicos `Direccion`, `Numero` tras DB-001 (ADR-008) |
| `fnz.Cuentas` | tabla | reusar (sin DDL) | `Nombre` tras DB-001 |

```sql
-- Esqueleto de la consulta Dapper (inline en FinanzasService; sin SP — ADR-001)
-- ⏳ MCP pendiente Entrega 2 (BD no desplegada) — verificar con user-CQ500hub antes de implementar
SELECT c.CuotaID, c.CasaID, ca.Direccion, ca.Numero,
       c.CuentaID, cu.Nombre AS Cuenta,
       c.Monto, c.MontoPagado, c.PeriodoInicio, c.PeriodoFin, c.FechaVencimiento,
       c.Pagado, c.FechaPago, c.MetodoPago, c.ReferenciaPago
FROM fnz.Cuotas c
LEFT JOIN sgr.Casas   ca ON ca.CasaID   = c.CasaID
LEFT JOIN fnz.Cuentas cu ON cu.CuentaID = c.CuentaID
WHERE c.UsuarioID = @UsuarioId
  AND c.bEliminado = 0
ORDER BY c.PeriodoInicio DESC;   -- (asumido) orden
```

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/FNZ/Cuotas/mis` | GET | — (`UsuarioID` = `sub`) | `200 { cuotas: [{ cuotaId, casaId, direccion, numero, cuentaId, cuenta, monto, montoPagado, periodoInicio, periodoFin, fechaVencimiento, fechaPago, metodoPago, referenciaPago, estado, esVencida }], totalPendiente, totalVencido }` · `401` | crear |
| `/FNZ/Cuotas?usuarioId={id}` | GET | query `usuarioId` (int > 0) | mismo `200` · `401` · `403 FORBIDDEN` (no admin) · `400 VALIDATION_ERROR` sin `usuarioId` `(asumido)` | crear |

Clasificación (en `FinanzasService`, lógica pura testeable):

```csharp
// hoy = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_time.GetUtcNow(), _tzMx).DateTime)
// Pagado        → "Pagada"
// venc >= hoy   → "Pendiente"
// venc <  hoy   → "Vencida", esVencida = true
// totalPendiente = Σ Monto (Pendiente) ; totalVencido = Σ Monto (Vencida)   (asumido)
```

## Orden de implementación

| # | Paso | Target:Instancia | Entregable | Dependencia | Verificación |
|---|------|-------------------|------------|-------------|--------------|
| 1 | Verificar columnas post DB-001 (`fnz.Cuotas.CuentaID`, `sgr.Casas.Direccion/Numero`, `fnz.Cuentas.Nombre`) | `database:CuartaQuinientos` | evidencia MCP en `impl.md` | DB-001 aplicado | `SELECT TOP 0` de la consulta vía MCP |
| 2 | DTOs `EstadoCuentaDto` / `CuotaEstadoDto` | `backend:cuartaquinientos-api` | DTOs | — | `dotnet build` |
| 3 | Test unitario rojo de `ClasificarCuota` (bordes hoy/ayer/mañana con `FakeTimeProvider`) | `backend:cuartaquinientos-api` | tests en `GraphApi.Tests` | 2 | tests en rojo |
| 4 | `FinanzasService.ObtenerEstadoCuentaAsync` (query + clasificación + totales) | `backend:cuartaquinientos-api` | servicio registrado en DI | 1, 3 | tests del paso 3 en verde |
| 5 | `CuotasController` (`/mis`, `?usuarioId=` con verificación admin) | `backend:cuartaquinientos-api` | controller + swagger | 4 | `dotnet build` + `/swagger` muestra 200/401/403 |
| 6 | Tests de integración del endpoint + `.http` (`api-tester`) | `backend:cuartaquinientos-api` | `GraphApi.Tests` + `.http` | 5 | `dotnet test GraphApi.Tests` verde |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre CA |
|---|---|---|---|
| `TC-1` mezcla de estados + totales | cuartaquinientos-api | integración | CA-1 |
| `TC-2` vence hoy con reloj a las 23:30 `America/Mexico_City` (05:30 UTC del día siguiente) | cuartaquinientos-api | unitario (lógica pura) | CA-2 |
| `TC-3` sin deudas / `TC-4` sin cuotas | cuartaquinientos-api | integración | CA-3, CA-4 |
| `TC-6` admin `?usuarioId=` = payload de `/mis` | cuartaquinientos-api | integración | CA-6 |
| `TC-7` `/mis?usuarioId=11` ignora el parámetro | cuartaquinientos-api | integración | CA-7 |
| `TC-9` cuota con `CuentaID = NULL` | cuartaquinientos-api | integración | CA-9 |
| `TC-INV-1` vencida = `Pagado = 0` y venc < hoy (ayer → Vencida, hoy → Pendiente) | cuartaquinientos-api | regresión | INV-1 |
| `TC-INV-2` no hay DDL/columna de estado en el diff del ticket | CuartaQuinientos | regresión | CA-R2 (INV-2) |
| `TC-INV-3` solo cuotas del `UsuarioID` pedido | cuartaquinientos-api | regresión | CA-7 (INV-3) |
| `TC-INV-4` cuota `bEliminado = 1` excluida de lista y totales | cuartaquinientos-api | regresión | CA-R1 (INV-4) |
| `TC-INV-5` identidad de `sub` en `/mis` | cuartaquinientos-api | regresión | CA-7 (INV-5) |
| `TC-ERR-1` residente con `?usuarioId=11` → `403 FORBIDDEN` | cuartaquinientos-api | negativo | CA-5 |
| `TC-ERR-2` sin token → `401` | cuartaquinientos-api | negativo | CA-8 |
| `TC-ERR-3` admin sin `usuarioId` → `400 VALIDATION_ERROR` `(asumido)` | cuartaquinientos-api | negativo | Pregunta abierta |
| `TC-RB` revert del PR deja `/FNZ/Cuotas` en `404` sin tocar BD | cuartaquinientos-api | rollback | estrategia de rollback |

### Ratio de pruebas (Testing Trophy)

- Integración: ~70 % (controller + BD de test `CuartaQuinientos`, disponible desde Entrega 2)
- Unitario: ~30 % (solo `ClasificarCuota` y totales con `FakeTimeProvider`)
- Mocks: ninguno de APIs externas (no hay integración externa)

### Triangulación

| Comportamiento | Dataset A | Dataset B | Qué generaliza |
|---|---|---|---|
| Clasificación por fecha | 1 cuota vence hoy (Pendiente) | 12 cuotas: 4 pagadas, 3 pendientes, 5 vencidas | que la frontera no quedó hardcodeada a una fecha |
| Totales | 1 vencida de 1 200.00 | 5 vencidas de montos distintos (1 200.00, 950.50, …) | que suma montos reales, no cuenta filas |

### Mutation

| Objeto | Técnica | Kill rate objetivo |
|---|---|---|
| `FinanzasService.ClasificarCuota` / totales | Stryker.NET (mutantes: `<` ↔ `<=`, quitar `bEliminado = 0`, invertir `Pagado`) | ≥ 80 % paths críticos |

## Estrategia de rollback

- Sin cambios de BD: el rollback es revertir el PR de `feature/FNZ-BE-010-estado-cuenta` (quita `CuotasController`, servicio y DTOs).
- Consumidores (FE-032, DASH-BE-014, BOT-BE-019) aún no desplegados en Fase 1 al momento de este ticket; si ya lo estuvieran, revertir primero sus features o dejarlas en estado de error controlado.

## Decisiones técnicas (auditoría)

| # | Decisión | Justificación |
|---|---|---|
| 1 | Clasificación en C# con `TimeProvider` + zona `America/Mexico_City` | Peldaño 2 nativo; SQL/vista descartada por INV-2 y por zona del servidor |
| 2 | `CuotasController` + `FinanzasService` nuevos | Peldaño 5: primer ticket del dominio FNZ; no existe controller/servicio que extender (peldaños 3-4 fallan) |
| 3 | `LEFT JOIN` a `sgr.Casas`/`fnz.Cuentas` | `CasaID` y `CuentaID` son `NULL`ables en el físico (DDL `fnz.Cuotas`); un `INNER JOIN` ocultaría cuotas `(asumido)` |
| 4 | Sin vista `vs*` nueva | Peldaño 3: la consulta es un join simple; crear vista agrega DDL sin valor |
| 5 | `totalPendiente` excluye vencidas | `(asumido)` — registrado en Preguntas abiertas del spec |

## Autoverificación antes del handoff

**Consistencia con spec.md:**
- [x] Ningún objeto/tabla de este design.md implementa algo listado como `Won't` en spec.md
- [x] Cada fila de "Plan de pruebas" `TC-INV-x` corresponde a un invariante real de spec.md (INV-1..INV-5)

**Calidad del artefacto:**
- [ ] Toda query/comando SQL verificado con MCP — **pendiente Entrega 2** (BD no desplegada; paso 1 del orden lo resuelve)
- [x] Orden de implementación: cada paso tiene Entregable + Dependencia explícita
- [x] Sin falsa agencia: cada paso nombra el actor real (`FinanzasService`, `CuotasController`, agente `api-tester`)
- [ ] Toda query/comando propuesto verificado antes de escribirlo — **pendiente Entrega 2** (objetos declarados en readme §3.2 / DDL físico)
- [x] Cada comportamiento nuevo tiene ≥ 2 datasets en la tabla de Triangulación
