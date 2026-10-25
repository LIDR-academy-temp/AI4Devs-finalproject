import type { MatchMethod } from './api';

export interface FilterValues {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  brand: string;
  method: MatchMethod | '';
}

export const EMPTY_FILTERS: FilterValues = {
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  brand: '',
  method: '',
};

const METHODS: MatchMethod[] = ['EXACT', 'TOLERANCE', 'GROUPED', 'AI', 'MANUAL'];

interface Props {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  /** Qué filtros ofrece la pestaña. */
  show: { dates?: boolean; amount?: boolean; brand?: boolean; method?: boolean };
}

export function FiltersBar({ values, onChange, show }: Props) {
  const field = (label: string, name: keyof FilterValues, type = 'text') => (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      <input
        type={type}
        value={values[name]}
        onChange={(e) => onChange({ ...values, [name]: e.target.value })}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      />
    </label>
  );
  return (
    <div role="search" aria-label="Filtros" className="flex flex-wrap items-end gap-3">
      {show.dates && field('Desde', 'dateFrom', 'date')}
      {show.dates && field('Hasta', 'dateTo', 'date')}
      {show.amount && field('Monto mínimo', 'amountMin', 'number')}
      {show.amount && field('Monto máximo', 'amountMax', 'number')}
      {show.brand && field('Marca', 'brand')}
      {show.method && (
        <label className="flex flex-col gap-1 text-xs">
          Método
          <select
            value={values.method}
            onChange={(e) => onChange({ ...values, method: e.target.value as MatchMethod | '' })}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">Todos</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="rounded-md border px-2 py-1 text-xs"
      >
        Limpiar
      </button>
    </div>
  );
}
