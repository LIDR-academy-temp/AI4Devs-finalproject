import type { StandardField } from './api';

/** Índice de columna → campo estándar ('' = sin asignar). */
export type ColumnMapping = Record<number, string>;

export interface MappingProblems {
  missingRequired: StandardField[];
  /** Campos asignados a más de una columna, con las columnas implicadas. */
  duplicated: { field: StandardField; columns: number[] }[];
}

export function validateMapping(mapping: ColumnMapping, fields: StandardField[]): MappingProblems {
  const byField = new Map<string, number[]>();
  for (const [column, field] of Object.entries(mapping)) {
    if (!field) continue;
    byField.set(field, [...(byField.get(field) ?? []), Number(column)]);
  }
  return {
    missingRequired: fields.filter((f) => f.required && !byField.has(f.field)),
    duplicated: fields
      .filter((f) => (byField.get(f.field)?.length ?? 0) > 1)
      .map((field) => ({ field, columns: byField.get(field.field) as number[] })),
  };
}

export const hasProblems = (problems: MappingProblems) =>
  problems.missingRequired.length > 0 || problems.duplicated.length > 0;

/** Solo las columnas asignadas viajan al servidor, con el índice como clave. */
export function toColumnMapping(mapping: ColumnMapping): Record<string, string> {
  return Object.fromEntries(
    Object.entries(mapping)
      .filter(([, field]) => field)
      .map(([column, field]) => [column, field]),
  );
}

/** Fecha interpretada de una celda con un formato dd/MM/yyyy-like, para mostrarla en la vista previa. */
export function interpretDate(
  value: string | number | boolean | null,
  format: string,
): string | null {
  if (value === null || typeof value === 'boolean') return null;
  const hasSeparator = /[-/.]/.test(format);
  const order: string[] = [];
  const source = format.replace(/dd|MM|yyyy|[-/.]/g, (token) => {
    if (token === 'dd' || token === 'MM') {
      order.push(token);
      return hasSeparator ? '(\\d{1,2})' : '(\\d{2})';
    }
    if (token === 'yyyy') {
      order.push(token);
      return '(\\d{4})';
    }
    return `\\${token}`;
  });
  const match = new RegExp(`^${source}`).exec(String(value).trim());
  if (!match) return null;
  const part = (token: string) => Number(match[order.indexOf(token) + 1]);
  const [y, m, d] = [part('yyyy'), part('MM'), part('dd')];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null;
  return date.toISOString().slice(0, 10);
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

/** CSV de errores de importación (fila, campo, motivo) para descargar. */
export function errorsToCsv(errors: { row: number; field: string; reason: string }[]): string {
  return [['fila', 'campo', 'motivo'], ...errors.map((e) => [e.row, e.field, e.reason])]
    .map((line) => line.map(csvCell).join(','))
    .join('\n');
}
