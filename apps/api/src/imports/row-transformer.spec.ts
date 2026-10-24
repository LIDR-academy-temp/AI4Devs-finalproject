import {
  isDebitType,
  transformRow,
  type BankData,
  type PosData,
  type TransformOptions,
} from './row-transformer.js';

const posOptions = (overrides: Partial<TransformOptions> = {}): TransformOptions => ({
  sourceType: 'POS',
  mapping: new Map([
    ['transactionAt', 0],
    ['amount', 1],
    ['authCode', 2],
    ['cardLast4', 3],
    ['batchNumber', 4],
    ['storeCode', 5],
    ['reference', 6],
  ]),
  dateFormat: 'dd/MM/yyyy',
  decimalSeparator: ',',
  headers: ['Fecha', 'Monto', 'Aut', 'Tarjeta', 'Lote', 'Local', 'Ref'],
  ...overrides,
});

const bankOptions = (extra: [string, number][] = []): TransformOptions => ({
  sourceType: 'BANK',
  mapping: new Map<string, number>([['postedAt', 0], ['amount', 1], ...extra]),
  dateFormat: 'yyyy-MM-dd',
  decimalSeparator: '.',
  headers: ['Fecha', 'Monto', 'Tipo', 'Bruto', 'Comision'],
});

describe('transformRow POS', () => {
  it('normaliza una fila válida', () => {
    const result = transformRow(
      2,
      ['05/03/2026', '1.234,56', ' ab12cd ', '**** **** **** 9999', ' b001 ', ' l001', ' ref1 '],
      posOptions(),
    );
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    const data = result.data as PosData;
    expect(data.transactionAt.toISOString()).toBe('2026-03-05T00:00:00.000Z');
    expect(data.amount.toFixed(2)).toBe('1234.56');
    expect(data).toMatchObject({
      authCode: 'AB12CD',
      cardLast4: '9999',
      batchNumber: 'B001',
      storeCode: 'L001',
      reference: 'REF1',
    });
  });

  it('rechaza fecha y monto inválidos indicando fila, campo y motivo', () => {
    const result = transformRow(7, ['31/02/2026', '', null, null, null, null, null], posOptions());
    expect(result).toEqual({
      kind: 'error',
      rowNumber: 7,
      errors: [
        { row: 7, field: 'transactionAt', reason: 'Fecha inválida' },
        { row: 7, field: 'amount', reason: 'Monto inválido' },
      ],
    });
  });

  it('un PAN completo no llega ni al dato mapeado ni a la fila original', () => {
    const pan = '4111111111111111';
    const result = transformRow(
      2,
      ['05/03/2026', '10,00', null, pan, null, null, `pago ${pan}`],
      posOptions(),
    );
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect((result.data as PosData).cardLast4).toBe('1111');
    expect(JSON.stringify(result)).not.toContain(pan);
    expect(result.rawData['Tarjeta']).toBe('************1111');
  });

  it('conserva la fila original por nombre de cabecera', () => {
    const result = transformRow(
      2,
      ['05/03/2026', '10,00', 'x', null, null, null, null],
      posOptions(),
    );
    if (result.kind !== 'ok') throw new Error('esperaba ok');
    expect(result.rawData).toMatchObject({
      Fecha: '05/03/2026',
      Monto: '10,00',
      Aut: 'x',
      Tarjeta: null,
    });
  });
});

describe('transformRow banco', () => {
  it('importa con y sin desglose de bruto, comisión y retención', () => {
    const sinDesglose = transformRow(2, ['2026-09-01', '100.50'], bankOptions());
    const conDesglose = transformRow(
      3,
      ['2026-09-01', '97.00', 'C', '100', '3'],
      bankOptions([
        ['movementType', 2],
        ['grossAmount', 3],
        ['feeAmount', 4],
      ]),
    );
    if (sinDesglose.kind !== 'ok' || conDesglose.kind !== 'ok') throw new Error('esperaba ok');
    expect((sinDesglose.data as BankData).grossAmount).toBeNull();
    const data = conDesglose.data as BankData;
    expect([data.amount, data.grossAmount, data.feeAmount].map((d) => d?.toFixed(2))).toEqual([
      '97.00',
      '100.00',
      '3.00',
    ]);
  });

  it('descarta débitos por signo cuando no hay columna de tipo', () => {
    expect(transformRow(2, ['2026-09-01', '-50.00'], bankOptions()).kind).toBe('discarded');
  });

  it('descarta débitos por columna de tipo y conserva los créditos', () => {
    const options = bankOptions([['movementType', 2]]);
    expect(transformRow(2, ['2026-09-01', '50.00', 'D'], options).kind).toBe('discarded');
    expect(transformRow(3, ['2026-09-01', '50.00', 'Débito'], options).kind).toBe('discarded');
    expect(transformRow(4, ['2026-09-01', '50.00', 'C'], options).kind).toBe('ok');
  });

  it('con columna de tipo vacía en una fila recurre al signo', () => {
    const options = bankOptions([['movementType', 2]]);
    expect(transformRow(2, ['2026-09-01', '-5.00', null], options).kind).toBe('discarded');
    expect(transformRow(3, ['2026-09-01', '5.00', null], options).kind).toBe('ok');
  });

  it('un monto opcional inválido rechaza la fila con su campo', () => {
    const result = transformRow(
      2,
      ['2026-09-01', '10.00', null, 'abc'],
      bankOptions([['grossAmount', 3]]),
    );
    expect(result).toMatchObject({ kind: 'error', errors: [{ field: 'grossAmount' }] });
  });

  it('valueDate vacía es válida; inválida rechaza', () => {
    const options = { ...bankOptions([['valueDate', 2]]) };
    expect(transformRow(2, ['2026-09-01', '10.00', null], options).kind).toBe('ok');
    expect(transformRow(3, ['2026-09-01', '10.00', 'x'], options)).toMatchObject({
      kind: 'error',
      errors: [{ field: 'valueDate' }],
    });
  });
});

describe('isDebitType', () => {
  it.each(['D', 'd', 'DEBITO', 'Débito', ' cargo ', 'DB'])('%j es débito', (v) =>
    expect(isDebitType(v)).toBe(true),
  );
  it.each(['C', 'CREDITO', 'ABONO', '', null])('%j no es débito', (v) =>
    expect(isDebitType(v as never)).toBe(false),
  );
});
