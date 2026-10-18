import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ApiError } from '@/lib/api/client'
import { formatAuditDateTime, formatBusinessDateTime } from '@/lib/format'
import type { OccurrenceView, ValidationIssueDetail } from './contract'
import { IssueHistory } from './IssueHistory'
import { idOf, typeOf } from './IssuesList'
import { Occurrences } from './Occurrences'
import { validationIssueQuery } from './queries'
import { strings } from './strings'

const s = strings.drawer

/** Whether an occurrence is included now, as text: read-only, or not editable for this user and run. */
export function InclusionText({ occurrence }: { occurrence: OccurrenceView }) {
  return <span className="font-medium">{occurrence.includeInSettlement ? s.included : s.excluded}</span>
}

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

/**
 * The finding open in the address (design D6): a panel on the right with its occurrences, resolution and history.
 * Closing gives the focus back to the finding in the list, also when it was opened from a link.
 */
export function IssueDrawer({
  issueId,
  onClose,
  inclusion = (occurrence) => <InclusionText occurrence={occurrence} />,
  actions,
}: {
  issueId: number | undefined
  onClose: () => void
  /** The control of an occurrence's inclusion; text by default. */
  inclusion?: (occurrence: OccurrenceView, issue: ValidationIssueDetail) => React.ReactNode
  /** Actions on the whole finding, below its occurrences. */
  actions?: (issue: ValidationIssueDetail) => React.ReactNode
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
        className="w-[min(42rem,100vw)] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.querySelector<HTMLElement>(`[data-issue-button="${lastOpened.current}"]`)?.focus()
        }}
      >
        <SheetHeader>
          <SheetTitle>{issue ? s.title(strings.validations[issue.validationCode], idOf(issue)) : s.loading}</SheetTitle>
          <SheetDescription>{issue ? typeOf(issue) : ''}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {query.isError && !gone && <p className="text-sm text-destructive">{s.loadError}</p>}
          {issue && (
            <>
              {!issue.run.isCurrent && <p className="text-sm text-amber-700 dark:text-amber-400">{s.superseded}</p>}
              <Facts issue={issue} />
              <Occurrences occurrences={issue.occurrences} inclusion={(o) => inclusion(o, issue)} />
              <Resolution issue={issue} />
              {actions?.(issue)}
              <IssueHistory history={issue.history} occurrences={issue.occurrences} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
