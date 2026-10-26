import { Decimal } from 'decimal.js';

/** Neto esperado = bruto − bruto·comisión% − bruto·retención%, redondeado a 2 decimales. */
export function computeExpectedNet(
  gross: Decimal.Value,
  feePercent: Decimal.Value,
  withholdingPercent: Decimal.Value,
): Decimal {
  const base = new Decimal(gross);
  const fee = base.times(feePercent).div(100);
  const withholding = base.times(withholdingPercent).div(100);
  return base.minus(fee).minus(withholding).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
