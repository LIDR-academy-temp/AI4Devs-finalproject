import type { MatchResult } from '@recon/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { validationRunKey } from '@/features/validations/queries'
import { ApiError } from '@/lib/api/client'
import type { ImportRowItem, ImportStatus } from '@/lib/api/types'
import { formatDecimal } from '@/lib/format'
import { ListHeading, requestListFocus } from '@/lib/list-focus'
import { useReloadImport, useResolveRow } from '../mutations'
import { useCanProcess } from '../permissions'
import { importKey, importRowsQuery, ROWS_PAGE_SIZE } from '../queries'
import { strings } from '../strings'
import {
  AmbiguousCandidates,
  type Candidate,
  candidateLabel,
  ResolutionContext,
  type ResolutionMode,
} from './AmbiguousCandidates'
import { ResolveRowDialog, type RowChoice } from './ResolveRowDialog'

const s = strings.analysis.rows

/** The name of the rows list for requestListFocus. */
export const ROWS_LIST = 'rows'
const FILTERS = ['unmatched', 'ambiguous', 'matched', 'ignored'] as const satisfies readonly MatchResult[]

const features = tableFeatures({ rowPaginationFeature })
const helper = createColumnHelper<typeof features, ImportRowItem>()

function resultText(row: ImportRowItem): string {
  const result = s.results[row.matchResult]
  return row.reason ? `${result} · ${s.reasons[row.reason]}` : result
}

const columns = helper.columns([
  helper.display({
    id: 'file',
    header: s.columns.file,
    // The sheet always shows; the file, long and shared by many rows, wraps where it does not fit (the names of the
    // template have no spaces) and keeps its whole name as tooltip (design D7). Narrow, so the table fits at 1024 px.
    cell: ({ row }) => (
      <div className="flex max-w-40 flex-col">
        <span className="whitespace-nowrap font-medium">{row.original.sheetName}</span>
        {/* whitespace-normal: the cell does not wrap, and overflow-wrap does nothing under it (#132). */}
        <span
          className="whitespace-normal text-muted-foreground [overflow-wrap:anywhere]"
          title={row.original.fileName}
        >
          {row.original.fileName}
        </span>
      </div>
    ),
  }),
  helper.accessor('rowNo', { header: s.columns.row }),
  helper.accessor('transactionIdRaw', {
    header: s.columns.id,
    // IDs are text exactly as read: never parsed, never shortened.
    cell: ({ getValue }) => <span className="whitespace-nowrap font-mono">{getValue() ?? ''}</span>,
  }),
  helper.accessor('cycle', { header: s.columns.cycle }),
  helper.display({
    id: 'result',
    header: s.columns.result,
    // Texts wrap between words in a bounded width, as wide as the candidates below; figures and IDs never wrap (#132).
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="max-w-32 whitespace-normal">{resultText(row.original)}</span>
        <AmbiguousCandidates row={row.original} />
      </div>
    ),
  }),
  helper.display({
    id: 'status',
    header: s.columns.status,
    cell: ({ row }) => row.original.statusName ?? row.original.statusRaw ?? '',
  }),
  helper.display({
    id: 'amount',
    header: s.columns.amount,
    cell: ({ row }) =>
      row.original.transaction === null && row.original.warnings.includes('out_of_scope_transaction')
        ? ''
        : row.original.amount === null
          ? ''
          : formatDecimal(row.original.amount),
  }),
  helper.display({
    id: 'currency',
    header: s.columns.currency,
    cell: ({ row }) =>
      row.original.warnings.includes('out_of_scope_transaction') ? '' : (row.original.currency ?? ''),
  }),
  helper.display({
    id: 'channel',
    header: s.columns.channel,
    cell: ({ row }) => row.original.transaction?.channelName ?? '',
  }),
  helper.display({
    id: 'warnings',
    header: s.columns.warnings,
    cell: ({ row }) =>
      row.original.warnings.length === 0 ? null : (
        <span className="block max-w-40 whitespace-normal">
          {row.original.warnings.map((w) => strings.analysis.warnings.labels[w]).join(', ')}
        </span>
      ),
  }),
])

/**
 * The rows of the analysis, paged on the server in the API order (spec "Resultado del análisis: tabla de filas").
 * Filter and page live in the address so reloading keeps the view.
 */
export function RowsTable({
  importId,
  status,
  match,
  page,
  onChange,
}: {
  importId: string
  /** The status of the import: whether an ambiguous row can be resolved (web-ambiguous-rows design D1). */
  status: ImportStatus
  match: MatchResult | undefined
  page: number
  onChange: (next: { match: MatchResult | undefined; page: number }) => void
}) {
  const query = useQuery(importRowsQuery(importId, { match, page }))
  const canProcess = useCanProcess()
  const mode: ResolutionMode = !canProcess
    ? 'none'
    : status === 'analyzed'
      ? 'enabled'
      : status === 'validated'
        ? 'disabled'
        : 'none'
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / ROWS_PAGE_SIZE))

  // Resolving an ambiguous row (web-ambiguous-rows design D2–D4).
  const queryClient = useQueryClient()
  const resolver = useResolveRow(importId)
  const reloadImport = useReloadImport(importId)
  const [choice, setChoice] = useState<RowChoice | null>(null)
  // False once the rows change under the dialog (a 200, a 400 or row_not_ambiguous): its Choose goes with the next
  // rows, so the heading of the rows takes the focus, not the Choose (design D4).
  const [returnFocus, setReturnFocus] = useState(true)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  // Each of those answers changes the key of the heading, so it takes the focus they asked for.
  const [rowChanges, setRowChanges] = useState(0)
  const [afterResolve, setAfterResolve] = useState(false)

  const choose = (row: ImportRowItem, candidate: Candidate, opener: HTMLElement) => {
    // Known only from what the validations section already read: unknown warns as well (design D2).
    const view = queryClient.getQueryData<{ run: unknown }>(validationRunKey(importId))
    setMessage(null)
    setReturnFocus(true)
    setChoice({ row, candidate, warnRun: view === undefined || view.run !== null, opener })
  }
  const askRows = () => void queryClient.invalidateQueries({ queryKey: [...importKey(importId), 'rows'] })
  // The Choose that opened the dialog will not survive the rows that come next: the focus goes to their heading.
  const focusRows = () => {
    setReturnFocus(false)
    requestListFocus(ROWS_LIST)
    setRowChanges((n) => n + 1)
  }
  const confirm = ({ row, candidate }: RowChoice) =>
    resolver.mutate(
      { sheetId: row.sheetId, rowNo: row.rowNo, gatewayId: candidate.gatewayId },
      {
        onSuccess: () => {
          focusRows()
          setChoice(null)
          setMessage({ text: s.resolve.resolved(row.rowNo, row.sheetName, candidateLabel(candidate)), error: false })
          setAfterResolve(true)
        },
        onError: (failure) => {
          setChoice(null)
          const code = failure instanceof ApiError ? failure.code : undefined
          if (code === 'import_not_editable') {
            const current = (failure as ApiError).details as { status?: string } | undefined
            setMessage({ text: s.resolve.notEditable(current?.status ?? ''), error: true })
            void reloadImport()
          } else if (code === 'row_not_ambiguous') {
            focusRows()
            setMessage({ text: s.resolve.notAmbiguous, error: true })
            void reloadImport()
            askRows()
          } else if (code === 'validation_error') {
            focusRows()
            setMessage({ text: s.resolve.notCandidate, error: true })
            askRows()
          } else {
            setMessage({ text: s.resolve.failed, error: true })
          }
        },
      },
    )
  const resolution = { mode, pending: resolver.isPending, onChoose: choose }

  // The resolved row may leave the last page of a filter empty: show the last page there is instead (design D4).
  useEffect(() => {
    if (!afterResolve || query.isFetching || !query.isSuccess) return
    setAfterResolve(false)
    if (page > pageCount) onChange({ match, page: pageCount })
  }, [afterResolve, query.isFetching, query.isSuccess, page, pageCount, match, onChange])

  const table = useTable({
    features,
    columns,
    data: query.data?.items ?? [],
    manualPagination: true,
    rowCount: total,
    state: { pagination: { pageIndex: page - 1, pageSize: ROWS_PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: ROWS_PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      onChange({ match, page: next.pageIndex + 1 })
    },
    getRowId: (row) => `${row.fileId}:${row.sheetId}:${row.rowNo}`,
  })

  // A filter or a page the user picks takes the focus to the heading of the rows (ui-polish design D13).
  const filterButton = (value: MatchResult | undefined, label: string) => (
    <Button
      key={label}
      size="sm"
      variant={match === value ? 'secondary' : 'ghost'}
      aria-pressed={match === value}
      onClick={() => {
        if (value === match) return
        requestListFocus(ROWS_LIST)
        onChange({ match: value, page: 1 })
      }}
    >
      {label}
    </Button>
  )
  const turn = (step: () => void) => {
    requestListFocus(ROWS_LIST)
    step()
  }

  return (
    <ResolutionContext.Provider value={resolution}>
      <section className="flex flex-col gap-2">
        <ListHeading name={ROWS_LIST} focusKey={`${match}:${page}:${rowChanges}`} className="font-medium">
          {s.title}
        </ListHeading>
        <div role="toolbar" aria-label={s.filterLabel} className="flex flex-wrap items-center gap-1">
          <span className="pr-1 text-sm text-muted-foreground">{s.filterLabel}</span>
          {filterButton(undefined, s.filters.all)}
          {FILTERS.map((f) => filterButton(f, s.filters[f]))}
        </div>
        <div aria-live="polite" className="text-sm">
          {message && <p className={message.error ? 'text-destructive' : undefined}>{message.text}</p>}
        </div>
        <div className="max-w-full overflow-x-auto rounded-md border bg-background">
          <Table aria-label={s.title} className="text-xs">
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
                <TableRow
                  key={row.id}
                  className={row.original.matchResult === 'matched' ? '' : 'bg-amber-50/60 dark:bg-amber-950/20'}
                >
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => turn(() => table.previousPage())}
            disabled={!table.getCanPreviousPage()}
          >
            {s.previous}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => turn(() => table.nextPage())}
            disabled={!table.getCanNextPage()}
          >
            {s.next}
          </Button>
        </div>
        <ResolveRowDialog
          choice={choice}
          pending={resolver.isPending}
          returnFocus={returnFocus}
          onConfirm={confirm}
          onClose={() => setChoice(null)}
        />
      </section>
    </ResolutionContext.Provider>
  )
}
