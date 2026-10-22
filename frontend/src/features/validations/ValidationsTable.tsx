import { MissingRange, type ValidationCode } from '@recon/shared'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toneOf, VALIDATION_OUTCOME_TONE } from '@/lib/status-tone'
import type { ValidationResultView } from './contract'
import { strings } from './strings'

const s = strings.table

/** The breakdown without its zeros: `1 non-recorded adjustment · 2 status mismatches`, `APP 3 · R 3`. */
function breakdownOf(result: ValidationResultView): string {
  const breakdown = result.breakdown
  if (!breakdown) return ''
  const b = strings.breakdown
  const parts =
    result.validationCode === 'non_recorded_adjustment'
      ? [
          (breakdown.non_recorded_adjustment ?? 0) > 0 && b.non_recorded_adjustment(breakdown.non_recorded_adjustment!),
          (breakdown.status_mismatch ?? 0) > 0 && b.status_mismatch(breakdown.status_mismatch!),
        ]
      : MissingRange.options.map((range) => (breakdown[range] ?? 0) > 0 && b.range(range, breakdown[range]!))
  return parts.filter(Boolean).join(' · ')
}

/**
 * The eight validations in the order of the API (spec "tabla de las ocho validaciones"). A validation with findings
 * is a button that lists them.
 */
export function ValidationsTable({
  results,
  selected,
  onSelect,
}: {
  results: ValidationResultView[]
  selected: ValidationCode | undefined
  onSelect: (code: ValidationCode) => void
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table aria-label={s.label} className="text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>{s.validation}</TableHead>
            <TableHead>{s.outcome}</TableHead>
            <TableHead className="text-right">{s.findings}</TableHead>
            <TableHead>{s.blocking}</TableHead>
            <TableHead>{s.breakdown}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const name = strings.validations[result.validationCode]
            return (
              <TableRow
                key={result.validationCode}
                data-state={selected === result.validationCode ? 'selected' : undefined}
              >
                <TableCell>
                  {result.issueCount > 0 ? (
                    <button
                      type="button"
                      aria-pressed={selected === result.validationCode}
                      onClick={() => onSelect(result.validationCode)}
                      className="text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2"
                    >
                      {name}
                    </button>
                  ) : (
                    name
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={toneOf(VALIDATION_OUTCOME_TONE, result.outcome)}>
                    {strings.outcomes[result.outcome]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{result.issueCount}</TableCell>
                <TableCell>{result.blocking ? s.blocks : s.none}</TableCell>
                <TableCell className="text-muted-foreground">{breakdownOf(result)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
