import { useQuery } from '@tanstack/react-query'
import { type Ref, useId } from 'react'
import { formatBusinessDate } from '@/lib/format'
import type { AccountFee, FeeTypeView } from './contract'
import { selectClass } from './FeeRow'
import { accountFeesQuery, feeTypesQuery } from './queries'
import { strings } from './strings'

const s = strings.fees

function validity(fee: AccountFee): string {
  if (fee.startDate === null && fee.endDate === null) return s.always
  const from = fee.startDate ? formatBusinessDate(fee.startDate) : s.always
  const to = fee.endDate ? formatBusinessDate(fee.endDate) : s.noEnd
  return `${from} – ${to}`
}

/** "Monthly Fee · 250.0000 USD · Always": the preset as configured, its amount or rate never computed. */
const presetLabel = (fee: AccountFee) =>
  [fee.title, fee.fixedAmount !== null ? s.fixed(fee.fixedAmount) : s.rate(fee.percentage ?? ''), validity(fee)].join(
    ' · ',
  )

/**
 * Add preset fee: the non-transactional fees of the account in force on the settlement date (design D5). Without a
 * date there is nothing to ask for: disabled, with its reason.
 */
export function AddPresetFee({
  accountId,
  asOf,
  onAdd,
}: {
  accountId: string
  asOf: string | null
  onAdd: (fee: AccountFee) => void
}) {
  const reasonId = useId()
  const fees = useQuery(accountFeesQuery(accountId, asOf))
  const reason = asOf === null ? s.presetNeedsDate : fees.data?.length === 0 ? s.noPresets : null
  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={s.addPreset}
        className={selectClass}
        value=""
        disabled={reason !== null || !fees.data}
        aria-describedby={reason ? reasonId : undefined}
        onChange={(event) => {
          const fee = fees.data?.find((f) => f.feeId === event.target.value)
          if (fee) onAdd(fee)
        }}
      >
        <option value="">{s.choosePreset}</option>
        {fees.data?.map((fee) => (
          <option key={fee.feeId} value={fee.feeId}>
            {presetLabel(fee)}
          </option>
        ))}
      </select>
      {reason && (
        <p id={reasonId} className="text-sm text-muted-foreground">
          {reason}
        </p>
      )}
    </div>
  )
}

/** The fee types the API says admit a free amount (and are not applied per movement). */
export const freeAmountTypes = (types: FeeTypeView[] | undefined) =>
  (types ?? []).filter((type) => !type.isTransactional && type.allowsFreeAmount)

/** Add free-amount fee: only the types that admit one (design D5). */
export function AddFreeFee({
  onAdd,
  selectRef,
}: {
  onAdd: (type: FeeTypeView) => void
  selectRef?: Ref<HTMLSelectElement>
}) {
  const types = useQuery(feeTypesQuery())
  const free = freeAmountTypes(types.data)
  return (
    <select
      ref={selectRef}
      aria-label={s.addFree}
      className={selectClass}
      value=""
      disabled={!types.data}
      onChange={(event) => {
        const type = free.find((t) => String(t.feeTypeId) === event.target.value)
        if (type) onAdd(type)
      }}
    >
      <option value="">{s.chooseFree}</option>
      {free.map((type) => (
        <option key={type.feeTypeId} value={type.feeTypeId}>
          {type.title}
        </option>
      ))}
    </select>
  )
}
