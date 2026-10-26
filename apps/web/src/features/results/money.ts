/** Montos en centavos enteros: sumar decimales del servidor sin errores de coma flotante. */
export const toCents = (amount: string): number => Math.round(Number(amount) * 100);

export const sumCents = (amounts: string[]): number =>
  amounts.reduce((total, amount) => total + toCents(amount), 0);

const formatter = new Intl.NumberFormat('es-EC', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCents = (cents: number): string => formatter.format(cents / 100);

export const formatMoney = (amount: string | null | undefined): string =>
  amount === null || amount === undefined ? '—' : formatCents(toCents(amount));
