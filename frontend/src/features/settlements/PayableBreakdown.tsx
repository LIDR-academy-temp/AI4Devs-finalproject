import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { formatDecimal } from '@/lib/format'
import type { Money, PayableLine } from './contract'
import { strings } from './strings'

const s = strings.preSummary
const num = 'text-right tabular-nums'

/**
 * The nine lines of the amount payable in the order of the API, then the amount payable, so the formula can be
 * audited (design D7). The sign goes in its own column and the amount exactly as sent: nothing is added up or
 * re-signed here, so a negative batch fees line reads "− Batch fees -42.5000", the operation the server made.
 */
export function PayableBreakdown({ lines, amountPayable }: { lines: PayableLine[]; amountPayable: Money }) {
  return (
    <Table aria-label={s.payable}>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.code}>
            <TableCell className="w-6 text-center" aria-label={line.sign === '+' ? 'plus' : 'minus'}>
              {s.signs[line.sign]}
            </TableCell>
            <TableCell>{strings.payableLines[line.code] ?? line.label}</TableCell>
            <TableCell className={num}>{formatDecimal(line.amount)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-semibold">
          <TableCell />
          <TableCell>{s.payable}</TableCell>
          <TableCell className={num}>{formatDecimal(amountPayable)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
