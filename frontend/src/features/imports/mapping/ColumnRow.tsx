import type { TargetField } from '@recon/shared'
import { useId } from 'react'
import { Controller, get, useFormContext, useFormState, useWatch } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ImportSheet } from '@/lib/api/types'
import { strings } from '../strings'
import { fieldLabel, fieldsFor } from './field-options'
import type { MappingValues } from './mapping-form'

const KEEP = 'keep'

/** One column of a sheet: the field it maps to, where the proposal came from and, for status, how values resolve. */
export function ColumnRow({ sheet, index, disabled }: { sheet: ImportSheet; index: number; disabled: boolean }) {
  const id = useId()
  const { control, trigger } = useFormContext<MappingValues>()
  const kind = useWatch({ control, name: `sheets.${sheet.sheetId}.kind` })
  const proposal = sheet.columns[index]!
  const name = `sheets.${sheet.sheetId}.columns.${index}.targetField` as const
  const { errors } = useFormState({ control, name })
  const error: string | undefined = get(errors, name)?.message
  const offered = fieldsFor(kind)
  const columnsOff = disabled || kind === null || kind === 'ignore'

  return (
    <fieldset aria-label={proposal.sourceColumn} className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="min-w-28 break-all text-sm font-medium">
          {proposal.sourceColumn}
        </label>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Select
              value={field.value ?? KEEP}
              onValueChange={(value) => {
                field.onChange(value === KEEP ? null : (value as TargetField))
                // A repeated field is an error on every column that has it, not only on the one changed.
                void trigger(`sheets.${sheet.sheetId}.columns`)
              }}
              disabled={columnsOff}
            >
              <SelectTrigger
                id={id}
                aria-label={strings.mapping.fieldFor(proposal.sourceColumn)}
                aria-invalid={error ? true : undefined}
                className="min-w-44"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP}>{strings.mapping.keepAsReference}</SelectItem>
                {offered.map((f) => (
                  <SelectItem key={f} value={f}>
                    {fieldLabel(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <span className="text-xs text-muted-foreground">{strings.mapping.columnSource[proposal.source]}</span>
      </div>
      <StatusValues sheet={sheet} index={index} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </fieldset>
  )
}

function StatusValues({ sheet, index }: { sheet: ImportSheet; index: number }) {
  const { control } = useFormContext<MappingValues>()
  const field = useWatch({ control, name: `sheets.${sheet.sheetId}.columns.${index}.targetField` })
  const values = sheet.columns[index]?.statusValues
  if (field !== 'status' || !values || values.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-x-4 pl-30 text-xs text-muted-foreground">
      {values.map((v) => (
        <li key={v.value} className="flex gap-1.5">
          <span>
            {v.value} → {v.statusName ?? strings.mapping.unresolved}
          </span>
          {v.excludeAmount && <span>{strings.mapping.amountExcluded}</span>}
        </li>
      ))}
    </ul>
  )
}
