import Decimal from 'decimal.js';
import { Rng } from './random';
import { SCENARIO_KINDS, STANDARD_PROPORTIONS } from './scenarios';
import {
  addDays,
  daysBetween,
  formatAmountComma,
  formatAmountDot,
  maskCard,
  parseIsoDate,
  toIso,
  toLatam,
} from './format';
import type {
  BankRow,
  Dataset,
  ExpectedAmbiguous,
  ExpectedMatch,
  GeneratorOptions,
  PosRow,
  ScenarioKind,
} from './types';

const BRANDS = ['VISA', 'MASTERCARD', 'DINERS', 'AMEX'] as const;
const STORES = ['L001', 'L002', 'L003'] as const;
const DATE_WINDOW_DAYS = 3;

export const DEFAULT_OPTIONS: GeneratorOptions = {
  seed: 'concilia-2026',
  scenario: 'standard',
  posCount: 1200,
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  feePercent: 2.5,
  withholdingPercent: 1,
  includeDebits: true,
};

/** Venta en memoria antes de formatearla como fila de archivo. */
interface Sale {
  date: Date;
  time: string;
  storeCode: string;
  terminalId: string;
  batchNumber: string;
  authCode: string;
  last4: string;
  brand: string;
  amount: Decimal;
  reference: string;
}

interface Credit {
  postedAt: Date;
  valueDate: Date;
  description: string;
  reference: string;
  batchNumber: string;
  authCode: string;
  last4: string;
  gross?: Decimal;
  fee?: Decimal;
  withholding?: Decimal;
  amount: Decimal;
  type: 'C' | 'D';
}

/** Caso generado: ventas, abonos y cómo deben relacionarse. */
interface Case {
  scenario: ScenarioKind;
  sales: Sale[];
  credits: Credit[];
  link?: {
    level: ExpectedMatch['level'];
    cardinality: ExpectedMatch['cardinality'];
    autoConfirm: boolean;
  };
  ambiguousNote?: string;
}

export function generateDataset(partial: Partial<GeneratorOptions> = {}): Dataset {
  const options: GeneratorOptions = { ...DEFAULT_OPTIONS, ...partial };
  const rng = new Rng(options.seed);
  const periodStart = parseIsoDate(options.periodStart);
  const periodEnd = parseIsoDate(options.periodEnd);
  const periodDays = daysBetween(periodStart, periodEnd);
  if (periodDays < 0) throw new Error('periodEnd debe ser posterior o igual a periodStart');

  const fee = new Decimal(options.feePercent).div(100);
  const withholding = new Decimal(options.withholdingPercent).div(100);

  const newSale = (date: Date, storeCode: string, batchNumber: string): Sale => ({
    date,
    time: `${String(rng.int(8, 21)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`,
    storeCode,
    terminalId: `T${storeCode.slice(1)}${rng.int(1, 4)}`,
    batchNumber,
    authCode: rng.alnum(6),
    last4: rng.digits(4),
    brand: rng.pick(BRANDS),
    amount: rng.amount(5, 450),
    reference: `REF${rng.digits(8)}`,
  });

  const randomDate = (): Date => addDays(periodStart, rng.int(0, periodDays));
  const batchFor = (date: Date, store: string): string =>
    `B${toIso(date).replace(/-/g, '').slice(2)}${store.slice(2)}`;

  const buildCase = (scenario: ScenarioKind): Case => {
    const date = randomDate();
    const store = rng.pick(STORES);
    const batch = batchFor(date, store);
    switch (scenario) {
      case 'exact': {
        const sale = newSale(date, store, batch);
        return {
          scenario,
          sales: [sale],
          credits: [creditFromSale(sale, date, { withAuth: true })],
          link: { level: 'EXACT', cardinality: 'ONE_TO_ONE', autoConfirm: true },
        };
      }
      case 'dateShift': {
        const sale = newSale(date, store, batch);
        const posted = addDays(date, rng.int(1, DATE_WINDOW_DAYS));
        return {
          scenario,
          sales: [sale],
          credits: [creditFromSale(sale, posted, { withAuth: false })],
          link: { level: 'TOLERANCE', cardinality: 'ONE_TO_ONE', autoConfirm: true },
        };
      }
      case 'batch':
      case 'net': {
        const size = rng.int(3, 8);
        const sales = Array.from({ length: size }, () => newSale(date, store, batch));
        const gross = sales.reduce((acc, s) => acc.plus(s.amount), new Decimal(0));
        const posted = addDays(date, rng.int(1, 2));
        const credit: Credit =
          scenario === 'batch'
            ? {
                postedAt: posted,
                valueDate: posted,
                description: `ABONO TARJETAS LOTE ${batch} ${store}`,
                reference: batch,
                batchNumber: batch,
                authCode: '',
                last4: '',
                amount: gross,
                type: 'C',
              }
            : (() => {
                const feeAmount = gross.mul(fee).toDecimalPlaces(2);
                const withholdingAmount = gross.mul(withholding).toDecimalPlaces(2);
                return {
                  postedAt: posted,
                  valueDate: posted,
                  description: `LIQUIDACION NETA LOTE ${batch} ${store}`,
                  reference: batch,
                  batchNumber: batch,
                  authCode: '',
                  last4: '',
                  gross,
                  fee: feeAmount,
                  withholding: withholdingAmount,
                  amount: gross.minus(feeAmount).minus(withholdingAmount),
                  type: 'C' as const,
                };
              })();
        return {
          scenario,
          sales,
          credits: [credit],
          link: { level: 'GROUPED', cardinality: 'MANY_TO_ONE', autoConfirm: false },
        };
      }
      case 'duplicate': {
        const sale = newSale(date, store, batch);
        const copy: Sale = { ...sale, reference: `REF${rng.digits(8)}` };
        return {
          scenario,
          sales: [sale, copy],
          credits: [creditFromSale(sale, date, { withAuth: true })],
          ambiguousNote:
            'Dos ventas POS idénticas (misma autorización, monto y fecha) para un solo abono',
        };
      }
      case 'orphanPos':
        return { scenario, sales: [newSale(date, store, batch)], credits: [] };
      case 'orphanBank': {
        const sale = newSale(date, store, batch);
        return { scenario, sales: [], credits: [creditFromSale(sale, date, { withAuth: true })] };
      }
    }
  };

  const cases: Case[] = [];
  const plan = planScenarios(options, rng);
  for (const scenario of plan) {
    cases.push(buildCase(scenario));
  }

  // Débitos de relleno (solo estándar): la importación debe descartarlos
  const debits: Credit[] = [];
  if (options.includeDebits && options.scenario === 'standard') {
    const count = Math.max(1, Math.round(options.posCount * 0.01));
    for (let i = 0; i < count; i++) {
      const d = randomDate();
      debits.push({
        postedAt: d,
        valueDate: d,
        description: rng.pick([
          'COMISION MANTENIMIENTO',
          'PAGO SERVICIOS',
          'TRANSFERENCIA ENVIADA',
        ]),
        reference: `DEB${rng.digits(6)}`,
        batchNumber: '',
        authCode: '',
        last4: '',
        amount: rng.amount(10, 900),
        type: 'D',
      });
    }
  }

  // Materializar filas: las ventas ordenadas por fecha/hora, los abonos por fecha contable.
  type SaleRef = { sale: Sale; caseIndex: number };
  type CreditRef = { credit: Credit; caseIndex: number | null };
  const saleRefs: SaleRef[] = [];
  const creditRefs: CreditRef[] = [];
  cases.forEach((c, caseIndex) => {
    c.sales.forEach((sale) => saleRefs.push({ sale, caseIndex }));
    c.credits.forEach((credit) => creditRefs.push({ credit, caseIndex }));
  });
  debits.forEach((credit) => creditRefs.push({ credit, caseIndex: null }));

  const sortedSales = rng
    .shuffle(saleRefs)
    .sort(
      (a, b) =>
        a.sale.date.getTime() - b.sale.date.getTime() || a.sale.time.localeCompare(b.sale.time),
    );
  const sortedCredits = rng
    .shuffle(creditRefs)
    .sort((a, b) => a.credit.postedAt.getTime() - b.credit.postedAt.getTime());

  const posRowsByCase = new Map<number, number[]>();
  const pos: PosRow[] = sortedSales.map(({ sale, caseIndex }, i) => {
    const rowNumber = i + 1;
    posRowsByCase.set(caseIndex, [...(posRowsByCase.get(caseIndex) ?? []), rowNumber]);
    return {
      rowNumber,
      date: toLatam(sale.date),
      time: sale.time,
      storeCode: sale.storeCode,
      terminalId: sale.terminalId,
      batchNumber: sale.batchNumber,
      authCode: sale.authCode,
      card: maskCard(sale.last4),
      brand: sale.brand,
      amount: formatAmountComma(sale.amount),
      reference: sale.reference,
    };
  });

  const bankRowsByCase = new Map<number, number[]>();
  const bankDebitRows: number[] = [];
  const bank: BankRow[] = sortedCredits.map(({ credit, caseIndex }, i) => {
    const rowNumber = i + 1;
    if (caseIndex === null) bankDebitRows.push(rowNumber);
    else bankRowsByCase.set(caseIndex, [...(bankRowsByCase.get(caseIndex) ?? []), rowNumber]);
    return {
      rowNumber,
      postedAt: toIso(credit.postedAt),
      valueDate: toIso(credit.valueDate),
      description: credit.description,
      reference: credit.reference,
      batchNumber: credit.batchNumber,
      authCode: credit.authCode,
      card: credit.last4 ? maskCard(credit.last4) : '',
      grossAmount: credit.gross ? formatAmountDot(credit.gross) : '',
      feeAmount: credit.fee ? formatAmountDot(credit.fee) : '',
      withholdingAmount: credit.withholding ? formatAmountDot(credit.withholding) : '',
      amount: formatAmountDot(credit.amount),
      type: credit.type,
    };
  });

  const matches: ExpectedMatch[] = [];
  const ambiguous: ExpectedAmbiguous[] = [];
  const unmatchedPosRows: number[] = [];
  const unmatchedBankRows: number[] = [];
  const byScenario = Object.fromEntries(SCENARIO_KINDS.map((k) => [k, 0])) as Record<
    ScenarioKind,
    number
  >;

  cases.forEach((c, caseIndex) => {
    byScenario[c.scenario] += 1;
    const posRows = posRowsByCase.get(caseIndex) ?? [];
    const bankRows = bankRowsByCase.get(caseIndex) ?? [];
    if (c.link) {
      matches.push({ scenario: c.scenario, ...c.link, posRows, bankRows });
    } else if (c.scenario === 'duplicate') {
      ambiguous.push({ scenario: 'duplicate', posRows, bankRows, note: c.ambiguousNote ?? '' });
    } else {
      unmatchedPosRows.push(...posRows);
      unmatchedBankRows.push(...bankRows);
    }
  });

  return {
    pos,
    bank,
    expected: {
      seed: options.seed,
      scenario: options.scenario,
      period: { start: options.periodStart, end: options.periodEnd },
      config: {
        feePercent: options.feePercent,
        withholdingPercent: options.withholdingPercent,
        dateWindowDays: DATE_WINDOW_DAYS,
      },
      formats: {
        pos: { delimiter: ';', dateFormat: 'dd/MM/yyyy', decimalSeparator: ',' },
        bank: { delimiter: ',', dateFormat: 'yyyy-MM-dd', decimalSeparator: '.' },
      },
      summary: {
        posRows: pos.length,
        bankRows: bank.length,
        bankDebitRows: bankDebitRows.length,
        byScenario,
      },
      matches,
      ambiguous,
      unmatchedPosRows: unmatchedPosRows.sort((a, b) => a - b),
      unmatchedBankRows: unmatchedBankRows.sort((a, b) => a - b),
      bankDebitRows,
    },
  };
}

/** Crea el abono bancario correspondiente a una venta individual. */
function creditFromSale(sale: Sale, postedAt: Date, opts: { withAuth: boolean }): Credit {
  return {
    postedAt,
    valueDate: postedAt,
    description: `VENTA TARJETA ${sale.brand} ${sale.storeCode}`,
    reference: sale.reference,
    batchNumber: sale.batchNumber,
    authCode: opts.withAuth ? sale.authCode : '',
    last4: sale.last4,
    amount: sale.amount,
    type: 'C',
  };
}

/**
 * Decide cuántos casos de cada escenario generar para aproximarse a posCount ventas.
 * Los escenarios de lote generan varias ventas por caso (media 5,5), por eso se divide.
 */
function planScenarios(options: GeneratorOptions, rng: Rng): ScenarioKind[] {
  const plan: ScenarioKind[] = [];
  if (options.scenario !== 'standard') {
    const perCase =
      options.scenario === 'batch' || options.scenario === 'net'
        ? 5.5
        : options.scenario === 'duplicate'
          ? 2
          : 1;
    const count = Math.max(1, Math.round(options.posCount / perCase));
    for (let i = 0; i < count; i++) plan.push(options.scenario);
    return plan;
  }
  for (const kind of SCENARIO_KINDS) {
    const sales = options.posCount * STANDARD_PROPORTIONS[kind];
    const perCase = kind === 'batch' || kind === 'net' ? 5.5 : kind === 'duplicate' ? 2 : 1;
    const count = Math.max(1, Math.round(sales / perCase));
    for (let i = 0; i < count; i++) plan.push(kind);
  }
  return rng.shuffle(plan);
}
