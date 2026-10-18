import { Cycle, SheetKind } from '@recon/shared'
import { memo, useId } from 'react'
import { Controller, get, useFormContext, useFormState, useWatch } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ImportSheet } from '@/lib/api/types'
import { strings } from '../strings'
import { ColumnRow } from './ColumnRow'
import { changeKind, confirmedLabel, type MappingValues, proposalLabel, statusOptions } from './mapping-form'
import { Preview } from './Preview'

const FROM_COLUMN = 'column'

/**
 * One sheet: its name and the proposal in the analyst's words, built from `proposed` so it stays visible while
 * editing (design D5); then the three controls, the columns and the preview with the mapping being edited.
 */
export const SheetCard = memo(function SheetCard({ sheet, disabled }: { sheet: ImportSheet; disabled: boolean }) {
  const kindId = useId()
  const cycleId = useId()
  const statusId = useId()
  const { control, getValues, setValue } = useFormContext<MappingValues>()
  const base = `sheets.${sheet.sheetId}` as const
  const kind = useWatch({ control, name: `${base}.kind` })
  const cycle = useWatch({ control, name: `${base}.cycle` })
  const transactions = kind === 'transactions'
  // Subscribed to this sheet only: a change elsewhere does not re-render every card (and its selects).
  const { errors } = useFormState({ control, name: base })
  const error = (field: 'kind' | 'cycle' | 'statusId'): string | undefined => get(errors, `${base}.${field}`)?.message

  return (
    <section aria-label={sheet.sheetName} className="flex flex-col gap-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-base font-semibold">{sheet.sheetName}</h3>
        <span className="text-sm">{proposalLabel(sheet.proposed)}</span>
        <span className="text-xs text-muted-foreground">{strings.mapping.rows(sheet.rowCount)}</span>
        {sheet.hidden && (
          <Badge variant="outline" className="text-[10px]">
            {strings.mapping.hidden}
          </Badge>
        )}
        {sheet.mappingConfirmed && sheet.mapping && <Badge variant="secondary">{confirmedLabel(sheet.mapping)}</Badge>}
      </div>
      {sheet.proposed.note && <p className="text-xs text-muted-foreground">{sheet.proposed.note}</p>}

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={kindId} className="text-xs font-medium">
            {strings.mapping.kind}
          </label>
          <Select
            value={kind ?? ''}
            onValueChange={(value) =>
              setValue(base, changeKind(getValues(base), SheetKind.parse(value)), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id={kindId} className="min-w-40" aria-invalid={error('kind') ? true : undefined}>
              <SelectValue placeholder={strings.mapping.chooseKind} />
            </SelectTrigger>
            <SelectContent>
              {SheetKind.options.map((k) => (
                <SelectItem key={k} value={k}>
                  {strings.mapping.kinds[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={cycleId} className="text-xs font-medium">
            {strings.mapping.cycle}
          </label>
          <Controller
            control={control}
            name={`${base}.cycle`}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => {
                  const next = Cycle.parse(value)
                  field.onChange(next)
                  if (next === 'R') setValue(`${base}.statusId`, null, { shouldDirty: true, shouldValidate: true })
                }}
                disabled={disabled || !transactions}
              >
                <SelectTrigger id={cycleId} className="min-w-40" aria-invalid={error('cycle') ? true : undefined}>
                  <SelectValue placeholder={strings.mapping.chooseCycle} />
                </SelectTrigger>
                <SelectContent>
                  {Cycle.options.map((c) => (
                    <SelectItem key={c} value={c}>
                      {strings.mapping.cycles[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={statusId} className="text-xs font-medium">
            {strings.mapping.status}
          </label>
          <Controller
            control={control}
            name={`${base}.statusId`}
            render={({ field }) => (
              <Select
                value={cycle === 'R' || !transactions ? '' : field.value === null ? FROM_COLUMN : String(field.value)}
                onValueChange={(value) => field.onChange(value === FROM_COLUMN ? null : Number(value))}
                disabled={disabled || !transactions || cycle === 'R'}
              >
                <SelectTrigger id={statusId} className="min-w-40" aria-invalid={error('statusId') ? true : undefined}>
                  <SelectValue placeholder={strings.mapping.noStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FROM_COLUMN}>{strings.mapping.fromColumn}</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.statusId} value={String(s.statusId)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      {(['kind', 'cycle', 'statusId'] as const).map((f) =>
        error(f) ? (
          <p key={f} className="text-xs text-destructive">
            {error(f)}
          </p>
        ) : null,
      )}

      {sheet.columns.length > 0 && (
        <div className="flex flex-col gap-2">
          {sheet.columns.map((c, index) => (
            <ColumnRow key={c.sourceColumn} sheet={sheet} index={index} disabled={disabled} />
          ))}
          {kind === null && <p className="text-xs text-muted-foreground">{strings.mapping.columnsDisabled}</p>}
        </div>
      )}
      <Preview sheet={sheet} />
    </section>
  )
})
