/**
 * Tipos del generador de datasets sintéticos POS/banco.
 * Cada dataset viene acompañado de un resultado esperado (expected.json) que indica
 * qué filas deben cruzar entre sí y mediante qué nivel del motor.
 */

/** Escenarios de conciliación con resultado conocido. */
export type ScenarioKind =
  | 'exact' // misma autorización, monto y fecha → nivel 1
  | 'dateShift' // mismo monto y últimos 4, acreditado 1-3 días después, sin autorización → nivel 2
  | 'batch' // varias ventas del mismo lote → un depósito por la suma bruta → nivel 3
  | 'net' // varias ventas → un depósito neto de comisión y retención → nivel 3
  | 'duplicate' // venta duplicada en el POS con un solo abono → ambiguo, no debe confirmarse
  | 'orphanPos' // venta sin abono (p. ej. pendiente de acreditación)
  | 'orphanBank'; // abono sin venta (p. ej. error de registro en el POS)

export type DatasetScenario = ScenarioKind | 'standard';

export type MatchLevel = 'EXACT' | 'TOLERANCE' | 'GROUPED';
export type Cardinality = 'ONE_TO_ONE' | 'MANY_TO_ONE';

/** Fila del reporte de ventas del POS (columnas tal como se exportan). */
export interface PosRow {
  /** Número de fila de datos (1 = primera fila tras la cabecera) */
  rowNumber: number;
  date: string; // dd/MM/yyyy
  time: string; // HH:mm
  storeCode: string;
  terminalId: string;
  batchNumber: string;
  authCode: string;
  /** Tarjeta enmascarada: **** **** **** 1234 */
  card: string;
  brand: string;
  /** Monto con separador decimal coma: 1.234,56 */
  amount: string;
  reference: string;
}

/** Fila del extracto bancario (solo abonos salvo los débitos de relleno). */
export interface BankRow {
  rowNumber: number;
  postedAt: string; // yyyy-MM-dd
  valueDate: string; // yyyy-MM-dd
  description: string;
  reference: string;
  batchNumber: string;
  authCode: string;
  card: string;
  /** Montos con punto decimal: 1234.56 (vacío cuando no aplica) */
  grossAmount: string;
  feeAmount: string;
  withholdingAmount: string;
  amount: string;
  /** C = crédito (abono), D = débito */
  type: 'C' | 'D';
}

export interface ExpectedMatch {
  scenario: ScenarioKind;
  level: MatchLevel;
  cardinality: Cardinality;
  /** Referencias por número de fila de datos en cada archivo */
  posRows: number[];
  bankRows: number[];
  /** Si el motor puede confirmarlo automáticamente o debe dejarlo como propuesta */
  autoConfirm: boolean;
}

export interface ExpectedAmbiguous {
  scenario: 'duplicate';
  posRows: number[];
  bankRows: number[];
  note: string;
}

export interface ExpectedResult {
  seed: string;
  scenario: DatasetScenario;
  period: { start: string; end: string };
  config: { feePercent: number; withholdingPercent: number; dateWindowDays: number };
  formats: {
    pos: { delimiter: string; dateFormat: string; decimalSeparator: string };
    bank: { delimiter: string; dateFormat: string; decimalSeparator: string };
  };
  summary: {
    posRows: number;
    bankRows: number;
    bankDebitRows: number;
    byScenario: Record<ScenarioKind, number>;
  };
  matches: ExpectedMatch[];
  /** Combinaciones que el motor NO debe confirmar automáticamente */
  ambiguous: ExpectedAmbiguous[];
  unmatchedPosRows: number[];
  unmatchedBankRows: number[];
  /** Filas de débito del extracto que la importación debe descartar */
  bankDebitRows: number[];
}

export interface GeneratorOptions {
  seed: string;
  scenario: DatasetScenario;
  /** Número aproximado de ventas POS a generar */
  posCount: number;
  periodStart: string; // yyyy-MM-dd
  periodEnd: string; // yyyy-MM-dd
  feePercent: number; // p. ej. 2.5
  withholdingPercent: number; // p. ej. 1
  /** Añadir filas de débito al extracto (solo tiene sentido en el dataset estándar) */
  includeDebits: boolean;
}

export interface Dataset {
  pos: PosRow[];
  bank: BankRow[];
  expected: ExpectedResult;
}
