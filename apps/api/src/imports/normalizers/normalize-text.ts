import type { RawCell } from './parse-date.js';

/** Recorta espacios (incluidos tabuladores y espacios duros) y pasa a mayúsculas; vacío → null. */
export function normalizeText(value: RawCell): string | null {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return null;
  }
  const text = String(value).replace(/\u00a0/g, ' ').trim().toUpperCase();
  return text === '' ? null : text;
}
