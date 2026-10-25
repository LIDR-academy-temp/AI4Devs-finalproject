import { describe, expect, it } from 'vitest';
import { formatCents, formatMoney, sumCents, toCents } from './money';

describe('montos en centavos', () => {
  it('suma decimales sin errores de coma flotante', () => {
    expect(sumCents(['0.10', '0.20'])).toBe(30);
    expect(sumCents(['312.40'])).toBe(31240);
    expect(sumCents([])).toBe(0);
  });

  it('convierte con redondeo', () => {
    expect(toCents('19.99')).toBe(1999);
    expect(toCents('0.29')).toBe(29);
  });

  it('formatea con dos decimales y coma decimal', () => {
    expect(formatCents(-712)).toMatch(/^-7,12$/);
    expect(formatMoney('305.28')).toBe('305,28');
    expect(formatMoney(null)).toBe('—');
  });
});
