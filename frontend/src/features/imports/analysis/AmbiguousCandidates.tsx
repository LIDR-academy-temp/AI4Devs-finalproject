import { createContext, useContext, useId } from 'react'
import { Button } from '@/components/ui/button'
import type { ImportRowItem } from '@/lib/api/types'
import { strings } from '../strings'

const s = strings.analysis.rows

export type Candidate = ImportRowItem['candidates'][number]

/**
 * What the candidates of an ambiguous row offer (web-ambiguous-rows design D1): `enabled` with settlement.process in
 * analyzed, `disabled` with it in validated (the PATCH answers 409 there), `none` otherwise. Presentation only: the
 * API enforces both.
 */
export type ResolutionMode = 'enabled' | 'disabled' | 'none'

export interface Resolution {
  mode: ResolutionMode
  /** A PATCH is on its way: one write at a time, so every Choose waits (design D4). */
  pending: boolean
  /** Opens the confirmation for this candidate of this row. */
  onChoose: (row: ImportRowItem, candidate: Candidate) => void
}

export const ResolutionContext = createContext<Resolution>({ mode: 'none', pending: false, onChoose: () => {} })

export const isOutOfScope = (c: Candidate) => 'outOfScope' in c && c.outOfScope === true

/** The name of a candidate as the screen shows it: its gateway, and whose it is when of another merchant. */
export const candidateLabel = (c: Candidate) =>
  isOutOfScope(c) ? `${c.gatewayName} (${s.otherMerchant})` : c.gatewayName

/** The gateways of an ambiguous row, each with Choose when the mode allows it (spec "Fila ambigua"). */
export function AmbiguousCandidates({ row }: { row: ImportRowItem }) {
  const { mode, pending, onChoose } = useContext(ResolutionContext)
  const hintId = useId()
  if (row.candidates.length === 0) return null
  const withControl = mode !== 'none' && row.matchResult === 'ambiguous'
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
        {row.candidates.map((c) => (
          <li key={`${c.gatewayId}:${c.transactionId}`} className="flex items-center gap-2">
            <span>{candidateLabel(c)}</span>
            {withControl && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                aria-label={s.choose(candidateLabel(c), row.rowNo, row.sheetName)}
                aria-describedby={mode === 'disabled' ? hintId : undefined}
                disabled={mode === 'disabled' || pending}
                onClick={() => onChoose(row, c)}
              >
                {s.chooseButton}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {withControl && mode === 'disabled' && (
        <p id={hintId} className="max-w-64 text-xs text-muted-foreground">
          {s.validatedHint}
        </p>
      )}
    </div>
  )
}
