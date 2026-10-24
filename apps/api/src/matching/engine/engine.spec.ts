import { Decimal } from 'decimal.js';
import { computeExpectedNet } from './expected-net.js';
import { MatchingEngine } from './engine.js';
import { normalizeKeyPart, storeBatchRefKey } from './keys.js';
import type { BankMov, EngineConfig, PosTxn } from './types.js';

const config: EngineConfig = {
  dateWindowDays: 3,
  amountTolerance: 0.05,
  feePercent: 0,
  withholdingPercent: 0,
};

let seq = 0;
const pos = (o: Partial<Omit<PosTxn, 'amount'>> & { amount?: string } = {}): PosTxn => ({
  id: `p${++seq}`,
  date: '2026-09-01',
  cardLast4: null,
  authCode: null,
  batchNumber: null,
  reference: null,
  bankStoreCode: null,
  ...o,
  amount: new Decimal(o.amount ?? '100.00'),
});
const bank = (
  o: Partial<Omit<BankMov, 'amount' | 'grossAmount'>> & {
    amount?: string;
    grossAmount?: string;
  } = {},
): BankMov => ({
  id: `b${++seq}`,
  date: '2026-09-01',
  cardLast4: null,
  authCode: null,
  batchNumber: null,
  reference: null,
  storeCode: null,
  ...o,
  amount: new Decimal(o.amount ?? '100.00'),
  grossAmount: o.grossAmount ? new Decimal(o.grossAmount) : null,
});

const engine = new MatchingEngine();

describe('claves de cruce', () => {
  it('quita prefijo alfabético y ceros a la izquierda', () => {
    expect(normalizeKeyPart('D001004   ')).toBe('1004');
    expect(normalizeKeyPart('000001533')).toBe('1533');
    expect(normalizeKeyPart('19733')).toBe('19733');
    expect(normalizeKeyPart('M000891')).toBe('891');
    expect(normalizeKeyPart('000')).toBe('0');
  });

  it('vacío o solo letras → null', () => {
    expect(normalizeKeyPart('  ')).toBeNull();
    expect(normalizeKeyPart(null)).toBeNull();
    expect(normalizeKeyPart('ABC')).toBeNull();
  });

  it('la clave exige local, lote y referencia', () => {
    expect(storeBatchRefKey('450404', 'D001038', '000019733')).toBe('450404|1038|19733');
    expect(storeBatchRefKey(null, '1', '2')).toBeNull();
    expect(storeBatchRefKey('1', null, '2')).toBeNull();
    expect(storeBatchRefKey('1', '1', '')).toBeNull();
  });
});

describe('nivel 1 · local + lote + referencia', () => {
  it('cruza clave única con el mismo monto bruto (neto distinto)', () => {
    const p = pos({
      bankStoreCode: '450404',
      batchNumber: 'D001038',
      reference: '000019733',
      amount: '100.37',
    });
    const b = bank({
      storeCode: '450404',
      batchNumber: '1038',
      reference: '19733',
      amount: '90.15',
      grossAmount: '100.37',
    });
    const [m, ...rest] = engine.run({ pos: [p], bank: [b] }, config);
    expect(rest).toHaveLength(0);
    expect(m).toMatchObject({
      method: 'EXACT',
      status: 'CONFIRMED',
      confidence: 1,
      posIds: [p.id],
      bankIds: [b.id],
    });
    expect(m!.difference.toFixed(2)).toBe('0.00');
  });

  it('local sin relación → no cruza en el nivel 1', () => {
    const p = pos({
      bankStoreCode: null,
      batchNumber: '1',
      reference: '1',
      amount: '10.00',
      date: '2026-09-01',
    });
    const b = bank({
      storeCode: '1',
      batchNumber: '1',
      reference: '1',
      amount: '10.00',
      date: '2026-09-10',
    });
    expect(engine.run({ pos: [p], bank: [b] }, config)).toEqual([]);
  });

  it('sin lote o sin referencia → no cruza', () => {
    const p = pos({ bankStoreCode: '1', batchNumber: null, reference: '1', date: '2026-09-01' });
    const b = bank({ storeCode: '1', batchNumber: '1', reference: '1', date: '2026-12-01' });
    expect(engine.run({ pos: [p], bank: [b] }, config)).toEqual([]);
  });

  it('misma clave y monto distinto → propuesta con la diferencia', () => {
    const p = pos({ bankStoreCode: '1', batchNumber: '1', reference: '1', amount: '50.00' });
    const b = bank({ storeCode: '1', batchNumber: '1', reference: '1', amount: '49.00' });
    const [m] = engine.run({ pos: [p], bank: [b] }, config);
    expect(m).toMatchObject({ method: 'EXACT', status: 'PROPOSED' });
    expect(m!.difference.toFixed(2)).toBe('-1.00');
  });

  it('clave duplicada en el POS → ninguna se cruza en el nivel 1', () => {
    const base = { bankStoreCode: '1', batchNumber: '1', reference: '1', amount: '50.00' };
    const b = bank({
      storeCode: '1',
      batchNumber: '1',
      reference: '1',
      amount: '50.00',
      date: '2026-12-01',
    });
    expect(engine.run({ pos: [pos(base), pos(base)], bank: [b] }, config)).toEqual([]);
  });

  it('clave duplicada en el banco (cuotas) → no cruza', () => {
    const p = pos({
      bankStoreCode: '1',
      batchNumber: '1',
      reference: '1',
      amount: '50.00',
      date: '2026-01-01',
    });
    const mk = () =>
      bank({
        storeCode: '1',
        batchNumber: '1',
        reference: '1',
        amount: '25.00',
        grossAmount: '50.00',
        date: '2026-12-01',
      });
    expect(engine.run({ pos: [p], bank: [mk(), mk()] }, config)).toEqual([]);
  });

  it('cruza por autorización + monto + fecha cuando ambos la traen', () => {
    const p = pos({ authCode: 'A1', amount: '75.00' });
    const b = bank({ authCode: 'A1', amount: '75.00' });
    const [m] = engine.run({ pos: [p], bank: [b] }, config);
    expect(m).toMatchObject({ method: 'EXACT', status: 'CONFIRMED', confidence: 1 });
  });

  it('autorización duplicada → bloqueo por ambigüedad', () => {
    const b = bank({ authCode: 'A1', amount: '75.00', date: '2026-10-01' });
    const ps = [pos({ authCode: 'A1', amount: '75.00' }), pos({ authCode: 'A1', amount: '75.00' })];
    expect(engine.run({ pos: ps, bank: [b] }, config)).toEqual([]);
  });

  it('sin autorización en alguno de los lados no usa el nivel por autorización', () => {
    const p = pos({ authCode: null, amount: '75.00', date: '2026-01-01' });
    const b = bank({ authCode: 'A1', amount: '75.00', date: '2026-06-01' });
    expect(engine.run({ pos: [p], bank: [b] }, config)).toEqual([]);
  });
});

describe('nivel 2 · tolerancia', () => {
  it('desfase dentro de la ventana → TOLERANCE', () => {
    const p = pos({ amount: '150.00', date: '2026-09-01' });
    const b = bank({ amount: '150.00', date: '2026-09-03' });
    const [m] = engine.run({ pos: [p], bank: [b] }, config);
    expect(m).toMatchObject({ method: 'TOLERANCE', status: 'PROPOSED', confidence: 0.75 });
    expect(m!.explanation).toContain('2 días de desfase');
  });

  it('fuera de ventana → sin cruce', () => {
    const p = pos({ amount: '150.00', date: '2026-09-01' });
    const b = bank({ amount: '150.00', date: '2026-09-06' });
    expect(engine.run({ pos: [p], bank: [b] }, config)).toEqual([]);
  });

  it('movimiento anterior a la venta → sin cruce', () => {
    const p = pos({ amount: '150.00', date: '2026-09-05' });
    const b = bank({ amount: '150.00', date: '2026-09-04' });
    expect(engine.run({ pos: [p], bank: [b] }, config)).toEqual([]);
  });

  it('depósito neto con 2 % de comisión y 1 % de retención', () => {
    const cfg = { ...config, feePercent: 2, withholdingPercent: 1 };
    const p = pos({ amount: '100.00' });
    const b = bank({ amount: '97.00' });
    const [m] = engine.run({ pos: [p], bank: [b] }, cfg);
    expect(m!.difference.toFixed(2)).toBe('-3.00');
  });

  it('neto fuera de tolerancia → sin cruce', () => {
    const cfg = { ...config, feePercent: 2, withholdingPercent: 1 };
    expect(
      engine.run({ pos: [pos({ amount: '100.00' })], bank: [bank({ amount: '96.90' })] }, cfg),
    ).toEqual([]);
  });

  it('único con últimos 4 coincidentes → CONFIRMED', () => {
    const p = pos({ cardLast4: '1234', date: '2026-09-01' });
    const b = bank({ cardLast4: '1234', date: '2026-09-02' });
    expect(engine.run({ pos: [p], bank: [b] }, config)[0]).toMatchObject({
      status: 'CONFIRMED',
      confidence: 0.95,
    });
  });

  it('único sin últimos 4 → PROPOSED', () => {
    const p = pos({ cardLast4: '1234' });
    const b = bank({ cardLast4: null });
    expect(engine.run({ pos: [p], bank: [b] }, config)[0]).toMatchObject({ status: 'PROPOSED' });
  });

  it('últimos 4 distintos descartan el candidato', () => {
    expect(
      engine.run(
        { pos: [pos({ cardLast4: '1111' })], bank: [bank({ cardLast4: '2222' })] },
        config,
      ),
    ).toEqual([]);
  });

  it('montos repetidos (3 ventas, 2 abonos) → no se confirma ninguno', () => {
    const ps = [pos({ amount: '10.00' }), pos({ amount: '10.00' }), pos({ amount: '10.00' })];
    const bs = [bank({ amount: '10.00' }), bank({ amount: '10.00' })];
    const found = engine.run({ pos: ps, bank: bs }, config);
    expect(found.filter((m) => m.status === 'CONFIRMED')).toEqual([]);
  });
});

describe('pipeline', () => {
  it('lo cruzado en el nivel 1 no se vuelve a considerar', () => {
    const p = pos({ bankStoreCode: '1', batchNumber: '1', reference: '1', amount: '10.00' });
    const b = bank({ storeCode: '1', batchNumber: '1', reference: '1', amount: '10.00' });
    const found = engine.run({ pos: [p], bank: [b] }, config);
    expect(found).toHaveLength(1);
    expect(found[0]!.method).toBe('EXACT');
  });

  it('ningún movimiento ni venta aparece en más de un cruce', () => {
    const ps = Array.from({ length: 50 }, (_, i) =>
      pos({ amount: String(10 + (i % 5)), date: `2026-09-0${1 + (i % 3)}` }),
    );
    const bs = Array.from({ length: 50 }, (_, i) =>
      bank({ amount: String(10 + (i % 5)), date: `2026-09-0${1 + (i % 4)}` }),
    );
    const found = engine.run({ pos: ps, bank: bs }, config);
    const posIds = found.flatMap((m) => m.posIds);
    const bankIds = found.flatMap((m) => m.bankIds);
    expect(new Set(posIds).size).toBe(posIds.length);
    expect(new Set(bankIds).size).toBe(bankIds.length);
  });

  it('aritmética decimal exacta: 0,10 + 0,20 = 0,30', () => {
    expect(new Decimal('0.10').plus('0.20').equals('0.30')).toBe(true);
  });
});

describe('computeExpectedNet', () => {
  it.each([
    ['100', 2, 1, '97.00'],
    ['100', 0, 0, '100.00'],
    ['33.33', 2.5, 1, '32.16'],
    ['0.10', 2, 1, '0.10'],
  ])('bruto %s comisión %s retención %s → %s', (gross, fee, wh, expected) => {
    expect(computeExpectedNet(gross, fee, wh).toFixed(2)).toBe(expected);
  });
});

describe('rendimiento', () => {
  it('10.000 × 10.000 en menos de 2 s', () => {
    const n = 10_000;
    const ps: PosTxn[] = [];
    const bs: BankMov[] = [];
    for (let i = 0; i < n; i++) {
      const day = `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`;
      const amount = (10 + (i % 4000) / 10).toFixed(2);
      ps.push(
        pos({
          amount,
          date: day,
          bankStoreCode: String(i % 30),
          batchNumber: String(i % 50),
          reference: String(i),
        }),
      );
      bs.push(
        bank({
          amount,
          date: day,
          storeCode: String(i % 30),
          batchNumber: String(i % 50),
          reference: String(i),
        }),
      );
    }
    const start = performance.now();
    const found = engine.run({ pos: ps, bank: bs }, config);
    const elapsed = performance.now() - start;
    expect(found.length).toBeGreaterThan(9_000);
    expect(elapsed).toBeLessThan(2_000);
  });

  it('nivel 2 con 10.000 × 10.000 sin claves en menos de 2 s', () => {
    const n = 10_000;
    const ps: PosTxn[] = [];
    const bs: BankMov[] = [];
    for (let i = 0; i < n; i++) {
      const day = `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`;
      const amount = (10 + i / 10).toFixed(2);
      ps.push(pos({ amount, date: day }));
      bs.push(bank({ amount, date: day }));
    }
    const start = performance.now();
    const found = engine.run({ pos: ps, bank: bs }, config);
    const elapsed = performance.now() - start;
    expect(found.length).toBeGreaterThan(9_000);
    expect(elapsed).toBeLessThan(2_000);
  });
});
