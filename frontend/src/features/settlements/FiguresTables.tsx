import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDecimal } from '@/lib/format'
import type { CategoryTotal } from './contract'
import { strings } from './strings'

const s = strings.preSummary
const num = 'text-right tabular-nums'

/** The five categories as the API sends them, in its order: quantity, amount and fees, never added up here. */
export function TotalsByType({ totals }: { totals: CategoryTotal[] }) {
  return (
    <Table aria-label={s.totals}>
      <TableHeader>
        <TableRow>
          <TableHead>{s.columns.type}</TableHead>
          <TableHead className="text-right">{s.columns.qty}</TableHead>
          <TableHead className="text-right">{s.columns.amount}</TableHead>
          <TableHead className="text-right">{s.columns.fee}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {totals.map((t) => (
          <TableRow key={t.category}>
            <TableCell>{strings.categories[t.category] ?? t.category}</TableCell>
            <TableCell className={num}>{t.qty}</TableCell>
            <TableCell className={num}>{formatDecimal(t.amount)}</TableCell>
            <TableCell className={num}>{formatDecimal(t.feeAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
