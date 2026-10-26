# Datasets sintéticos POS / banco

Pares de archivos de ventas con tarjeta (POS) y extracto bancario generados con casos de conciliación **de resultado conocido**, acompañados de un `expected.json` que indica qué filas deben cruzar entre sí y mediante qué nivel del motor. Sirven de oráculo para medir **precisión** (cruces correctos / cruces realizados) y **cobertura** (transacciones cruzadas / total) por escenario.

Todos los datos son ficticios. Las tarjetas aparecen siempre enmascaradas (`**** **** **** 1234`).

## Escenarios

| Escenario | Qué contiene | Resultado esperado |
|---|---|---|
| `exact` | Misma autorización, monto y fecha en POS y banco | Nivel 1 (EXACT), confirmado automáticamente |
| `dateShift` | Mismo monto y últimos 4; acreditado 1-3 días después, sin autorización | Nivel 2 (TOLERANCE), confirmado si el candidato es único |
| `batch` | 3-8 ventas del mismo lote y local → un abono por la suma bruta | Nivel 3 (GROUPED), siempre propuesta |
| `net` | 3-8 ventas → un abono neto de comisión y retención, con bruto, comisión y retención detallados | Nivel 3 (GROUPED), siempre propuesta |
| `duplicate` | La misma venta dos veces en el POS, un solo abono | Ambiguo: ningún nivel debe confirmar automáticamente |
| `orphanPos` | Venta sin abono | Pendiente POS |
| `orphanBank` | Abono sin venta | Pendiente banco |

## Dataset estándar (`standard/`)

Mezcla todos los escenarios con estas proporciones sobre el total de ventas POS (semilla `concilia-2026`, período septiembre 2026, comisión 2,5 %, retención 1 %, ventana 3 días):

| Escenario | Proporción | Ventas POS | Abonos |
|---|---|---|---|
| exact | 60 % | 720 | 720 |
| dateShift | 15 % | 180 | 180 |
| batch | 15 % | 183 | 33 |
| net | 5 % | 55 | 11 |
| duplicate | 3 % | 36 | 18 |
| orphanPos | 1 % | 12 | 0 |
| orphanBank | 1 % | 0 | 12 |
| débitos de relleno (tipo `D`) | — | — | 12 |
| **Total** | | **1.205** | **986** |

Resultado esperado: 944 cruces (720 EXACT, 180 TOLERANCE, 44 GROUPED), 18 combinaciones ambiguas, 12 ventas y 12 abonos sin contraparte, 12 débitos que la importación debe descartar.

## Formatos de archivo (a propósito distintos)

| Archivo | Delimitador CSV | Fecha | Decimal | Columnas |
|---|---|---|---|---|
| `pos.csv` / `pos.xlsx` | `;` | `dd/MM/yyyy` + columna Hora | coma (`1.234,56`) | Fecha, Hora, Local, Terminal, Lote, Autorizacion, Tarjeta, Marca, Monto, Referencia |
| `bank.csv` / `bank.xlsx` | `,` | `yyyy-MM-dd` | punto (`1234.56`) | Fecha Contable, Fecha Valor, Descripcion, Referencia, Lote, Autorizacion, Tarjeta, Monto Bruto, Comision, Retencion, Monto, Tipo (C/D) |

Los XLSX contienen los mismos valores que los CSV (como texto) y llevan fecha fija en sus metadatos para que la generación sea reproducible byte a byte.

## `expected.json`

```jsonc
{
  "seed": "concilia-2026",
  "scenario": "standard",
  "period": { "start": "2026-09-01", "end": "2026-09-30" },
  "config": { "feePercent": 2.5, "withholdingPercent": 1, "dateWindowDays": 3 },
  "formats": { "pos": { "delimiter": ";", "dateFormat": "dd/MM/yyyy", "decimalSeparator": "," }, "bank": { ... } },
  "summary": { "posRows": 1205, "bankRows": 986, "bankDebitRows": 12, "byScenario": { "exact": 720, ... } },
  "matches": [
    { "scenario": "exact", "level": "EXACT", "cardinality": "ONE_TO_ONE", "posRows": [1], "bankRows": [3], "autoConfirm": true }
  ],
  "ambiguous": [{ "scenario": "duplicate", "posRows": [40, 41], "bankRows": [37], "note": "..." }],
  "unmatchedPosRows": [...],
  "unmatchedBankRows": [...],
  "bankDebitRows": [...]
}
```

Las referencias son **números de fila de datos** (1 = primera fila tras la cabecera), idénticos en CSV y XLSX.

## Regenerar

```bash
npm run samples:generate                          # estándar → samples/standard
npm run samples:generate -- --all                 # estándar + un dataset por escenario en samples/scenarios/<escenario>
npm run samples:generate -- --scenario net --pos 500 --seed otra --out /tmp/net
npm test -w samples                               # tests del generador (reproducibilidad y consistencia)
```

Uso desde código (tests del motor):

```ts
import { generateDataset } from '../../samples/src/generator';
const { pos, bank, expected } = generateDataset({ scenario: 'exact', seed: 'test', posCount: 1000 });
```
