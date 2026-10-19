import type { ValidationCode } from '@recon/shared'
import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ValidationIssueSummary } from './contract'
import { ISSUES_PAGE_SIZE, validationIssuesQuery } from './queries'
import { strings } from './strings'

const s = strings.list

const features = tableFeatures({ rowPaginationFeature })
const helper = createColumnHelper<typeof features, ValidationIssueSummary>()

/** "Duplicate · in batch"; the one-row findings have no scope. */
export function typeOf(issue: Pick<ValidationIssueSummary, 'issueType' | 'scope'>): string {
  const type = strings.issueTypes[issue.issueType]
  return issue.scope ? `${type} · ${strings.scopes[issue.scope]}` : type
}

/** The ID as read, exactly; the gateway id when the finding has no row. */
export const idOf = (issue: Pick<ValidationIssueSummary, 'issueId' | 'transactionIdRaw' | 'transactionId'>) =>
  issue.transactionIdRaw ?? issue.transactionId ?? `#${issue.issueId}`

function columnsFor(onOpen: (issueId: number) => void) {
  return helper.columns([
    helper.display({
      id: 'id',
      header: s.id,
      cell: ({ row }) => (
        <button
          type="button"
          data-issue-button={row.original.issueId}
          onClick={() => onOpen(row.original.issueId)}
          className="whitespace-nowrap font-mono text-primary underline-offset-4 hover:underline focus-visible:outline-2"
        >
          {idOf(row.original)}
        </button>
      ),
    }),
    helper.display({ id: 'cycle', header: s.cycle, cell: ({ row }) => row.original.cycle ?? '' }),
    helper.display({ id: 'type', header: s.type, cell: ({ row }) => typeOf(row.original) }),
    helper.display({ id: 'reported', header: s.reported, cell: ({ row }) => row.original.status?.name ?? '' }),
    helper.display({ id: 'gateway', header: s.gateway, cell: ({ row }) => row.original.gatewayStatus?.name ?? '' }),
    helper.display({ id: 'range', header: s.range, cell: ({ row }) => row.original.missingRange ?? '' }),
    helper.display({
      id: 'included',
      header: s.included,
      cell: ({ row }) =>
        row.original.occurrenceCount > 0 ? (
          <span title={`${strings.drawer.includedByDefault}: ${row.original.includedByDefaultCount}`}>
            {`${row.original.includedCount} / ${row.original.occurrenceCount}`}
          </span>
        ) : (
          s.none
        ),
    }),
    helper.display({
      id: 'resolution',
      header: s.resolution,
      cell: ({ row }) => strings.resolution[row.original.resolutionStatus],
    }),
  ])
}

/**
 * The findings of the chosen validation in the current run, paged on the server in the API order (spec "lista de
 * hallazgos"). Each ID opens the finding.
 */
export function IssuesList({
  importId,
  validationCode,
  page,
  onPage,
  onOpen,
}: {
  importId: string
  validationCode: ValidationCode
  page: number
  onPage: (page: number) => void
  onOpen: (issueId: number) => void
}) {
  const query = useQuery(validationIssuesQuery(importId, { validationCode, page }))
  // Stable columns: a new definition on every render would mount new ID buttons and lose the focus going back to
  // them when the drawer closes (design D14).
  const open = useRef(onOpen)
  open.current = onOpen
  const columns = useMemo(() => columnsFor((issueId) => open.current(issueId)), [])
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / ISSUES_PAGE_SIZE))

  const table = useTable({
    features,
    columns,
    data: query.data?.items ?? [],
    manualPagination: true,
    rowCount: total,
    state: { pagination: { pageIndex: page - 1, pageSize: ISSUES_PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: ISSUES_PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPage(next.pageIndex + 1)
    },
    getRowId: (row) => String(row.issueId),
  })

  return (
    <section aria-label={s.label(strings.validations[validationCode])} className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{s.label(strings.validations[validationCode])}</h4>
      <div className="max-w-full overflow-x-auto rounded-md border">
        <Table aria-label={s.table} className="text-xs">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="align-top">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {query.isError && <p className="text-sm text-destructive">{s.loadError}</p>}
      {query.isSuccess && total === 0 && <p className="text-sm text-muted-foreground">{s.empty}</p>}
      <div className="flex items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground">{s.pageOf(page, pageCount, total)}</span>
        <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          {s.previous}
        </Button>
        <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          {s.next}
        </Button>
      </div>
    </section>
  )
}
