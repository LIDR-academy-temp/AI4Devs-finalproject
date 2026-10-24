import type { ScenarioKind } from './types';

export interface ScenarioInfo {
  kind: ScenarioKind;
  title: string;
  description: string;
  expectedLevel: string;
}

export const SCENARIOS: ScenarioInfo[] = [
  {
    kind: 'exact',
    title: 'Cruce exacto',
    description: 'Misma autorización, mismo monto y misma fecha en POS y banco.',
    expectedLevel: 'Nivel 1 (EXACT), confirmado automáticamente',
  },
  {
    kind: 'dateShift',
    title: 'Desfase de fechas',
    description:
      'El banco acredita 1-3 días después, sin código de autorización; coinciden monto y últimos 4 dígitos.',
    expectedLevel: 'Nivel 2 (TOLERANCE), confirmado si el candidato es único',
  },
  {
    kind: 'batch',
    title: 'Depósito por lote',
    description:
      'Varias ventas del mismo lote y local se acreditan como un único abono por la suma bruta.',
    expectedLevel: 'Nivel 3 (GROUPED), siempre propuesta',
  },
  {
    kind: 'net',
    title: 'Depósito neto',
    description:
      'Varias ventas se acreditan en un abono neto de comisión y retención; el extracto detalla bruto, comisión y retención.',
    expectedLevel: 'Nivel 3 (GROUPED), siempre propuesta',
  },
  {
    kind: 'duplicate',
    title: 'Venta duplicada',
    description: 'La misma venta aparece dos veces en el POS y una sola vez en el banco.',
    expectedLevel: 'Ambiguo: ningún nivel debe confirmar automáticamente',
  },
  {
    kind: 'orphanPos',
    title: 'Venta sin abono',
    description: 'Venta registrada en el POS que el banco no ha acreditado en el período.',
    expectedLevel: 'Pendiente POS (candidata a excepción)',
  },
  {
    kind: 'orphanBank',
    title: 'Abono sin venta',
    description: 'Abono del banco sin venta correspondiente en el POS.',
    expectedLevel: 'Pendiente banco (candidata a excepción)',
  },
];

/**
 * Proporciones del dataset estándar (fracción de las ventas POS por escenario).
 * Documentadas en readme §2.6; deben sumar 1.
 */
export const STANDARD_PROPORTIONS: Record<ScenarioKind, number> = {
  exact: 0.6,
  dateShift: 0.15,
  batch: 0.15,
  net: 0.05,
  duplicate: 0.03,
  orphanPos: 0.01,
  orphanBank: 0.01,
};

export const SCENARIO_KINDS = SCENARIOS.map((s) => s.kind);

export function isScenarioKind(value: string): value is ScenarioKind {
  return (SCENARIO_KINDS as string[]).includes(value);
}
