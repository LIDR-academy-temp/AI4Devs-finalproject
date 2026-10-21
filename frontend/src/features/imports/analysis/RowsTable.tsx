import type { MatchResult } from '@recon/shared'
import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ImportRowItem } from '@/lib/api/types'
import { formatDecimal } from '@/lib/format'
import { importRowsQuery, ROWS_PAGE_SIZE } from '../queries'
import { strings } from '../strings'

const s = strings.analysis.rows
const FILTERS = ['unmatched', 'ambiguous', 'matched', 'ignored'] as const satisfies readonly MatchResult[]

const features = tableFeatures({ rowPaginationFeature })
const helper = createColumnHelper<typeof features, ImportRowItem>()

function resultText(row: ImportRowItem): string {
  const result = s.results[row.matchResult]
  return row.reason ? `${result} · ${s.reasons[row.reason]}` : result
}

function Candidates({ row }: { row: ImportRowItem }) {
  if (row.candidates.length === 0) return null
  return (
    <ul className="text-xs text-muted-foreground">
      {row.candidates.map((c) => (
        <li key={`${c.gatewayId}:${c.transactionId}`}>
          {'outOfScope' in c && c.outOfScope ? `${c.gatewayName} (${s.otherMerchant})` : c.gatewayName}
        </li>
      ))}
    </ul>
  )
}

const columns = helper.columns([
  helper.display({
    id: 'file',
    header: s.columns.file,
    // The sheet always shows; the file, long and shared by many rows, wraps where it does not fit (the names of the
    // template have no spaces) and keeps its whole name as tooltip (design D7).
    cell: ({ row }) => (
      <div className="flex max-w-64 flex-col">
        <span className="whitespace-nowrap font-medium">{row.original.sheetName}</span>
        <span className="text-muted-foreground [overflow-wrap:anywhere]" title={row.original.fileName}>
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
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{resultText(row.original)}</span>
        <Candidates row={row.original} />
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
    cell: ({ row }) => row.original.warnings.map((w) => strings.analysis.warnings.labels[w]).join(', '),
  }),
])

/**
 * The rows of the analysis, paged on the server in the API order (spec "Resultado del análisis: tabla de filas").
 * Filter and page live in the address so reloading keeps the view.
 */
export function RowsTable({
  importId,
  match,
  page,
  onChange,
}: {
  importId: string
  match: MatchResult | undefined
  page: number
  onChange: (next: { match: MatchResult | undefined; page: number }) => void
}) {
  const query = useQuery(importRowsQuery(importId, { match, page }))
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / ROWS_PAGE_SIZE))

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

  const filterButton = (value: MatchResult | undefined, label: string) => (
    <Button
      key={label}
      size="sm"
      variant={match === value ? 'secondary' : 'ghost'}
      aria-pressed={match === value}
      onClick={() => onChange({ match: value, page: 1 })}
    >
      {label}
    </Button>
  )

  return (
    <section className="flex flex-col gap-2">
      <div role="toolbar" aria-label={s.filterLabel} className="flex flex-wrap items-center gap-1">
        <span className="pr-1 text-sm text-muted-foreground">{s.filterLabel}</span>
        {filterButton(undefined, s.filters.all)}
        {FILTERS.map((f) => filterButton(f, s.filters[f]))}
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
