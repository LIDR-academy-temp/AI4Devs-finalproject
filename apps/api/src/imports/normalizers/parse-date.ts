export type RawCell = string | number | boolean | Date | null | undefined;

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

/** Formatos que el usuario puede elegir; `parseDate` admite cualquier combinación de dd, MM y yyyy. */
export const DATE_FORMATS = [
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'yyyyMMdd',
  'dd-MM-yyyy',
] as const;

/** Valida la forma de un formato: contiene exactamente una vez dd, MM y yyyy y solo separadores simples. */
export function isValidDateFormat(format: string): boolean {
  if (!/^(?:dd|MM|yyyy|[-/.])+$/.test(format)) return false;
  return ['dd', 'MM', 'yyyy'].every((token) => format.split(token).length === 2);
}

function buildPattern(format: string): { regex: RegExp; order: ('dd' | 'MM' | 'yyyy')[] } {
  const hasSeparator = /[-/.]/.test(format);
  const order: ('dd' | 'MM' | 'yyyy')[] = [];
  const source = format.replace(/dd|MM|yyyy|[-/.]/g, (token) => {
    if (token === 'dd' || token === 'MM') {
      order.push(token);
      return hasSeparator ? '(\\d{1,2})' : '(\\d{2})';
    }
    if (token === 'yyyy') {
      order.push('yyyy');
      return '(\\d{4})';
    }
    return `\\${token}`;
  });
  // Hora opcional: "10:15", "10:15:30" o ISO con "T"
  return {
    regex: new RegExp(`^${source}(?:[ T](\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:\\.\\d+)?Z?)?$`),
    order,
  };
}

function build(year: number, month: number, day: number, h = 0, m = 0, s = 0): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day, h, m, s));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    h < 24 &&
    m < 60 &&
    s < 60;
  return valid ? date : null;
}

/**
 * Interpreta una celda como fecha según `format`. Acepta texto, números de serie de Excel
 * (cuando el formato no es puramente numérico) y objetos Date. Devuelve una fecha UTC
 * (la hora, si existe, se conserva como hora de pared) o `null` si no es interpretable.
 */
export function parseDate(value: RawCell, format: string): Date | null {
  if (value === null || value === undefined || typeof value === 'boolean') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const numericFormat = !/[-/.]/.test(format);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // 20260726 con formato yyyyMMdd es un entero con forma de fecha, no un número de serie
    if (!numericFormat || !Number.isInteger(value)) {
      if (value <= 0) return null;
      return new Date(EXCEL_EPOCH_UTC + Math.round(value * MS_PER_DAY));
    }
    value = String(value);
  }

  const text = value.trim();
  if (text === '') return null;
  const { regex, order } = buildPattern(format);
  const match = regex.exec(text);
  if (!match) return null;

  const parts: Record<string, number> = {};
  order.forEach((token, index) => {
    parts[token] = Number(match[index + 1]);
  });
  const [h, m, s] = [match[order.length + 1], match[order.length + 2], match[order.length + 3]].map(
    (part) => (part === undefined ? 0 : Number(part)),
  );
  return build(parts['yyyy'], parts['MM'], parts['dd'], h, m, s);
}
