/** Parámetros del motor guardados en `reconciliations.config` (JSON). */
export interface ReconciliationConfig {
  dateWindowDays: number;
  amountTolerance: number;
  feePercent: number;
  withholdingPercent: number;
  enableGrouping: boolean;
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  dateWindowDays: 3,
  amountTolerance: 0.05,
  feePercent: 0,
  withholdingPercent: 0,
  enableGrouping: true,
};

/** Completa los parámetros omitidos con los valores por defecto. Lectura única del JSON. */
export function withConfigDefaults(
  config?: Partial<ReconciliationConfig> | null,
): ReconciliationConfig {
  const defined = Object.fromEntries(
    Object.entries(config ?? {}).filter(([, value]) => value !== undefined && value !== null),
  );
  return { ...DEFAULT_RECONCILIATION_CONFIG, ...defined };
}
