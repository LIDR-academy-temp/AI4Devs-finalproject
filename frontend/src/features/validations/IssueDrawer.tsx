import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ApiError } from '@/lib/api/client'
import { formatAuditDateTime, formatBusinessDateTime } from '@/lib/format'
import type { OccurrenceView, ValidationIssueDetail } from './contract'
import { InclusionSwitch } from './InclusionSwitch'
import { IssueHistory } from './IssueHistory'
import { idOf, typeOf } from './IssuesList'
import { useIssueActions } from './mutations'
import { Occurrences } from './Occurrences'
import { validationIssueQuery } from './queries'
import { ResolveForm } from './ResolveForm'
import { strings } from './strings'

const s = strings.drawer

function Facts({ issue }: { issue: ValidationIssueDetail }) {
  const where = issue.source && s.location(issue.source.fileName, issue.source.sheetName, issue.source.rowNo)
  const facts = [
    [s.type, typeOf(issue)],
    [s.cycle, issue.cycle],
    [s.reported, issue.status?.name],
    [s.gateway, issue.gatewayStatus?.name],
    [s.range, issue.missingRange],
    [s.relevantDate, issue.relevantDate && formatBusinessDateTime(issue.relevantDate)],
    [s.source, where],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]))

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {facts.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Resolution({ issue }: { issue: ValidationIssueDetail }) {
  if (issue.resolutionStatus !== 'resolved' || !issue.resolvedBy || !issue.resolvedAt) return null
  return (
    <div className="flex flex-col gap-1 rounded-md border p-2 text-sm">
      <span className="font-medium">
        {s.resolvedBy(issue.resolvedBy.userName, formatAuditDateTime(issue.resolvedAt))}
      </span>
      {issue.resolutionNote && <p className="text-muted-foreground">{issue.resolutionNote}</p>}
    </div>
  )
}

/** The loaded finding with its actions (design D7); the controls follow only the flags the API sends. */
function Finding({ issue, onPending }: { issue: ValidationIssueDetail; onPending?: (pending: boolean) => void }) {
  const actions = useIssueActions(issue, onPending)
  const [asking, setAsking] = useState<{ occurrence: OccurrenceView; to: boolean } | null>(null)
  const c = strings.inclusion.confirm

  // On a validated import a change invalidates the review: ask first.
  const change = (occurrence: OccurrenceView, to: boolean) => {
    if (issue.importStatus === 'validated') setAsking({ occurrence, to })
    else void actions.setInclusion(occurrence, to)
  }

  return (
    <>
      {!issue.run.isCurrent && <p className="text-sm text-amber-700 dark:text-amber-400">{s.superseded}</p>}
      <Facts issue={issue} />
      <div aria-live="polite" className="text-sm">
        {actions.message && <p className="text-destructive">{actions.message}</p>}
      </div>
      {/* A one-row finding has its row in `source` and no occurrences: there is no list to show. */}
      {(issue.occurrences.length > 0 || !issue.source) && (
        <Occurrences
          occurrences={issue.occurrences}
          inclusion={(occurrence) => (
            <InclusionSwitch occurrence={occurrence} busy={actions.pending} onChange={change} />
          )}
        />
      )}
      <Resolution issue={issue} />
      {issue.resolvable && <ResolveForm actions={actions} />}
      <IssueHistory history={issue.history} occurrences={issue.occurrences} />
      <AlertDialog open={asking !== null} onOpenChange={(open) => !open && setAsking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.title}</AlertDialogTitle>
            <AlertDialogDescription>{c.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.keep}</AlertDialogCancel>
            <Button
              onClick={() => {
                if (asking) void actions.setInclusion(asking.occurrence, asking.to)
                setAsking(null)
              }}
            >
              {c.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * The finding open in the address (design D6): a panel on the right with its occurrences, resolution and history.
 * Closing gives the focus back to the finding in the list, also when it was opened from a link.
 */
export function IssueDrawer({
  issueId,
  onClose,
  onPending,
}: {
  issueId: number | undefined
  onClose: () => void
  /** Told when a change of the finding is on its way, so the rest of the section waits for it. */
  onPending?: (pending: boolean) => void
}) {
  const query = useQuery({ ...validationIssueQuery(issueId ?? 0), enabled: issueId !== undefined })
  const lastOpened = useRef<number | undefined>(issueId)
  if (issueId !== undefined) lastOpened.current = issueId

  const gone = query.error instanceof ApiError && query.error.status === 404
  useEffect(() => {
    if (gone) onClose()
  }, [gone, onClose])

  const issue = query.data
  // The panel opens with its content: once the finding is read, or with the error if it could not be.
  const open = issueId !== undefined && (query.isSuccess || (query.isError && !gone))

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        // Same variants as the sheet's own width classes, so these replace them instead of losing to them (D14).
        className="overflow-y-auto data-[side=right]:w-[min(42rem,100vw)] data-[side=right]:sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.querySelector<HTMLElement>(`[data-issue-button="${lastOpened.current}"]`)?.focus()
        }}
      >
        <SheetHeader>
          <SheetTitle className="pr-8 break-words">
            {issue ? s.title(strings.validations[issue.validationCode], idOf(issue)) : s.loading}
          </SheetTitle>
          <SheetDescription>{issue ? typeOf(issue) : ''}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {query.isError && !gone && <p className="text-sm text-destructive">{s.loadError}</p>}
          {issue && <Finding key={issue.issueId} issue={issue} onPending={onPending} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
