import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDecimal } from '@/lib/format'
import type { BrandTotal, CategoryTotal, Money } from './contract'
import { strings } from './strings'

const s = strings.preSummary
const num = 'text-right tabular-nums'
/** A label wraps in a narrow card so the amounts stay in view (the table container would scroll them away). */
const label = 'whitespace-normal'

/**
 * The five categories as the API sends them, in its order: quantity, amount and fees, never added up here. The
 * Summary adds the reserves released (R), which have no category of their own.
 */
export function TotalsByType({
  totals,
  reservesReleased,
}: {
  totals: CategoryTotal[]
  reservesReleased?: { qty: number; amount: Money }
}) {
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
            <TableCell className={label}>{strings.categories[t.category] ?? t.category}</TableCell>
            <TableCell className={num}>{t.qty}</TableCell>
            <TableCell className={num}>{formatDecimal(t.amount)}</TableCell>
            <TableCell className={num}>{formatDecimal(t.feeAmount)}</TableCell>
          </TableRow>
        ))}
        {reservesReleased && (
          <TableRow>
            <TableCell className={label}>{strings.summary.reservesReleased}</TableCell>
            <TableCell className={num}>{reservesReleased.qty}</TableCell>
            <TableCell className={num}>{formatDecimal(reservesReleased.amount)}</TableCell>
            <TableCell />
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

/** Deposits by card brand, as the API sends them. */
export function TotalsByBrand({ brands }: { brands: BrandTotal[] }) {
  const c = strings.summary.brandColumns
  return (
    <Table aria-label={strings.summary.brands}>
      <TableHeader>
        <TableRow>
          <TableHead>{c.brand}</TableHead>
          <TableHead className="text-right">{c.qty}</TableHead>
          <TableHead className="text-right">{c.amount}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brands.map((b) => (
          <TableRow key={b.cardBrand}>
            <TableCell>{b.cardBrand}</TableCell>
            <TableCell className={num}>{b.qty}</TableCell>
            <TableCell className={num}>{formatDecimal(b.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
