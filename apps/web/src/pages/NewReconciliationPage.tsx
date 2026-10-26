import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useCreateReconciliation } from '@/features/reconciliations/api';
import {
  INITIAL_FORM,
  toConfig,
  validateForm,
  type FormErrors,
  type ReconciliationFormValues,
} from '@/features/reconciliations/form';

const inputClass = 'rounded-md border bg-background px-3 py-2 text-sm font-normal';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-xs font-normal text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

/** Paso 1 del asistente: datos generales y parámetros del motor. */
export function NewReconciliationPage() {
  const navigate = useNavigate();
  const create = useCreateReconciliation();
  const [values, setValues] = useState<ReconciliationFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof ReconciliationFormValues>(
    key: K,
    value: ReconciliationFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateForm(values);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await create.mutateAsync({
        name: values.name.trim(),
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        config: toConfig(values),
      });
      navigate(`/reconciliations/${created.id}/import/pos`);
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : 'No se pudo crear la conciliación. Inténtalo de nuevo',
      );
    }
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Paso 1 de 3</p>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva conciliación</h1>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Nombre" error={errors.name}>
          <input
            className={inputClass}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Inicio del período" error={errors.periodStart}>
            <input
              type="date"
              className={inputClass}
              value={values.periodStart}
              onChange={(e) => set('periodStart', e.target.value)}
            />
          </Field>
          <Field label="Fin del período" error={errors.periodEnd}>
            <input
              type="date"
              className={inputClass}
              value={values.periodEnd}
              onChange={(e) => set('periodEnd', e.target.value)}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Parámetros del cruce</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ventana de días" error={errors.dateWindowDays}>
              <input
                inputMode="numeric"
                className={inputClass}
                value={values.dateWindowDays}
                onChange={(e) => set('dateWindowDays', e.target.value)}
              />
            </Field>
            <Field label="Tolerancia de monto" error={errors.amountTolerance}>
              <input
                inputMode="decimal"
                className={inputClass}
                value={values.amountTolerance}
                onChange={(e) => set('amountTolerance', e.target.value)}
              />
            </Field>
            <Field label="% comisión" error={errors.feePercent}>
              <input
                inputMode="decimal"
                className={inputClass}
                value={values.feePercent}
                onChange={(e) => set('feePercent', e.target.value)}
              />
            </Field>
            <Field label="% retención" error={errors.withholdingPercent}>
              <input
                inputMode="decimal"
                className={inputClass}
                value={values.withholdingPercent}
                onChange={(e) => set('withholdingPercent', e.target.value)}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values.enableGrouping}
              onChange={(e) => set('enableGrouping', e.target.checked)}
            />
            Habilitar cruce agrupado
          </label>
        </fieldset>

        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Link to="/reconciliations" className="rounded-md border px-4 py-2 text-sm">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {create.isPending ? 'Creando…' : 'Crear conciliación'}
          </button>
        </div>
      </form>
    </section>
  );
}
