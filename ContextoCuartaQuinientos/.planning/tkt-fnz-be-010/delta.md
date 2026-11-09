[← index](_index.md) | [← impl](impl.md)

# delta.md — FNZ-BE-010

## Resumen

`GET /FNZ/Cuotas/mis` y `GET /FNZ/Cuotas?usuarioId=` con `EstadoCuentaDto`; clasificación en `CuotaEstadoClassifier` + `FinanzasService.ObtenerEstadoCuentaAsync`.

## Objetos

| Target | Objeto | Acción |
|---|---|---|
| backend | `CuotasController`, `FinanzasService`, `CuotaEstadoCuentaRepository` | MODIFICADO/NUEVO |
| backend | `CuotaEstadoClassifierTests`, `FinanzasServiceEstadoCuentaTests` | NUEVO |

## Invariantes

| INV | Resultado |
|---|---|
| INV-2 clasificación C# | ✅ tests classifier + servicio |
