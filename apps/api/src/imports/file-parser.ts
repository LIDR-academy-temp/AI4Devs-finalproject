import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { maskCellForStorage, type RawCell } from './normalizers/index.js';

export type FileKind = 'csv' | 'xlsx';
export const PREVIEW_ROWS = 20;

export interface ParsedFile {
  /** Todas las filas tal como vienen (índice 0 = fila 1 del archivo), sin enmascarar. */
  rows: RawCell[][];
  sheetName: string | null;
  sheetCount: number;
}

export interface Table {
  headers: string[];
  /** Filas de datos no vacías con su número de fila original (1-based). */
  dataRows: { rowNumber: number; cells: RawCell[] }[];
}

const DELIMITERS = [';', ',', '\t', '|'] as const;

function decodeCsv(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** Elige el delimitador más frecuente en la primera línea no vacía. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
  let best = ',';
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function parseCsvFile(buffer: Buffer): ParsedFile {
  const text = decodeCsv(buffer).replace(/^\uFEFF/, '');
  const records = parseCsv(text, {
    delimiter: detectDelimiter(text),
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: false,
  }) as string[][];
  const rows = records.map((record) => record.map((cell) => (cell === '' ? null : cell)));
  return { rows, sheetName: null, sheetCount: 1 };
}

/** SheetJS interpreta como texto cualquier cosa que no sea un libro; exigimos un zip con workbook. */
function assertIsWorkbook(buffer: Buffer): void {
  const isZip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (!isZip || !buffer.includes('xl/workbook')) {
    throw new Error('El archivo no es un libro XLSX válido');
  }
}

function parseXlsxFile(buffer: Buffer): ParsedFile {
  assertIsWorkbook(buffer);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error('El libro no contiene hojas');
  const rows = XLSX.utils.sheet_to_json<RawCell[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
    range: 0,
  });
  return { rows, sheetName, sheetCount: workbook.SheetNames.length };
}

export function parseFile(buffer: Buffer, kind: FileKind): ParsedFile {
  return kind === 'csv' ? parseCsvFile(buffer) : parseXlsxFile(buffer);
}

const isBlank = (cell: RawCell) =>
  cell === null || cell === undefined || String(cell).trim() === '';

/** Nombres de columna únicos y no vacíos (las duplicadas o vacías reciben un sufijo). */
function buildHeaders(cells: RawCell[]): string[] {
  const seen = new Map<string, number>();
  return cells.map((cell, index) => {
    const base = isBlank(cell) ? `Columna ${index + 1}` : String(cell).trim();
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

/** Separa cabeceras y filas de datos a partir de la fila de cabecera (1-based). */
export function extractTable(parsed: ParsedFile, headerRow: number): Table {
  const headerCells = parsed.rows[headerRow - 1] ?? [];
  const width = Math.max(
    headerCells.length,
    ...parsed.rows.slice(headerRow).map((r) => r.length),
    0,
  );
  const headers = buildHeaders(Array.from({ length: width }, (_, i) => headerCells[i] ?? null));
  const dataRows: Table['dataRows'] = [];
  parsed.rows.slice(headerRow).forEach((cells, index) => {
    if (cells.every(isBlank)) return;
    dataRows.push({ rowNumber: headerRow + index + 1, cells });
  });
  return { headers, dataRows };
}

/** Cabeceras y primeras filas para la vista previa, con cualquier posible PAN enmascarado. */
export function buildPreview(parsed: ParsedFile, headerRow: number) {
  const table = extractTable(parsed, headerRow);
  return {
    headers: table.headers.map((header) => String(maskCellForStorage(header))),
    rows: table.dataRows.slice(0, PREVIEW_ROWS).map((row) => ({
      rowNumber: row.rowNumber,
      cells: table.headers.map((_, i) => maskCellForStorage(row.cells[i] ?? null)),
    })),
    totalRows: table.dataRows.length,
    sheetName: parsed.sheetName,
    sheetCount: parsed.sheetCount,
  };
}
