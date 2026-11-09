[← index](_index.md) | [← design](design.md)

# Impl: FNZ-BE-037

- `POST /FNZ/Cuotas/generar` + `FinanzasService.GenerarCuotasPeriodoAsync` (idempotente por casa/periodo).
- `GenerarCuotasRequestValidator`.
- Tests: `GenerarCuotasRequestValidatorTests`.
