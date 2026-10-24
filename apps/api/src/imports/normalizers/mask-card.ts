import type { RawCell } from './parse-date.js';

/**
 * Reduce una celda de tarjeta a sus últimos 4 dígitos. Admite números completos,
 * enmascarados (`**** **** **** 1234`, `XXXX1234`) y devuelve `null` con menos de 4 dígitos.
 * El valor completo nunca sale de esta función.
 */
export function maskCard(value: RawCell): string | null {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return null;
  }
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

// Secuencia de 13 a 19 dígitos, con o sin separadores (espacio o guion), que no es parte de un
// número más largo
const PAN_PATTERN = /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g;

/** Sustituye por `*` todos los dígitos salvo los 4 últimos de cada posible número de tarjeta. */
export function maskPansInText(text: string): string {
  return text.replace(PAN_PATTERN, (match) => {
    let remaining = match.replace(/\D/g, '').length - 4;
    return match.replace(/\d/g, (digit) => (remaining-- > 0 ? '*' : digit));
  });
}

/**
 * Enmascara cualquier posible PAN presente en una celda, sea cual sea su columna, antes de
 * construir la fila original que se persiste. Los números enteros largos se tratan como texto.
 */
export function maskCellForStorage(value: RawCell): RawCell {
  if (typeof value === 'string') return maskPansInText(value);
  if (typeof value === 'number' && Number.isInteger(value) && Math.abs(value) >= 1e12) {
    return maskPansInText(String(Math.abs(value)));
  }
  return value;
}
