import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBusinessDate, formatDecimal } from '@/lib/format'
import type { BrandTotal, Category, CategoryTotal, DateRange, Money, SettlementFigures } from './contract'
import { strings } from './strings'

const s = strings.preSummary
const num = 'text-right tabular-nums'
/** A label wraps in a narrow card so the amounts stay in view (the table container would scroll them away). */
const label = 'whitespace-normal'

type RangeKey = keyof SettlementFigures['dateRanges']

/** The range of each category: its cycle and status (design D9). The three of cycle I share the I range. */
const RANGE_OF = {
  deposit: 'APP',
  declined: 'DEC',
  chargeback: 'I',
  refund: 'I',
  rdr: 'I',
} as const satisfies Record<Category, RangeKey>

/**
 * Only the day of each end, as the API sends it (a New York business date, design D12). Each date is one piece that
 * never splits, so a narrow card wraps the cell at the dash.
 */
function RangeCell({ range }: { range: DateRange | null }) {
  return (
    <TableCell className="tabular-nums">
      {range ? (
        <>
          <span className="whitespace-nowrap">{formatBusinessDate(range.min)}</span>
          {' – '}
          <span className="whitespace-nowrap">{formatBusinessDate(range.max)}</span>
        </>
      ) : (
        s.noRange
      )}
    </TableCell>
  )
}

/**
 * The five categories as the API sends them, in its order: quantity, amount, fees and date range, never added up here.
 * The Summary adds the reserves released (R), which have no category of their own.
 */
export function TotalsByType({
  totals,
  ranges,
  reservesReleased,
}: {
  totals: CategoryTotal[]
  ranges: SettlementFigures['dateRanges']
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
          <TableHead>{s.columns.range}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {totals.map((t) => (
          <TableRow key={t.category}>
            <TableCell className={label}>{strings.categories[t.category] ?? t.category}</TableCell>
            <TableCell className={num}>{t.qty}</TableCell>
            <TableCell className={num}>{formatDecimal(t.amount)}</TableCell>
            <TableCell className={num}>{formatDecimal(t.feeAmount)}</TableCell>
            <RangeCell range={ranges[RANGE_OF[t.category]]} />
          </TableRow>
        ))}
        {reservesReleased && (
          <TableRow>
            <TableCell className={label}>{strings.summary.reservesReleased}</TableCell>
            <TableCell className={num}>{reservesReleased.qty}</TableCell>
            <TableCell className={num}>{formatDecimal(reservesReleased.amount)}</TableCell>
            <TableCell />
            <RangeCell range={ranges.R} />
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
