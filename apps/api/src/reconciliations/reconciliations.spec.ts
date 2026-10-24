import { BadRequestException } from '@nestjs/common';
import type { ReconciliationStatus } from '../generated/prisma/client.js';
import { DEFAULT_RECONCILIATION_CONFIG, withConfigDefaults } from './reconciliation-config.js';
import { ALLOWED_TRANSITIONS, assertTransition, canTransition } from './reconciliation-state.js';
import { parseDay, validatePeriod } from './reconciliations.service.js';

describe('validatePeriod', () => {
  it('acepta un período coherente', () => {
    const { start, end } = validatePeriod('2026-08-01', '2026-08-31');
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-31T00:00:00.000Z');
  });

  it('acepta un período de un solo día', () => {
    expect(() => validatePeriod('2026-08-15', '2026-08-15')).not.toThrow();
  });

  it('rechaza fin anterior a inicio', () => {
    expect(() => validatePeriod('2026-08-31', '2026-08-01')).toThrow(BadRequestException);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10'])('rechaza el día inexistente %s', (value) => {
    expect(() => parseDay(value, 'periodStart')).toThrow(/periodStart no es una fecha válida/);
  });
});

describe('withConfigDefaults', () => {
  it('aplica los valores por defecto cuando se omiten los parámetros', () => {
    expect(withConfigDefaults()).toEqual({
      dateWindowDays: 3,
      amountTolerance: 0.05,
      feePercent: 0,
      withholdingPercent: 0,
      enableGrouping: true,
    });
    expect(withConfigDefaults(null)).toEqual(DEFAULT_RECONCILIATION_CONFIG);
  });

  it('conserva los indicados, incluidos ceros y false, y completa el resto', () => {
    expect(
      withConfigDefaults({ dateWindowDays: 0, enableGrouping: false, feePercent: 3.21 }),
    ).toEqual({
      ...DEFAULT_RECONCILIATION_CONFIG,
      dateWindowDays: 0,
      enableGrouping: false,
      feePercent: 3.21,
    });
  });

  it('ignora valores undefined o null', () => {
    expect(
      withConfigDefaults({ dateWindowDays: undefined, amountTolerance: null as never }),
    ).toEqual(DEFAULT_RECONCILIATION_CONFIG);
  });
});

describe('máquina de estados', () => {
  const PERMITIDAS: [ReconciliationStatus, ReconciliationStatus][] = [
    ['DRAFT', 'PROCESSING'],
    ['PROCESSING', 'COMPLETED'],
    ['PROCESSING', 'FAILED'],
    ['FAILED', 'PROCESSING'],
    ['COMPLETED', 'PROCESSING'],
    ['COMPLETED', 'CLOSED'],
  ];

  it.each(PERMITIDAS)('permite %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it('rechaza cualquier otra transición (tabla completa)', () => {
    const estados = Object.keys(ALLOWED_TRANSITIONS) as ReconciliationStatus[];
    for (const from of estados) {
      for (const to of estados) {
        const permitida = PERMITIDAS.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to)).toBe(permitida);
      }
    }
  });

  it('DRAFT → COMPLETED se rechaza con 400 y mensaje claro', () => {
    expect(() => assertTransition('DRAFT', 'COMPLETED')).toThrow(/DRAFT → COMPLETED/);
  });

  it('CLOSED es terminal', () => {
    expect(ALLOWED_TRANSITIONS.CLOSED).toEqual([]);
  });
});
