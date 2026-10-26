import { describe, expect, it } from 'vitest';
import type { StandardField } from './api';
import {
  errorsToCsv,
  hasProblems,
  interpretDate,
  toColumnMapping,
  validateMapping,
} from './mapping';
import { validateLocalFile } from './FileDropzone';

const FIELDS: StandardField[] = [
  { field: 'transactionAt', label: 'Fecha', required: true },
  { field: 'amount', label: 'Monto', required: true },
  { field: 'reference', label: 'Referencia', required: false },
];

describe('validateMapping', () => {
  it('detecta fecha y monto sin asignar', () => {
    const problems = validateMapping({ 0: 'reference' }, FIELDS);
    expect(problems.missingRequired.map((f) => f.field)).toEqual(['transactionAt', 'amount']);
    expect(hasProblems(problems)).toBe(true);
  });

  it('detecta un campo asignado a dos columnas', () => {
    const problems = validateMapping({ 0: 'transactionAt', 1: 'amount', 2: 'amount' }, FIELDS);
    expect(problems.missingRequired).toEqual([]);
    expect(problems.duplicated).toEqual([{ field: FIELDS[1], columns: [1, 2] }]);
  });

  it('un mapeo completo no tiene problemas; las columnas vacías no cuentan', () => {
    const problems = validateMapping({ 0: 'transactionAt', 1: 'amount', 2: '', 3: '' }, FIELDS);
    expect(hasProblems(problems)).toBe(false);
  });
});

describe('toColumnMapping', () => {
  it('omite las columnas sin asignar y usa el índice como clave', () => {
    expect(toColumnMapping({ 0: 'transactionAt', 1: '', 4: 'amount' })).toEqual({
      0: 'transactionAt',
      4: 'amount',
    });
  });
});

describe('interpretDate', () => {
  it.each([
    ['05/03/2026', 'dd/MM/yyyy', '2026-03-05'],
    ['05/03/2026', 'MM/dd/yyyy', '2026-05-03'],
    ['20260726', 'yyyyMMdd', '2026-07-26'],
    [20260726, 'yyyyMMdd', '2026-07-26'],
    ['2026-08-01', 'yyyy-MM-dd', '2026-08-01'],
  ])('%j con %s → %s', (value, format, expected) => {
    expect(interpretDate(value, format)).toBe(expected);
  });

  it.each([
    ['31/02/2026', 'dd/MM/yyyy'],
    ['hola', 'dd/MM/yyyy'],
    [null, 'dd/MM/yyyy'],
  ])('%j no se interpreta', (value, format) => {
    expect(interpretDate(value as never, format)).toBeNull();
  });
});

describe('errorsToCsv', () => {
  it('genera cabecera y filas escapando comillas', () => {
    expect(errorsToCsv([{ row: 2, field: 'amount', reason: 'Monto "inválido"' }])).toBe(
      '"fila","campo","motivo"\n"2","amount","Monto ""inválido"""',
    );
  });
});

describe('validateLocalFile', () => {
  const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

  it('acepta .csv y .xlsx (sin distinguir mayúsculas)', () => {
    expect(validateLocalFile(file('a.csv'))).toBeNull();
    expect(validateLocalFile(file('A.XLSX'))).toBeNull();
  });

  it('rechaza otros formatos indicando los admitidos', () => {
    expect(validateLocalFile(file('a.pdf'))).toContain('.csv o .xlsx');
    expect(validateLocalFile(file('a.xls'))).toContain('.csv o .xlsx');
  });

  it('rechaza archivos de más de 10 MB', () => {
    expect(validateLocalFile(file('a.csv', 10 * 1024 * 1024 + 1))).toContain('10 MB');
  });
});
