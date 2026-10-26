import * as XLSX from 'xlsx';
import {
  buildPreview,
  detectDelimiter,
  extractTable,
  parseFile,
  PREVIEW_ROWS,
} from './file-parser.js';

const csv = (text: string, encoding: BufferEncoding = 'utf8') => Buffer.from(text, encoding);

function xlsx(sheets: Record<string, unknown[][]>): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('detectDelimiter', () => {
  it.each([
    ['Fecha;Hora;Monto', ';'],
    ['Fecha,Hora,Monto', ','],
    ['Fecha\tHora\tMonto', '\t'],
    ['Fecha|Hora|Monto', '|'],
    ['Solo una columna', ','],
    ['\n\nA;B;C', ';'],
  ])('%j → %j', (line, expected) => {
    expect(detectDelimiter(line)).toBe(expected);
  });
});

describe('CSV', () => {
  it('lee un CSV con punto y coma y cabecera en la fila 1', () => {
    const table = extractTable(
      parseFile(csv('Fecha;Monto\n01/09/2026;1.234,56\n02/09/2026;10,00\n'), 'csv'),
      1,
    );
    expect(table.headers).toEqual(['Fecha', 'Monto']);
    expect(table.dataRows).toEqual([
      { rowNumber: 2, cells: ['01/09/2026', '1.234,56'] },
      { rowNumber: 3, cells: ['02/09/2026', '10,00'] },
    ]);
  });

  it('lee un CSV con coma y campos entre comillas', () => {
    const table = extractTable(parseFile(csv('A,B\n"x, y",2\n'), 'csv'), 1);
    expect(table.dataRows[0].cells).toEqual(['x, y', '2']);
  });

  it('ignora el BOM y decodifica Windows-1252 cuando no es UTF-8', () => {
    const bom = extractTable(parseFile(Buffer.from('﻿Fecha;Monto\n1;2\n', 'utf8'), 'csv'), 1);
    expect(bom.headers[0]).toBe('Fecha');
    const latin = extractTable(parseFile(csv('Descripción;Año\nx;1\n', 'latin1'), 'csv'), 1);
    expect(latin.headers).toEqual(['Descripción', 'Año']);
  });

  it('respeta la fila de cabecera indicada y conserva los números de fila originales', () => {
    const text = 'REPORTE MENSUAL\nGenerado: hoy\n\nFecha,Monto\n2026-09-01,10\n,\n2026-09-02,20\n';
    const table = extractTable(parseFile(csv(text), 'csv'), 4);
    expect(table.headers).toEqual(['Fecha', 'Monto']);
    expect(table.dataRows.map((r) => r.rowNumber)).toEqual([5, 7]); // la fila 6 vacía se omite
  });

  it('nombra las cabeceras vacías y desambigua las repetidas', () => {
    const table = extractTable(parseFile(csv('A,,A\n1,2,3\n'), 'csv'), 1);
    expect(table.headers).toEqual(['A', 'Columna 2', 'A (2)']);
  });

  it('tolera filas con distinto número de columnas', () => {
    const table = extractTable(parseFile(csv('A,B,C\n1,2\n1,2,3,4\n'), 'csv'), 1);
    expect(table.headers).toHaveLength(4);
    expect(table.dataRows).toHaveLength(2);
  });
});

describe('XLSX', () => {
  it('lee la primera hoja con cabecera en la fila 4', () => {
    const buffer = xlsx({
      Detalle: [
        ['Banco Demo'],
        ['Extracto septiembre'],
        [],
        ['Fecha', 'Monto'],
        ['2026-09-01', 10.5],
        ['2026-09-02', 20],
      ],
    });
    const parsed = parseFile(buffer, 'xlsx');
    const table = extractTable(parsed, 4);
    expect(parsed.sheetName).toBe('Detalle');
    expect(table.headers).toEqual(['Fecha', 'Monto']);
    expect(table.dataRows).toEqual([
      { rowNumber: 5, cells: ['2026-09-01', 10.5] },
      { rowNumber: 6, cells: ['2026-09-02', 20] },
    ]);
  });

  it('usa la primera hoja e indica cuántas hay', () => {
    const parsed = parseFile(xlsx({ Uno: [['A'], [1]], Dos: [['B'], [2]] }), 'xlsx');
    expect(parsed.sheetName).toBe('Uno');
    expect(parsed.sheetCount).toBe(2);
  });

  it('un archivo que no es un libro válido lanza error', () => {
    expect(() => parseFile(Buffer.from('PK nada'), 'xlsx')).toThrow();
  });
});

describe('buildPreview', () => {
  const rows = [
    ['Fecha', 'Tarjeta', 'Obs'],
    ...Array.from({ length: 30 }, (_, i) => [
      `d${i}`,
      '4111111111111111',
      `pago 4111 1111 1111 1111 n${i}`,
    ]),
  ];
  const preview = buildPreview(parseFile(xlsx({ H: rows }), 'xlsx'), 1);

  it('devuelve como máximo 20 filas y el total de filas de datos', () => {
    expect(preview.rows).toHaveLength(PREVIEW_ROWS);
    expect(preview.totalRows).toBe(30);
    expect(preview.headers).toEqual(['Fecha', 'Tarjeta', 'Obs']);
  });

  it('enmascara cualquier PAN en la vista previa', () => {
    const serialized = JSON.stringify(preview);
    expect(serialized).not.toContain('4111111111111111');
    expect(serialized).not.toContain('4111 1111 1111 1111');
    expect(preview.rows[0].cells[1]).toBe('************1111');
  });
});
