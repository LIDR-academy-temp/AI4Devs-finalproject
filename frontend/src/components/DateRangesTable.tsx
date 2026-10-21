import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type BusinessDate, formatBusinessDateTime } from '@/lib/format'
import { strings } from './strings'

const s = strings.dateRanges

type RangeKey = 'APP' | 'DEC' | 'I' | 'R'
type StatusKey = 'APP' | 'DEC' | 'CHB' | 'REF' | 'RDR' | 'R'
type DateRange = { min: BusinessDate; max: BusinessDate } | null

/** The rows by cycle and status; the I range is one for CHB, REF and RDR, so only the first of them carries it. */
const ROWS: { key: StatusKey; cycle: 'E' | 'I' | 'R'; status: string; range?: RangeKey; span?: number }[] = [
  { key: 'APP', cycle: 'E', status: 'APP', range: 'APP' },
  { key: 'DEC', cycle: 'E', status: 'DEC', range: 'DEC' },
  { key: 'CHB', cycle: 'I', status: 'CHB', range: 'I', span: 3 },
  { key: 'REF', cycle: 'I', status: 'REF' },
  { key: 'RDR', cycle: 'I', status: 'RDR' },
  { key: 'R', cycle: 'R', status: s.none, range: 'R' },
]

function rangeText(range: DateRange): string {
  return range ? `${formatBusinessDateTime(range.min)} – ${formatBusinessDateTime(range.max)}` : s.none
}

/**
 * The date ranges by cycle and status (ui-polish design D9). Transactions is shown only when the screen has the
 * count by status from the API; the values are shown as they arrive.
 */
export function DateRangesTable({
  title,
  ranges,
  transactions,
}: {
  title: string
  ranges: Record<RangeKey, DateRange>
  transactions?: Record<StatusKey, number>
}) {
  return (
    <Table className="w-auto text-sm">
      <TableCaption className="mt-0 mb-1 caption-top text-left font-medium text-foreground">{title}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{s.cycle}</TableHead>
          <TableHead>{s.status}</TableHead>
          {transactions && <TableHead className="text-right">{s.transactions}</TableHead>}
          <TableHead>{s.dateRange}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.cycle}</TableCell>
            <TableCell>{row.status}</TableCell>
            {transactions && <TableCell className="text-right tabular-nums">{transactions[row.key]}</TableCell>}
            {row.range && (
              <TableCell rowSpan={row.span} className="align-top tabular-nums">
                {rangeText(ranges[row.range])}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
