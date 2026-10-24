import { createHash } from 'node:crypto';
import Decimal from 'decimal.js';
import { generateDataset } from './generator';
import { SCENARIO_KINDS, STANDARD_PROPORTIONS } from './scenarios';
import { bankToRecords, BANK_HEADERS, posToRecords, POS_HEADERS, toCsv, toXlsx } from './writers';
import type { Dataset, ScenarioKind } from './types';

const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const parseComma = (s: string) => new Decimal(s.replace(/\./g, '').replace(',', '.'));
const parseDot = (s: string) => new Decimal(s);

describe('generateDataset', () => {
  describe('reproducibilidad', () => {
    it('misma semilla y parámetros producen el mismo dataset', () => {
      const a = generateDataset({ seed: 'repro', posCount: 300 });
      const b = generateDataset({ seed: 'repro', posCount: 300 });
      expect(a).toEqual(b);
    });

    it('misma semilla produce CSV y XLSX idénticos byte a byte', () => {
      const a = generateDataset({ seed: 'repro', posCount: 200 });
      const b = generateDataset({ seed: 'repro', posCount: 200 });
      expect(sha(toCsv(POS_HEADERS, posToRecords(a.pos), ';'))).toBe(
        sha(toCsv(POS_HEADERS, posToRecords(b.pos), ';')),
      );
      expect(sha(toCsv(BANK_HEADERS, bankToRecords(a.bank), ','))).toBe(
        sha(toCsv(BANK_HEADERS, bankToRecords(b.bank), ',')),
      );
      expect(sha(toXlsx(POS_HEADERS, posToRecords(a.pos), 'Ventas'))).toBe(
        sha(toXlsx(POS_HEADERS, posToRecords(b.pos), 'Ventas')),
      );
    });

    it('semillas distintas producen datasets distintos', () => {
      const a = generateDataset({ seed: 'uno', posCount: 100 });
      const b = generateDataset({ seed: 'dos', posCount: 100 });
      expect(a.pos.map((r) => r.authCode)).not.toEqual(b.pos.map((r) => r.authCode));
    });
  });

  describe('dataset estándar', () => {
    const dataset = generateDataset({ seed: 'estandar', posCount: 1200 });

    it('genera al menos 1.000 ventas POS y combina todos los escenarios', () => {
      expect(dataset.pos.length).toBeGreaterThanOrEqual(1000);
      for (const kind of SCENARIO_KINDS) {
        expect(dataset.expected.summary.byScenario[kind]).toBeGreaterThan(0);
      }
    });

    it('respeta aproximadamente las proporciones documentadas (±3 puntos)', () => {
      const total = dataset.pos.length;
      const salesByScenario = countSalesByScenario(dataset);
      for (const kind of SCENARIO_KINDS) {
        const actual = salesByScenario[kind] / total;
        expect(Math.abs(actual - STANDARD_PROPORTIONS[kind])).toBeLessThan(0.03);
      }
    });

    it('incluye débitos que la importación debe descartar', () => {
      expect(dataset.expected.bankDebitRows.length).toBeGreaterThan(0);
      for (const row of dataset.expected.bankDebitRows) {
        expect(dataset.bank[row - 1].type).toBe('D');
      }
      expect(dataset.bank.filter((r) => r.type === 'D').length).toBe(
        dataset.expected.bankDebitRows.length,
      );
    });
  });

  describe('consistencia entre archivos y expected.json', () => {
    const dataset = generateDataset({ seed: 'consistencia', posCount: 600 });
    const { pos, bank, expected } = dataset;

    it('toda referencia de fila existe y los números de fila son consecutivos', () => {
      expect(pos.map((r) => r.rowNumber)).toEqual(pos.map((_, i) => i + 1));
      expect(bank.map((r) => r.rowNumber)).toEqual(bank.map((_, i) => i + 1));
      const allPos = [
        ...expected.matches.flatMap((m) => m.posRows),
        ...expected.ambiguous.flatMap((a) => a.posRows),
        ...expected.unmatchedPosRows,
      ];
      const allBank = [
        ...expected.matches.flatMap((m) => m.bankRows),
        ...expected.ambiguous.flatMap((a) => a.bankRows),
        ...expected.unmatchedBankRows,
        ...expected.bankDebitRows,
      ];
      expect([...allPos].sort((a, b) => a - b)).toEqual(pos.map((r) => r.rowNumber));
      expect([...allBank].sort((a, b) => a - b)).toEqual(bank.map((r) => r.rowNumber));
    });

    it('cada venta y cada abono aparece en exactamente una entrada del resultado esperado', () => {
      const posSeen = new Map<number, number>();
      const bankSeen = new Map<number, number>();
      const bump = (map: Map<number, number>, rows: number[]) =>
        rows.forEach((r) => map.set(r, (map.get(r) ?? 0) + 1));
      expected.matches.forEach((m) => (bump(posSeen, m.posRows), bump(bankSeen, m.bankRows)));
      expected.ambiguous.forEach((a) => (bump(posSeen, a.posRows), bump(bankSeen, a.bankRows)));
      bump(posSeen, expected.unmatchedPosRows);
      bump(bankSeen, expected.unmatchedBankRows);
      bump(bankSeen, expected.bankDebitRows);
      expect([...posSeen.values()].every((n) => n === 1)).toBe(true);
      expect([...bankSeen.values()].every((n) => n === 1)).toBe(true);
    });

    it('los cruces exactos coinciden en autorización, monto y fecha', () => {
      for (const m of expected.matches.filter((m) => m.level === 'EXACT')) {
        const p = pos[m.posRows[0] - 1];
        const b = bank[m.bankRows[0] - 1];
        expect(b.authCode).toBe(p.authCode);
        expect(parseDot(b.amount).equals(parseComma(p.amount))).toBe(true);
        expect(b.postedAt).toBe(p.date.split('/').reverse().join('-'));
      }
    });

    it('los cruces por tolerancia tienen desfase de 1 a 3 días, mismo monto y últimos 4, sin autorización', () => {
      for (const m of expected.matches.filter((m) => m.level === 'TOLERANCE')) {
        const p = pos[m.posRows[0] - 1];
        const b = bank[m.bankRows[0] - 1];
        expect(b.authCode).toBe('');
        expect(b.card.slice(-4)).toBe(p.card.slice(-4));
        expect(parseDot(b.amount).equals(parseComma(p.amount))).toBe(true);
        const days =
          (Date.parse(b.postedAt) - Date.parse(p.date.split('/').reverse().join('-'))) / 86_400_000;
        expect(days).toBeGreaterThanOrEqual(1);
        expect(days).toBeLessThanOrEqual(expected.config.dateWindowDays);
      }
    });

    it('los cruces agrupados suman exactamente el bruto y el neto declarado', () => {
      const fee = new Decimal(expected.config.feePercent).div(100);
      const wh = new Decimal(expected.config.withholdingPercent).div(100);
      const grouped = expected.matches.filter((m) => m.level === 'GROUPED');
      expect(grouped.length).toBeGreaterThan(0);
      for (const m of grouped) {
        const b = bank[m.bankRows[0] - 1];
        const gross = m.posRows.reduce(
          (acc, r) => acc.plus(parseComma(pos[r - 1].amount)),
          new Decimal(0),
        );
        expect(m.autoConfirm).toBe(false);
        expect(m.cardinality).toBe('MANY_TO_ONE');
        if (m.scenario === 'batch') {
          expect(parseDot(b.amount).equals(gross)).toBe(true);
          expect(b.grossAmount).toBe('');
        } else {
          const expectedNet = gross
            .minus(gross.mul(fee).toDecimalPlaces(2))
            .minus(gross.mul(wh).toDecimalPlaces(2));
          expect(parseDot(b.grossAmount).equals(gross)).toBe(true);
          expect(parseDot(b.amount).equals(expectedNet)).toBe(true);
        }
        const batches = new Set(m.posRows.map((r) => pos[r - 1].batchNumber));
        expect(batches.size).toBe(1);
        expect(b.batchNumber).toBe([...batches][0]);
      }
    });

    it('las ventas duplicadas comparten autorización, monto y fecha', () => {
      expect(expected.ambiguous.length).toBeGreaterThan(0);
      for (const a of expected.ambiguous) {
        const [p1, p2] = a.posRows.map((r) => pos[r - 1]);
        expect(p1.authCode).toBe(p2.authCode);
        expect(p1.amount).toBe(p2.amount);
        expect(p1.date).toBe(p2.date);
        expect(a.bankRows).toHaveLength(1);
      }
    });
  });

  describe('datos sin información sensible', () => {
    const dataset = generateDataset({ seed: 'pci', posCount: 400 });

    it('las tarjetas aparecen enmascaradas con solo los últimos 4 dígitos', () => {
      for (const r of dataset.pos) expect(r.card).toMatch(/^\*{4} \*{4} \*{4} \d{4}$/);
      for (const r of dataset.bank) if (r.card) expect(r.card).toMatch(/^\*{4} \*{4} \*{4} \d{4}$/);
    });

    it('ningún campo contiene una secuencia de 13 o más dígitos', () => {
      const todo = [...posToRecords(dataset.pos), ...bankToRecords(dataset.bank)].flat().join('|');
      expect(todo).not.toMatch(/\d{13,}/);
    });
  });

  describe('escenarios individuales', () => {
    it.each(SCENARIO_KINDS)(
      'el dataset "%s" contiene únicamente casos de ese escenario',
      (kind) => {
        const dataset = generateDataset({
          seed: `solo-${kind}`,
          scenario: kind,
          posCount: 100,
          includeDebits: false,
        });
        const { byScenario } = dataset.expected.summary;
        for (const other of SCENARIO_KINDS) {
          if (other === kind) expect(byScenario[other]).toBeGreaterThan(0);
          else expect(byScenario[other]).toBe(0);
        }
        expect(dataset.expected.bankDebitRows).toHaveLength(0);
      },
    );

    it('un escenario huérfano POS no genera abonos', () => {
      const dataset = generateDataset({ seed: 'x', scenario: 'orphanPos', posCount: 50 });
      expect(dataset.bank).toHaveLength(0);
      expect(dataset.expected.unmatchedPosRows).toHaveLength(dataset.pos.length);
    });
  });
});

function countSalesByScenario(dataset: Dataset): Record<ScenarioKind, number> {
  const counts = Object.fromEntries(SCENARIO_KINDS.map((k) => [k, 0])) as Record<
    ScenarioKind,
    number
  >;
  dataset.expected.matches.forEach((m) => (counts[m.scenario] += m.posRows.length));
  dataset.expected.ambiguous.forEach((a) => (counts.duplicate += a.posRows.length));
  counts.orphanPos += dataset.expected.unmatchedPosRows.length;
  // orphanBank no aporta ventas POS: su proporción se mide sobre abonos, se compara contra 0 ventas
  return counts;
}
