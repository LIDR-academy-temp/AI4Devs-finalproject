import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddFreeFee, AddPresetFee, freeAmountTypes } from './AddFee'
import { FeeRowItem, type RowApiError } from './FeeRow'
import { feeTypesQuery } from './queries'
import type { FeeRow, ReviewFormValues } from './review-form'
import { strings } from './strings'

const s = strings.fees

/**
 * The batch fees (design D5): the rows of Other Fees, preset fees of the account and free amounts. Adding a row moves
 * the focus to its amount; removing one moves it to the "Add free-amount fee" list (design D17).
 */
export function BatchFees({
  accountId,
  asOf,
  rows,
  issues,
  apiErrors,
}: {
  accountId: string
  /** The settlement date once valid: the date the preset fees must be in force on. */
  asOf: string | null
  /** The rows as they are now (the watched values of the form). */
  rows: FeeRow[]
  issues: Record<string, string>
  /** A 400 of the API by row key. */
  apiErrors: Record<string, RowApiError>
}) {
  const { control } = useFormContext<ReviewFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'fees' })
  const types = useQuery(feeTypesQuery())
  const added = useRef(0)
  const addFreeRef = useRef<HTMLSelectElement>(null)

  const appendRow = (row: Omit<FeeRow, 'key'>) => {
    added.current += 1
    append({ ...row, key: `added-${added.current}` }, { focusName: `fees.${fields.length}.amount` })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul aria-label={s.title} className="flex flex-col gap-2">
          {fields.map((field, index) => {
            const row = rows[index] ?? field
            return (
              <FeeRowItem
                key={field.id}
                index={index}
                row={row}
                freeTypes={freeAmountTypes(types.data)}
                issues={issues}
                apiError={apiErrors[row.key] ?? null}
                onRemove={() => {
                  remove(index)
                  addFreeRef.current?.focus()
                }}
              />
            )
          })}
        </ul>
        {fields.length === 0 && <p className="text-sm text-muted-foreground">{s.none}</p>}
        <div className="flex flex-wrap items-start gap-2">
          <AddPresetFee
            accountId={accountId}
            asOf={asOf}
            onAdd={(fee) =>
              appendRow({
                origin: 'preset',
                feeTypeId: fee.feeTypeId,
                feeId: fee.feeId,
                title: fee.title,
                amount: fee.fixedAmount ?? '',
                description: '',
                percentage: fee.fixedAmount === null ? fee.percentage : null,
              })
            }
          />
          <AddFreeFee
            selectRef={addFreeRef}
            onAdd={(type) =>
              appendRow({
                origin: 'free',
                feeTypeId: type.feeTypeId,
                feeId: null,
                title: type.title,
                amount: '',
                description: '',
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
