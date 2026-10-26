import type { ReconciliationConfig } from './api';

/** Valores del formulario tal como se escriben (texto), antes de convertirlos. */
export interface ReconciliationFormValues {
  name: string;
  periodStart: string;
  periodEnd: string;
  dateWindowDays: string;
  amountTolerance: string;
  feePercent: string;
  withholdingPercent: string;
  enableGrouping: boolean;
}

export type FormErrors = Partial<Record<keyof ReconciliationFormValues, string>>;

export const INITIAL_FORM: ReconciliationFormValues = {
  name: '',
  periodStart: '',
  periodEnd: '',
  dateWindowDays: '3',
  amountTolerance: '0.05',
  feePercent: '0',
  withholdingPercent: '0',
  enableGrouping: true,
};

const toNumber = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));

export function validateForm(values: ReconciliationFormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim() === '') errors.name = 'Escribe un nombre';
  if (!values.periodStart) errors.periodStart = 'Indica la fecha de inicio';
  if (!values.periodEnd) errors.periodEnd = 'Indica la fecha de fin';
  if (values.periodStart && values.periodEnd && values.periodEnd < values.periodStart) {
    errors.periodEnd = 'La fecha de fin no puede ser anterior a la de inicio';
  }

  const days = toNumber(values.dateWindowDays);
  if (!Number.isInteger(days) || days < 0 || days > 365) {
    errors.dateWindowDays = 'Debe ser un entero entre 0 y 365';
  }
  const tolerance = toNumber(values.amountTolerance);
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    errors.amountTolerance = 'Debe ser un número mayor o igual a 0';
  }
  for (const field of ['feePercent', 'withholdingPercent'] as const) {
    const percent = toNumber(values[field]);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      errors[field] = 'Debe estar entre 0 y 100';
    }
  }
  return errors;
}

export function toConfig(values: ReconciliationFormValues): ReconciliationConfig {
  return {
    dateWindowDays: Number(values.dateWindowDays),
    amountTolerance: Number(values.amountTolerance),
    feePercent: Number(values.feePercent),
    withholdingPercent: Number(values.withholdingPercent),
    enableGrouping: values.enableGrouping,
  };
}
