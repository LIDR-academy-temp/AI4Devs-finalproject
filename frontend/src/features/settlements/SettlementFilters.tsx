import { useId } from 'react'
import type { BatchStatus } from './contract'
import type { SettlementListSearch } from './list-search'
import { strings } from './strings'

const s = strings.list
const STATUSES = ['processed', 'paid', 'undone'] as const satisfies readonly BatchStatus[]

const controlClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive'

export type ListFilters = Pick<SettlementListSearch, 'status' | 'dateField' | 'from' | 'to'>

/** From after To, compared as YYYY-MM-DD text: neither money nor a time zone is involved (design D7). */
export const isReversed = ({ from, to }: ListFilters) => from !== undefined && to !== undefined && from > to

/**
 * Status, the date the days filter and the days From / To (spec "Pantalla Settlement List: filtros y paginación").
 * Each change goes to the address at once; the days are sent as the date input gives them, never through a Date.
 */
export function SettlementFilters({
  filters,
  onChange,
}: {
  filters: ListFilters
  /** The filter that changed, with its new value (undefined: cleared). */
  onChange: (patch: ListFilters) => void
}) {
  const ids = { status: useId(), dateField: useId(), from: useId(), to: useId(), error: useId() }
  const reversed = isReversed(filters)
  // Only the field that changed: the address may already hold a change the props do not show yet.
  const set = (patch: ListFilters) => onChange(patch)
  const label = (id: string, text: string) => (
    <label htmlFor={id} className="text-sm font-medium">
      {text}
    </label>
  )

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{s.filtersLabel}</legend>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          {label(ids.status, s.status)}
          <select
            id={ids.status}
            className={controlClass}
            value={filters.status ?? ''}
            onChange={(event) => set({ status: (event.target.value || undefined) as BatchStatus | undefined })}
          >
            <option value="">{s.statuses.all}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {s.statuses[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          {label(ids.dateField, s.dateField)}
          <select
            id={ids.dateField}
            className={controlClass}
            value={filters.dateField ?? 'settlementDate'}
            onChange={(event) => set({ dateField: event.target.value === 'processedAt' ? 'processedAt' : undefined })}
          >
            <option value="settlementDate">{s.dateFields.settlementDate}</option>
            <option value="processedAt">{s.dateFields.processedAt}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          {label(ids.from, s.from)}
          <input
            id={ids.from}
            type="date"
            className={controlClass}
            value={filters.from ?? ''}
            aria-invalid={reversed || undefined}
            aria-describedby={reversed ? ids.error : undefined}
            onChange={(event) => set({ from: event.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {label(ids.to, s.to)}
          <input
            id={ids.to}
            type="date"
            className={controlClass}
            value={filters.to ?? ''}
            aria-invalid={reversed || undefined}
            aria-describedby={reversed ? ids.error : undefined}
            onChange={(event) => set({ to: event.target.value || undefined })}
          />
        </div>
      </div>
      {reversed && (
        <p id={ids.error} className="text-sm text-destructive">
          {s.reversedRange}
        </p>
      )}
    </fieldset>
  )
}
