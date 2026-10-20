import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { formatDecimal } from '@/lib/format'
import type { SettlementView } from './contract'
import { strings } from './strings'

const s = strings.summary

/** Transaction fees as the API totals them and every batch fee with its origin and who entered it. */
export function SummaryFees({ view }: { view: SettlementView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.fees}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="tabular-nums">
          {s.transactionalFees(formatDecimal(view.transactionalFeeAmt), formatDecimal(view.mdrAmt), view.mdrRate)}
        </p>
        <ul aria-label={strings.fees.title} className="flex flex-col gap-1">
          {view.batchFees.map((fee, index) => (
            <li key={fee.batchFeeId ?? index} className="tabular-nums">
              {s.batchFee(
                fee.title,
                strings.fees.origins[fee.source === 'file' ? 'file' : fee.feeId ? 'preset' : 'free'],
                formatDecimal(fee.amount),
                fee.enteredBy?.userName ?? null,
              )}
            </li>
          ))}
        </ul>
        {view.batchFees.length === 0 && <p className="text-muted-foreground">{strings.fees.none}</p>}
      </CardContent>
    </Card>
  )
}

/** Reserves held, released (R) and released on chargeback, as the API sends them. */
export function SummaryReserves({ view }: { view: SettlementView }) {
  const lines = [
    [s.reserveLines.held, view.reserveHeldAmt],
    [s.reserveLines.released, view.reserveReleasedAmt],
    [s.reserveLines.early, view.reserveEarlyReleasedAmt],
  ] as const
  return (
    <Table aria-label={s.reserves}>
      <TableBody>
        {lines.map(([label, amount]) => (
          <TableRow key={label}>
            <TableCell className="whitespace-normal">{label}</TableCell>
            <TableCell className="text-right tabular-nums">{formatDecimal(amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
