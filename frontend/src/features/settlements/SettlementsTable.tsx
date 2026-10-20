import { Link } from '@tanstack/react-router'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatAuditDateTime, formatBusinessDate, formatDecimal } from '@/lib/format'
import type { AccountSettlement, AccountSettlementsPage } from './contract'
import { SETTLEMENTS_PAGE_SIZE } from './queries'
import { strings } from './strings'

const s = strings.list

const features = tableFeatures({ rowPaginationFeature })
const helper = createColumnHelper<typeof features, AccountSettlement>()

const columns = helper.columns([
  helper.display({
    id: 'batch',
    header: s.columns.batch,
    cell: ({ row }) => (
      <Link
        to="/settlements/$batchId"
        params={{ batchId: row.original.batchId }}
        aria-label={s.batchLink(row.original.batchNo, row.original.attemptNo)}
        className="font-medium text-primary underline underline-offset-4"
      >
        {row.original.batchNo}
      </Link>
    ),
  }),
  helper.accessor('attemptNo', { header: s.columns.attempt }),
  helper.display({
    id: 'status',
    header: s.columns.status,
    cell: ({ row }) => <Badge variant="outline">{strings.summary.status[row.original.settledStatus]}</Badge>,
  }),
  helper.display({
    id: 'settlementDate',
    header: s.columns.settlementDate,
    cell: ({ row }) =>
      row.original.settlementDate === null ? s.notSet : formatBusinessDate(row.original.settlementDate),
  }),
  helper.display({
    id: 'processed',
    header: s.columns.processed,
    cell: ({ row }) => s.processed(row.original.approvedBy.userName, formatAuditDateTime(row.original.processedAt)),
  }),
  helper.display({
    id: 'amountPayable',
    header: () => <span className="block text-right">{s.columns.amountPayable}</span>,
    // The decimal string of the API, grouped: never a JS number.
    cell: ({ row }) => formatDecimal(row.original.amountPayable),
  }),
  // The stored label, possibly cut with an ellipsis: shown as it comes, never split (design D4).
  helper.accessor('channels', { header: s.columns.channels, cell: ({ getValue }) => getValue() ?? '' }),
])

const RIGHT = new Set(['amountPayable'])

/**
 * The attempts of the account, one page of the server in the API order (design D9). Every figure is the text of the
 * API; the page count is paging arithmetic over the integers of the answer.
 */
export function SettlementsTable({
  data,
  page,
  onPage,
}: {
  data: AccountSettlementsPage
  page: number
  onPage: (page: number) => void
}) {
  const reasons = { previous: useId(), next: useId() }
  const pageCount = Math.max(1, Math.ceil(data.total / SETTLEMENTS_PAGE_SIZE))

  const table = useTable({
    features,
    columns,
    data: data.items,
    manualPagination: true,
    rowCount: data.total,
    state: { pagination: { pageIndex: page - 1, pageSize: SETTLEMENTS_PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: SETTLEMENTS_PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPage(next.pageIndex + 1)
    },
    getRowId: (row) => row.batchId,
  })
  const canPrevious = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()

  return (
    <section className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-md border bg-background">
        <Table aria-label={s.tableLabel} className="text-sm">
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
            {table.getRowModel().rows.map((row) => {
              const undone = row.original.status === 'undone'
              return (
                <TableRow
                  key={row.id}
                  data-undone={undone || undefined}
                  className={undone ? 'text-muted-foreground' : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={RIGHT.has(cell.column.id) ? 'text-right tabular-nums' : 'whitespace-nowrap'}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {data.total === 0 && <p className="text-sm text-muted-foreground">{s.empty}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground">{s.pageOf(page, pageCount, data.total)}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!canPrevious}
          aria-describedby={canPrevious ? undefined : reasons.previous}
        >
          {s.previous}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!canNext}
          aria-describedby={canNext ? undefined : reasons.next}
        >
          {s.next}
        </Button>
      </div>
      <div className="flex justify-end gap-3 text-xs text-muted-foreground">
        {!canPrevious && <span id={reasons.previous}>{s.firstPage}</span>}
        {!canNext && <span id={reasons.next}>{s.lastPage}</span>}
      </div>
    </section>
  )
}
