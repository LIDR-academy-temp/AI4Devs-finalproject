import Decimal from 'decimal.js';

/** yyyy-MM-dd → Date (UTC, sin hora) */
export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** dd/MM/yyyy (formato habitual de exportaciones POS en LATAM) */
export function toLatam(date: Date): string {
  const [y, m, d] = toIso(date).split('-');
  return `${d}/${m}/${y}`;
}

/** 1234.56 → "1.234,56" (separador de miles punto, decimal coma) */
export function formatAmountComma(amount: Decimal): string {
  const [integer, fraction] = amount.toFixed(2).split('.');
  const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${fraction}`;
}

/** 1234.56 → "1234.56" (sin miles, decimal punto) */
export function formatAmountDot(amount: Decimal): string {
  return amount.toFixed(2);
}

/** Solo los últimos 4 dígitos visibles. */
export function maskCard(last4: string): string {
  return `**** **** **** ${last4}`;
}

export function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
