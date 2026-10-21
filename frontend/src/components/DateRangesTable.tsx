import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type BusinessDate, formatBusinessDateTime } from '@/lib/format'
import { strings } from './strings'

const s = strings.dateRanges

type RangeKey = 'APP' | 'DEC' | 'I' | 'R'
type DateRange = { min: BusinessDate; max: BusinessDate } | null

/** The rows by cycle and status; the I range is one for CHB, REF and RDR, so only the first of them carries it. */
const ROWS: { key: string; cycle: string; status: string; range?: RangeKey; span?: number }[] = [
  { key: 'APP', cycle: s.cycles.E, status: s.statuses.APP, range: 'APP' },
  { key: 'DEC', cycle: s.cycles.E, status: s.statuses.DEC, range: 'DEC' },
  { key: 'CHB', cycle: s.cycles.I, status: s.statuses.CHB, range: 'I', span: 3 },
  { key: 'REF', cycle: s.cycles.I, status: s.statuses.REF },
  { key: 'RDR', cycle: s.cycles.I, status: s.statuses.RDR },
  // R has no status: the rolling reserve is a stage, not a status.
  { key: 'R', cycle: s.cycles.R, status: s.none, range: 'R' },
]

function rangeText(range: DateRange): string {
  return range ? `${formatBusinessDateTime(range.min)} – ${formatBusinessDateTime(range.max)}` : s.none
}

/** The date ranges by cycle and status that the validations used (ui-polish design D9). */
export function DateRangesTable({ title, ranges }: { title: string; ranges: Record<RangeKey, DateRange> }) {
  return (
    <Table className="w-auto text-sm">
      <TableCaption className="mt-0 mb-1 caption-top text-left font-medium text-foreground">{title}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{s.cycle}</TableHead>
          <TableHead>{s.status}</TableHead>
          <TableHead>{s.dateRange}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.cycle}</TableCell>
            <TableCell>{row.status}</TableCell>
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
