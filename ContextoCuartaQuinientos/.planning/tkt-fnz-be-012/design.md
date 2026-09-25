[← index](_index.md) | [← spec](spec.md)

# design.md — FNZ-BE-012: Reporte de morosos (Admin)

> Generado por: **generador de contexto SDD** tras validar spec.md
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)

## Estrategia técnica

`ReportesController` (dominio REST `/Reports`, readme §4 inventario) expone `GET /Reports/Reportes/Morosos` con política `SoloAdministrador` y delega en `FinanzasService.ObtenerMorososAsync(int? mes, int? anio)`. El servicio calcula `@Hoy` (fecha local `America/Mexico_City` vía `TimeProvider`, igual que FNZ-BE-010) y, si hay filtro, `@Desde = día 1 del mes` y `@Hasta = día 1 del mes siguiente`; ejecuta una sola consulta Dapper parametrizada con `GROUP BY` y devuelve la lista (vacía → `[]`). Lectura pura: sin transacción de escritura (INV-2).

Alternativas descartadas:
- **Clasificar en C# trayendo todas las cuotas** — traslada todo `fnz.Cuotas` a memoria; aquí la regla es un filtro de fecha simple que SQL resuelve con `@Hoy` parametrizado (la fecha la sigue calculando C#, sin `GETDATE()`).
- **Vista `fnz.vsMorosos`** — agrega DDL sin segundo consumidor; Dashboard usa un `COUNT DISTINCT` distinto.
- **Servicio `ReportesService` nuevo** — la consulta es del dominio FNZ; `FinanzasService` ya existe (peldaño 4).
- **`GETDATE()` en SQL** — zona del servidor ≠ `America/Mexico_City`; divergiría de FNZ-BE-010.

### Escalera de decisión (methodology.md regla 6) — recorrer ANTES de las tablas de objetos

| Capacidad pedida | Peldaño (1-5) | Objeto resultante | Por qué se descartaron los anteriores |
|---|---|---|---|
| Agregar adeudos por residente | 2 (nativo) | `GROUP BY` + `COUNT`/`SUM` en la consulta Dapper | 1: Must |
| Datos de usuario y casa | 3 (reuso) | `sgr.vsUsuarios` + `sgr.Casas` | 2: n/a |
| "Hoy" consistente con estado de cuenta | 3 (reuso) | cálculo de fecha local de `FinanzasService` (FNZ-BE-010) | 2: `GETDATE()` descartado por zona |
| Solo Administrador | 3 (reuso) | política `SoloAdministrador` | 2: `[Authorize]` solo cubre `401` |
| Método de consulta | 4 (cambio mínimo) | `FinanzasService.ObtenerMorososAsync` | 3: no existe; servicio nuevo duplicaría DI |
| Endpoint `/Reports/Reportes/Morosos` | 5 (nuevo) | `ReportesController` | 3: no existe controller del dominio `/Reports` (primer reporte de Fase 1); 4: colgarlo de `CuotasController` rompe la ruta del readme |
| DTO de salida | 5 (nuevo) | `MorosoDto { UsuarioId, Nombre, Casa, CuotasVencidas, TotalAdeudado }` | 3: no hay DTO de reporte |

## database:CuartaQuinientos

| Objeto | Tipo | Acción | Notas |
|---|---|---|---|
| `fnz.Cuotas` | tabla | reusar (lectura) | `Pagado`, `FechaVencimiento`, `PeriodoInicio`, `bEliminado` |
| `sgr.vsUsuarios` | vista | reusar (lectura) | `Nombre` tras DB-001 (ADR-008) |
| `sgr.Casas` | tabla | reusar (lectura) | `Numero` tras DB-001 |

```sql
-- Consulta Dapper inline en FinanzasService (sin SP — ADR-001)
-- ⏳ MCP pendiente Entrega 2 (BD no desplegada) — verificar con user-CQ500hub
SELECT c.UsuarioID      AS UsuarioId,
       u.Nombre         AS Nombre,
       ca.Numero        AS Casa,                 -- (asumido) casa = Numero
       COUNT(*)         AS CuotasVencidas,
       SUM(c.Monto)     AS TotalAdeudado
FROM fnz.Cuotas c
INNER JOIN sgr.vsUsuarios u ON u.UsuarioID = c.UsuarioID
LEFT  JOIN sgr.Casas     ca ON ca.CasaID   = c.CasaID
WHERE c.Pagado = 0
  AND c.bEliminado = 0
  AND c.FechaVencimiento < @Hoy                  -- @Hoy = fecha local America/Mexico_City (00:00)
  AND (@Desde IS NULL OR (c.PeriodoInicio >= @Desde AND c.PeriodoInicio < @Hasta))   -- (asumido) filtro por PeriodoInicio
GROUP BY c.UsuarioID, u.Nombre, c.CasaID, ca.Numero     -- usuario + casa (readme Ticket 12)
ORDER BY TotalAdeudado DESC;                             -- (asumido)
```

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/Reports/Reportes/Morosos` | GET | query opcional `mes` (1–12), `anio` (≥ 2024), ambos o ninguno `(asumido)` | `200 [{ usuarioId, nombre, casa, cuotasVencidas, totalAdeudado }]` (vacío → `[]`) · `400 VALIDATION_ERROR` · `401` · `403 FORBIDDEN` | crear (`ReportesController`) |

## Orden de implementación

| # | Paso | Target:Instancia | Entregable | Dependencia | Verificación |
|---|------|-------------------|------------|-------------|--------------|
| 1 | Verificar columnas `sgr.vsUsuarios.Nombre`, `sgr.Casas.Numero` y la consulta | `database:CuartaQuinientos` | evidencia MCP en `impl.md` | DB-001 | `SELECT TOP 0` de la consulta vía MCP |
| 2 | `MorosoDto` + validación de `mes/anio` | `backend:cuartaquinientos-api` | DTO + validador | — | `dotnet build` |
| 3 | Tests de integración en rojo (mezcla, vacío, filtro, borde hoy, eliminada) | `backend:cuartaquinientos-api` | tests en `GraphApi.Tests` | 2 | tests en rojo |
| 4 | `FinanzasService.ObtenerMorososAsync` | `backend:cuartaquinientos-api` | método | 1, 3 | tests del paso 3 en verde |
| 5 | `ReportesController.Morosos` + swagger | `backend:cuartaquinientos-api` | endpoint | 4 | `/swagger` con 200/400/401/403 |
| 6 | `.http` (`api-tester`) y ejecución contra API levantada | `backend:cuartaquinientos-api` | `.http` | 5 | endpoint ejecutado al menos 1 vez |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre CA |
|---|---|---|---|
| `TC-1` morosos mezclados con pagados | cuartaquinientos-api | integración | CA-1 |
| `TC-2` todos al corriente → `[]` | cuartaquinientos-api | integración | CA-2 |
| `TC-3` `?mes=9&anio=2026` | cuartaquinientos-api | integración | CA-3 |
| `TC-INV-1` vence hoy no cuenta; venció ayer sí | cuartaquinientos-api | regresión | CA-4 (INV-1) |
| `TC-INV-2` `fnz.Cuotas` sin cambios tras la llamada | cuartaquinientos-api | regresión | CA-R2 (INV-2) |
| `TC-INV-3` Residente → 403 | cuartaquinientos-api | regresión | CA-5 (INV-3) |
| `TC-INV-4` cuota `bEliminado = 1` excluida | cuartaquinientos-api | regresión | CA-R1 (INV-4) |
| `TC-INV-5` cada fila trae `usuarioId` y `casa` de la cuota | cuartaquinientos-api | regresión | CA-1 (INV-5) |
| `TC-ERR-1` `?mes=13&anio=2026` → 400 | cuartaquinientos-api | negativo | CA-6 |
| `TC-ERR-2` solo `?mes=9` → 400 `(asumido)` | cuartaquinientos-api | negativo | CA-6 |
| `TC-ERR-3` sin token → 401 | cuartaquinientos-api | negativo | CA-5 |
| `TC-RB` revert del PR: `/Reports/Reportes/Morosos` → 404; BD intacta | cuartaquinientos-api | rollback | estrategia de rollback |

### Ratio de pruebas (Testing Trophy)

- Integración: ~80 % (la lógica vive en la consulta; se prueba contra BD de test)
- Unitario: ~20 % (validador `mes/anio` y cálculo de `@Desde/@Hasta`)
- Mocks: ninguno

### Triangulación

| Comportamiento | Dataset A | Dataset B | Qué generaliza |
|---|---|---|---|
| Agregación | 1 moroso con 1 cuota | 3 morosos con 1, 2 y 5 cuotas de montos distintos + 2 al corriente | que suma/cuenta por grupo, no global |
| Filtro de período | septiembre 2026 | diciembre 2026 (borde de año: `@Hasta` = 2027-01-01) | que el rango no quedó fijo a un mes |

### Mutation

| Objeto | Técnica | Kill rate objetivo |
|---|---|---|
| Consulta de `ObtenerMorososAsync` | 3 mutantes manuales: `<` → `<=` en `FechaVencimiento`, quitar `bEliminado = 0`, quitar `Pagado = 0` | 3/3 muertos (≥ 80 %) |

## Estrategia de rollback

- Sin DDL ni escrituras: revertir el PR `feature/FNZ-BE-012-reporte-morosos` elimina `ReportesController.Morosos`, el método del servicio y el DTO. FE-039 debe mostrar estado de error si el endpoint no existe.

## Decisiones técnicas (auditoría)

| # | Decisión | Justificación |
|---|---|---|
| 1 | `ReportesController` nuevo bajo `/Reports` | Peldaño 5: ruta fijada por readme §4/§6; no existe controller del dominio |
| 2 | Consulta en `FinanzasService` (no servicio nuevo) | Peldaño 4: datos del dominio FNZ; comparte el cálculo de "hoy" con FNZ-BE-010 |
| 3 | `@Hoy` calculado en C# y pasado como parámetro | Evita `GETDATE()` en zona del servidor; mantiene INV-1 idéntico al estado de cuenta |
| 4 | `GROUP BY UsuarioID, CasaID` | Confirmado por readme §6 Ticket 12 (descripción y CA coinciden) |
| 5 | Sin vista nueva | Peldaño 3: una consulta con `GROUP BY` basta |

## Autoverificación antes del handoff

**Consistencia con spec.md:**
- [x] Ningún objeto/tabla de este design.md implementa algo listado como `Won't` en spec.md (sin export, sin BI, sin recargos)
- [x] Cada fila de "Plan de pruebas" `TC-INV-x` corresponde a un invariante real de spec.md (INV-1..INV-5)

**Calidad del artefacto:**
- [ ] Toda query/comando SQL verificado con MCP — **pendiente Entrega 2** (BD no desplegada; paso 1 del orden)
- [x] Orden de implementación: cada paso tiene Entregable + Dependencia explícita
- [x] Sin falsa agencia: cada paso nombra el actor real (`FinanzasService`, `ReportesController`, agente `api-tester`)
- [ ] Toda query/comando propuesto verificado antes de escribirlo — **pendiente Entrega 2** (objetos declarados en readme §3.2)
- [x] Cada comportamiento nuevo tiene ≥ 2 datasets en la tabla de Triangulación
