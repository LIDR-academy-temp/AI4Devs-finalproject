import { Decimal } from 'decimal.js';
import type { RawCell } from './parse-date.js';

export type DecimalSeparator = '.' | ',';

/**
 * Interpreta una celda como monto con precisión decimal exacta (2 decimales, redondeo
 * half-up). Elimina símbolos de moneda, espacios y separadores de miles; admite negativos
 * con signo o entre paréntesis. Devuelve `null` si la celda está vacía o no es un monto.
 */
export function parseAmount(value: RawCell, decimalSeparator: DecimalSeparator): Decimal | null {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Decimal(value).toDecimalPlaces(2) : null;
  }

  let text = value.trim();
  if (text === '') return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  // Quita todo salvo dígitos, signo y los dos posibles separadores
  text = text.replace(/[^\d.,-]/g, '');
  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  }
  if (text.includes('-')) return null;

  const thousands = decimalSeparator === ',' ? '.' : ',';
  if (text.includes(thousands)) {
    // Los miles deben ir en grupos de 3 dígitos: "1,2,3" no es un monto
    const grouped = new RegExp(`^\\d{1,3}(?:\\${thousands}\\d{3})+(?:\\${decimalSeparator}\\d+)?$`);
    if (!grouped.test(text)) return null;
  }
  text = text.split(thousands).join('');
  if (decimalSeparator === ',') text = text.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text) && !/^\.\d+$/.test(text)) return null;

  const amount = new Decimal(text).toDecimalPlaces(2);
  return negative ? amount.negated() : amount;
}
