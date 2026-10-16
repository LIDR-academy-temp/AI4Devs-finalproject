# Archivos de muestra

Conjunto de prueba del MVP. Todos los datos son sintéticos: los IDs, importes, canales y
cuentas salen de `backend/prisma/synthetic.ts` con una semilla fija, la misma que usa el seed
de la base de datos, así que **los archivos solo tienen sentido sobre una base sembrada con
`pnpm --filter backend db:seed`**. Fecha de referencia del dataset: 2026-10-12.

| Carpeta | Cuenta | Qué prueba | Resultado esperado |
|---|---|---|---|
| `batch-clean/` | ProviderA-USD · batch 123 | Flujo completo sin incidencias; un canal nuevo (RAM-07); dos fees por batch prellenados desde `Other Fees` | 0 hallazgos; totales del summary en `expected.json` |
| `batch-split/` | ProviderA-USD · batch 123 | El mismo batch en dos archivos (E en `part1`; I, R y fees en `part2`) | Idéntico a `batch-clean` |
| `batch-issues/` | ProviderB-Main · batch 52 | Una incidencia de cada validación no bloqueante, canal nuevo (RAM-13), ID desconocido, importe negativo, tipo de fee fuera de catálogo | Conteos por validación e IDs afectados en `expected.json` |
| `batch-blocked/` | ProviderB-Main · batch 52 | Una transacción de un canal de otro proveedor | `provider_mismatch` = 1, import bloqueado |
| `legacy-provider/` | ProviderC-Alt · batch 7 | Nombres de hoja y columna antiguos resueltos por el conjunto de reglas "Provider C legacy"; gateway UUID; alias `CHB 2` con importe excluido | 0 hallazgos; un movimiento con `excludeAmount` |

`excel-real-sample.xlsx` (sin carpeta ni `expected.json`) es la plantilla guardada por Excel de
escritorio con datos sintéticos: usa `sharedStrings.xml`, estilos y filas vacías con formato, que
openpyxl no genera. Solo sirve para probar el lector de `.xlsx` del backend y **no se regenera**.

Cada carpeta lleva un `expected.json` con lo que la aplicación debe producir al importar,
analizar y validar ese conjunto: filas leídas y cruzadas, rangos por ciclo, advertencias,
conteo por validación, valores por defecto de inclusión y, cuando aplica, los totales del
summary. Son el oráculo de los tests de integración y E2E (README §2.6).

## Regenerar

```bash
pnpm tsx data/samples/plan.ts > data/samples/plan.json
python data/samples/build-samples.py      # requiere openpyxl
```

`plan.json` es un intermedio y no se versiona. Cambiar la semilla o los parámetros de
`synthetic.ts` obliga a volver a sembrar la base y a regenerar las muestras a la vez.
