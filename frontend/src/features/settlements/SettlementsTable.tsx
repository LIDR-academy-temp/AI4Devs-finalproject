import { Link } from '@tanstack/react-router'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { Fragment, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatAuditDateTime, formatBusinessDate, formatDecimal } from '@/lib/format'
import { SETTLED_STATUS_TONE, toneOf } from '@/lib/status-tone'
import type { AccountSettlement, AccountSettlementsPage } from './contract'
import { Pager, useLastPageLimit } from './Pager'
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
    cell: ({ row }) => (
      <Badge variant={toneOf(SETTLED_STATUS_TONE, row.original.settledStatus)} className="h-auto whitespace-normal">
        {strings.summary.status[row.original.settledStatus]}
      </Badge>
    ),
  }),
  helper.display({
    id: 'settlementDate',
    header: s.columns.settlementDate,
    cell: ({ row }) =>
      row.original.settlementDate === null ? (
        s.notSet
      ) : (
        <NoBreak>{formatBusinessDate(row.original.settlementDate)}</NoBreak>
      ),
  }),
  helper.display({
    id: 'processed',
    header: s.columns.processed,
    // The line may break between who and when, never inside the date.
    cell: ({ row }) => (
      <>
        {s.processedBy(row.original.approvedBy.userName)}
        <NoBreak>{formatAuditDateTime(row.original.processedAt)}</NoBreak>
      </>
    ),
  }),
  helper.display({
    id: 'amountPayable',
    header: () => <span className="block text-right">{s.columns.amountPayable}</span>,
    // The decimal string of the API, grouped: never a JS number, never wrapped.
    cell: ({ row }) => <NoBreak>{formatDecimal(row.original.amountPayable)}</NoBreak>,
  }),
  // The stored label, possibly cut with an ellipsis: shown as it comes, never split (design D4); it may only wrap
  // after a comma.
  helper.accessor('channels', {
    header: s.columns.channels,
    cell: ({ getValue }) => <WrapAfterCommas text={getValue() ?? ''} />,
  }),
])

/** Text kept on one line: the cell around it wraps, this never does (not even at a hyphen). */
function NoBreak({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>
}

/**
 * The text as it is, with a line break allowed only after a comma: each piece stays on one line, and a `<wbr>` adds
 * no character.
 */
function WrapAfterCommas({ text }: { text: string }) {
  const [first = '', ...rest] = text.split(',')
  // Each piece is keyed by where it starts in the text, which never repeats.
  let start = first.length
  const pieces = rest.map((part) => {
    const piece = (
      <Fragment key={start}>
        ,<wbr />
        <NoBreak>{part}</NoBreak>
      </Fragment>
    )
    start += part.length + 1
    return piece
  })
  return (
    <>
      <NoBreak>{first}</NoBreak>
      {pieces}
    </>
  )
}

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
  onPage: (page: number, options?: { replace?: boolean }) => void
}) {
  // The page size the API answered with, not the one asked for.
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))
  useLastPageLimit(page, pageCount, (last) => onPage(last, { replace: true }))

  const table = useTable({
    features,
    columns,
    data: data.items,
    manualPagination: true,
    rowCount: data.total,
    state: { pagination: { pageIndex: page - 1, pageSize: data.pageSize } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: data.pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPage(next.pageIndex + 1)
    },
    getRowId: (row) => row.batchId,
  })

  return (
    <section className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-md border bg-background">
        <Table aria-label={s.tableLabel} className="text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-normal">
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
                      className={`whitespace-normal ${RIGHT.has(cell.column.id) ? 'text-right tabular-nums' : ''}`}
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
      <Pager
        summary={s.pageOf(page, pageCount, data.total)}
        canPrevious={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
        onPrevious={() => table.previousPage()}
        onNext={() => table.nextPage()}
      />
    </section>
  )
}
