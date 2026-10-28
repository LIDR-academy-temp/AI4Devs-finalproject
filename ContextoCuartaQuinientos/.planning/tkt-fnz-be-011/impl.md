# Impl: tkt-fnz-be-011-registrar-pago

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- 2026-10-16 — CQ500 (MCP): `fnz.Cuotas` sin `MontoPagado`/`CuentaID` (DB-001 no aplicado en ese entorno); `CuotaPagoRepository` ya contempla columnas opcionales y cuenta por defecto.
- 2026-10-16 — Sello diseño `SIN SELLO` en toolkit; se ejecutó con design de 2026-09-24 confirmado en repo.
- 2026-10-16 — Dependencias [[FNZ-BE-010]], [[NTF-BE-013]] siguen `LISTO PARA EJECUTAR` pero el código compartido (estado cuenta + `INotificacionService`) ya está en `GraphApi`.

## Implementación realizada

- `PATCH /FNZ/Cuotas/{cuotaId}/pago` en `CuotasController` (`204`, política `SoloAdministrador`).
- `FinanzasService.RegistrarPagoAsync`: transacción, `UPDLOCK`, validación monto = cuota, `UPDATE … Pagado = 0`, abono en `fnz.Transacciones`, `PAGO_REGISTRADO` vía `INotificacionService`.
- `RegistrarPagoRequest` + `RegistrarPagoRequestValidator` (FluentValidation).
- `CuotaPagoRepository` con DML parametrizado.
- Smoke manual documentado: generar → PATCH pago → `GET /FNZ/Cuotas/mis` → `estado: "Pagada"` (UI `CuotasTable`).

## Archivos modificados

- `GraphApi/Controllers/FNZ/Cuotas/CuotasController.cs`
- `GraphApi/Services/FNZ/FinanzasService.cs`
- `GraphApi/Services/FNZ/IFinanzasService.cs`
- `GraphApi/Repositories/FNZ/CuotaPagoRepository.cs`
- `GraphApi/Repositories/FNZ/ICuotaPagoRepository.cs`
- `GraphApi/Models/FNZ/RegistrarPagoDtos.cs`
- `GraphApi/Models/FNZ/RegistrarPagoRequestValidator.cs`
- `GraphApi/Infrastructure/Extensions/ServiceCollectionExtensions.cs`
- `GraphApi/GraphApi.Tests/RegistrarPagoRequestValidatorTests.cs`
- `GraphApi/GraphApi.Tests/FinanzasServiceRegistrarPagoTests.cs`
- `ContextoCuartaQuinientos/.planning/tkt-fnz-be-011/FNZ-BE-011_api_tests.http`

## Auditoría SQL

- Estado: APROBADO (no DDL; DML solo vía repositorio parametrizado en C#)
- Hallazgos: ninguno en scope
- Correcciones: N/A

## Auditoría general

- Estado: APROBADO (revisión estática: auth admin, JWT autor, sin escritura directa `ntf.*`)
- Hallazgos: smoke HTTP contra API levantada pendiente (connection string en user-secrets)
- Correcciones: N/A

## Scripts de prueba creados

### T-SQL unitarias
- No aplica (ADR-001, sin SP de negocio)

### Contrato C# xUnit
- Archivo: `FinanzasServiceRegistrarPagoTests.cs`, `RegistrarPagoRequestValidatorTests.cs`
- `dotnet test`: 6 casos FNZ-BE-011 en verde con `DOTNET_ROLL_FORWARD=Major` (host sin ASP.NET 9.0 instalado)

### API `.http`
- Archivo: `FNZ-BE-011_api_tests.http`
- Endpoints: `POST generar`, `PATCH …/pago`, `GET mis`, casos 422/403

## Resultado contra criterios de aceptación

- [x] CA-1 pago exitoso (`RegistrarPago_happy_path_*`, endpoint implementado)
- [x] CA-2 ya pagada → 409
- [x] CA-3 concurrencia — perdedor con `UPDATE` 0 filas → 409 (`RegistrarPago_update_cero_filas_*`); paralelo HTTP no automatizado
- [x] CA-4 monto 0 → 400 (validador)
- [x] CA-5 monto distinto → 422
- [x] CA-6 inexistente → 404
- [x] CA-7 referencia vacía (validador) / fecha futura → 400 (servicio)
- [x] CA-8 residente → 403 (`[Authorize(Policy = SoloAdministrador)]`)
- [x] CA-9 rollback si falla notificación (`RegistrarPago_notificacion_falla_*`)
- [x] CA-10 tipo movimiento ausente → 422 (`RegistrarPago_sin_tipo_movimiento_*`)
- [x] CA-11 sin cuenta → 422 cuando columna existe (servicio)
- [x] CA-R1 / CA-R2 — invocación `PAGO_REGISTRADO` + abono en happy path (`RegistrarPago_happy_path_notifica_*`); outbox Telegram en BD: pendiente smoke HTTP

## Smoke E2E (manual)

1. Admin: `POST /FNZ/Cuotas/generar` (mes/año/monto).
2. Admin: `PATCH /FNZ/Cuotas/{cuotaId}/pago` con `montoPagado` = `monto` de la cuota.
3. Residente: `GET /FNZ/Cuotas/mis` → la cuota con `estado` **Pagada**; en Web `/finanzas/cuenta` badge verde.

**Siguiente ticket sugerido:** [[FNZ-BE-012]] (morosos) o [[FE-039]] (modal admin pago).

## Verificación final (`/revisar` 2026-10-16)

| Dimensión | Resultado |
|-----------|-----------|
| Completitud CA `[M]` | OK en xUnit (11 casos FNZ-BE-011); smoke HTTP E2E no ejecutado (401 login — credenciales distintas a ejemplo readme) |
| Corrección vs spec | OK — sin pagos parciales, sin SP, notificación vía `INotificacionService` |
| Coherencia design ↔ código | OK — objetos alineados a `design.md` |

**Pruebas ejecutadas:** `dotnet test` filtro `FinanzasServiceRegistrarPago|RegistrarPagoRequestValidator` → **11/11 PASS** (`DOTNET_ROLL_FORWARD=Major`). API `/health` → 200 con `dotnet run` local.

**Pendiente no bloqueante:** 1 ejecución manual de `FNZ-BE-011_api_tests.http` con credenciales reales; verificar fila `ntf.NotificacionesEntrega` en BD tras pago.

**APIs Front:** [FNZ-BE-011-APIS.md](FNZ-BE-011-APIS.md)
