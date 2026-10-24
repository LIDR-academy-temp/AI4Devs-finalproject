import { Decimal } from 'decimal.js';
import {
  isValidDateFormat,
  maskCard,
  maskCellForStorage,
  maskPansInText,
  normalizeText,
  parseAmount,
  parseDate,
} from './index.js';

const iso = (d: Date | null) => d?.toISOString() ?? null;

describe('parseDate', () => {
  it.each([
    ['dd/MM/yyyy', '05/03/2026', '2026-03-05T00:00:00.000Z'],
    ['MM/dd/yyyy', '05/03/2026', '2026-05-03T00:00:00.000Z'],
    ['dd/MM/yyyy', '5/3/2026', '2026-03-05T00:00:00.000Z'],
    ['yyyy-MM-dd', '2026-08-01', '2026-08-01T00:00:00.000Z'],
    ['dd-MM-yyyy', '31-12-2026', '2026-12-31T00:00:00.000Z'],
    ['yyyyMMdd', '20260726', '2026-07-26T00:00:00.000Z'],
    ['yyyyMMdd', 20260726, '2026-07-26T00:00:00.000Z'],
    ['dd/MM/yyyy', '29/02/2028', '2028-02-29T00:00:00.000Z'],
    ['dd/MM/yyyy', '  05/03/2026  ', '2026-03-05T00:00:00.000Z'],
  ])('formato %s con %j', (format, value, expected) => {
    expect(iso(parseDate(value, format))).toBe(expected);
  });

  it('conserva la hora cuando existe', () => {
    expect(iso(parseDate('05/03/2026 14:30', 'dd/MM/yyyy'))).toBe('2026-03-05T14:30:00.000Z');
    expect(iso(parseDate('2026-03-05T09:05:07', 'yyyy-MM-dd'))).toBe('2026-03-05T09:05:07.000Z');
  });

  it('interpreta números de serie de Excel (46082 = 1 de marzo de 2026)', () => {
    expect(iso(parseDate(46082, 'dd/MM/yyyy'))).toBe('2026-03-01T00:00:00.000Z');
    expect(iso(parseDate(46082.5, 'dd/MM/yyyy'))).toBe('2026-03-01T12:00:00.000Z');
  });

  it('acepta objetos Date', () => {
    const date = new Date('2026-03-05T00:00:00.000Z');
    expect(parseDate(date, 'dd/MM/yyyy')).toBe(date);
  });

  it.each([
    '31/02/2026',
    '32/01/2026',
    '00/01/2026',
    '05/13/2026',
    'ayer',
    '',
    '   ',
    '05/03/26',
    '2026-03-05',
    '05/03/2026 25:00',
  ])('rechaza %j con dd/MM/yyyy', (value) => {
    expect(parseDate(value, 'dd/MM/yyyy')).toBeNull();
  });

  it.each([null, undefined, true, Number.NaN, 0, -5, new Date('x')])('rechaza %j', (value) => {
    expect(parseDate(value as never, 'dd/MM/yyyy')).toBeNull();
  });

  it('rechaza un yyyyMMdd con mes inválido', () => {
    expect(parseDate('20261301', 'yyyyMMdd')).toBeNull();
  });
});

describe('isValidDateFormat', () => {
  it.each(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'yyyyMMdd', 'dd.MM.yyyy'])(
    'acepta %s',
    (f) => {
      expect(isValidDateFormat(f)).toBe(true);
    },
  );
  it.each(['', 'dd/MM', 'dd/MM/yyyy/dd', 'yy-MM-dd', 'dd/MM/yyyy HH:mm', 'abc'])(
    'rechaza %j',
    (f) => {
      expect(isValidDateFormat(f)).toBe(false);
    },
  );
});

describe('parseAmount', () => {
  it.each([
    ['1.234,56', ',', '1234.56'],
    ['$ 1,234.56', '.', '1234.56'],
    ['1234.56', '.', '1234.56'],
    ['1234,56', ',', '1234.56'],
    ['USD 1.234.567,89', ',', '1234567.89'],
    ['-45,10', ',', '-45.1'],
    ['(1,234.50)', '.', '-1234.5'],
    ['  12  ', '.', '12'],
    ['0.005', '.', '0.01'],
    ['.5', '.', '0.5'],
    ['1,234', '.', '1234'],
  ])('%j con separador %s → %s', (value, separator, expected) => {
    expect(parseAmount(value, separator as '.' | ',')?.toString()).toBe(expected);
  });

  it('convierte números sin ruido de coma flotante', () => {
    expect(parseAmount(16.510000000000002, '.')?.toString()).toBe('16.51');
    expect(parseAmount(37.880000000000003, '.')?.toString()).toBe('37.88');
    expect(parseAmount(0, '.')?.toString()).toBe('0');
  });

  it.each(['', '   ', 'abc', '--5', '1,2,3x', '5-', '1..2.3'])('rechaza %j', (value) => {
    expect(parseAmount(value, '.')).toBeNull();
  });

  it.each([null, undefined, true, Number.NaN, Number.POSITIVE_INFINITY])('rechaza %j', (value) => {
    expect(parseAmount(value as never, '.')).toBeNull();
  });

  it('no pierde precisión al sumar: 0.10 + 0.20 = 0.30 exacto', () => {
    const a = parseAmount('0.10', '.') as Decimal;
    const b = parseAmount('0.20', '.') as Decimal;
    expect(a.plus(b).equals(new Decimal('0.30'))).toBe(true);
  });
});

describe('maskCard', () => {
  it.each([
    ['4111111111111111', '1111'],
    ['4111 1111 1111 1111', '1111'],
    ['4111-1111-1111-1111', '1111'],
    ['**** **** **** 1234', '1234'],
    ['XXXX1234', '1234'],
    ['XX-XXXX-XXXX-6618\t', '6618'],
    [4111111111111111, '1111'],
    ['1234', '1234'],
  ])('%j → %s', (value, expected) => {
    expect(maskCard(value)).toBe(expected);
  });

  it.each(['', '   ', '123', 'abc', null, undefined])('%j → null (menos de 4 dígitos)', (value) => {
    expect(maskCard(value as never)).toBeNull();
  });

  it('el resultado nunca contiene más de 4 dígitos', () => {
    expect(maskCard('4111111111111111')).toHaveLength(4);
  });
});

describe('enmascarado de PAN en cualquier celda', () => {
  it('enmascara un PAN completo conservando solo los últimos 4', () => {
    expect(maskPansInText('4111111111111111')).toBe('************1111');
    expect(maskPansInText('4111 1111 1111 1111')).toBe('**** **** **** 1111');
    expect(maskPansInText('PAGO TARJ 4111-1111-1111-1111 OK')).toBe(
      'PAGO TARJ ****-****-****-1111 OK',
    );
  });

  it('no toca números cortos, montos ni valores ya enmascarados', () => {
    for (const text of [
      'REF000123',
      '1234.56',
      '2026-08-01',
      '**** **** **** 1234',
      '123456789012',
    ]) {
      expect(maskPansInText(text)).toBe(text);
    }
  });

  it('trata enteros largos de celdas numéricas como texto', () => {
    expect(maskCellForStorage(4111111111111111)).toBe('************1111');
    expect(maskCellForStorage(187596)).toBe(187596);
    expect(maskCellForStorage(null)).toBeNull();
  });

  it('el valor completo no sobrevive en ningún caso', () => {
    const pan = '5500005555555559';
    expect(maskPansInText(`obs: ${pan} fin`)).not.toContain(pan);
    expect(maskCellForStorage(pan)).not.toContain(pan);
  });
});

describe('normalizeText', () => {
  it.each([
    [' ab12cd ', 'AB12CD'],
    ['  d001004   ', 'D001004'],
    ['\tref 1\t', 'REF 1'],
    [' x ', 'X'],
    ['000004649', '000004649'],
    [187596, '187596'],
  ])('%j → %s', (value, expected) => {
    expect(normalizeText(value)).toBe(expected);
  });

  it.each(['', '   ', '\t', null, undefined])('%j → null', (value) => {
    expect(normalizeText(value as never)).toBeNull();
  });
});
