[← index](_index.md) | [← spec](spec.md)

# design.md — FNZ-BE-037: Generar cuotas del período

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api` → `tester-sql` smoke Dapper → `api-tester`)

## Estrategia técnica

Extender `FinanzasService.GenerarCuotasPeriodoAsync`: validar input (FluentValidation), calcular `@PeriodoInicio`/`@PeriodoFin`, `INSERT fnz.Cuotas (...) SELECT … FROM sgr.Casas c INNER JOIN sgr.CasaOcupantes co … LEFT JOIN fnz.Cuotas exist ON … WHERE exist.CuotaID IS NULL`, contar `@@ROWCOUNT` vs casas elegibles para `omitidas`.

Responsable: subconsulta que prefiera fila `TipoResidencia` propietario habitante, else arrendatario vigente (readme Ticket 37).

### Escalera

| Capacidad | Peldaño | Objeto |
|---|---|---|
| Persistencia cuotas | 3 | `fnz.Cuotas` |
| Ocupantes | 3 | `sgr.CasaOcupantes` |
| Endpoint generar | 5 | `POST /FNZ/Cuotas/generar` |

## database:CuartaQuinientos

| Objeto | Tipo | Acción |
|---|---|---|
| `fnz.Cuotas` | tabla | INSERT selectivo |
| `sgr.CasaOcupantes`, `sgr.Casas` | tabla | SELECT |
| `fnz.Cuentas` | catálogo | validar `cuentaId` |

```sql
-- Esqueleto idempotente (nombres lógicos §3.2). ⏳ MCP pendiente Entrega 2.
INSERT INTO fnz.Cuotas (CasaID, UsuarioID, CuentaID, Monto, PeriodoInicio, PeriodoFin,
       FechaVencimiento, Pagado, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
SELECT c.CasaID, @UsuarioResponsable, @CuentaId, @Monto, @PeriodoInicio, @PeriodoFin,
       @FechaVencimiento, 0, @ByCorreo, @By, SYSUTCDATETIME(), 0
FROM sgr.Casas c
-- join ocupante vigente + responsable
WHERE NOT EXISTS (
  SELECT 1 FROM fnz.Cuotas q
  WHERE q.CasaID = c.CasaID AND q.PeriodoInicio = @PeriodoInicio AND q.bEliminado = 0);
```

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response |
|---|---|---|---|
| `/FNZ/Cuotas/generar` | POST | `{ anio, mes, monto, fechaVencimiento, cuentaId }` | `200 { creadas, omitidas }` |

## Orden de implementación

| # | Paso | Entregable | Verificación |
|---|------|------------|--------------|
| 1 | Validator + DTO | `GenerarCuotasInput` | unit |
| 2 | Service + SQL | `GenerarCuotasPeriodoAsync` | integración BD test |
| 3 | Controller action | `CuotasController.Generar` | `.http` smoke |

## Plan de pruebas

| Prueba | Tipo | Cubre |
|---|---|---|
| `TC-1` | integración | CA-1 |
| `TC-2` | integración | CA-2 idempotencia |
| `TC-ERR-1` | negativo | CA-4, CA-5 |
| `TC-INV-1` | regresión | INV-1 FK Usuario/Casa |

## Estrategia de rollback

Revertir deploy API; cuotas generadas requieren soft-delete manual (fuera de alcance).

## Autoverificación

- [x] Alineado a spec; TC-ERR presente.
