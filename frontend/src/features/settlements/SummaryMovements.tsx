import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBusinessDate, formatBusinessDateTime, formatDecimal } from '@/lib/format'
import type { AppliedFee, Cycle, SettlementMovement, SettlementTransactionsPage, SettlementView } from './contract'
import { Pager } from './Pager'
import { MOVEMENTS_PAGE_SIZE, settlementTransactionsQuery } from './queries'
import { strings } from './strings'

const s = strings.movements
const CYCLES = ['E', 'I', 'R'] as const satisfies readonly Cycle[]

const features = tableFeatures({ rowPaginationFeature })
const helper = createColumnHelper<typeof features, SettlementMovement>()

const money = (value: string) => formatDecimal(value)

/** The fees of a movement, each with its title and its amount as the API sent them; nothing is added up here. */
function FeeBreakdown({ fees }: { fees: AppliedFee[] }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  return (
    <div className="flex flex-col items-end text-xs">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="text-muted-foreground underline underline-offset-2"
      >
        {s.feeCount(fees.length)}
      </button>
      <ul id={listId} hidden={!open} className="text-left">
        {fees.map((fee) => (
          <li key={fee.appliedFeeId}>{s.feeLine(fee.title, money(fee.amountUsd))}</li>
        ))}
      </ul>
    </div>
  )
}

const columns = helper.columns([
  helper.accessor('sourceTransactionId', {
    header: s.columns.transaction,
    // External ids are text exactly as written: never parsed, never shortened.
    cell: ({ getValue }) => <span className="whitespace-nowrap font-mono">{getValue()}</span>,
  }),
  helper.accessor('status', { header: s.columns.status }),
  helper.accessor('roundNo', { header: s.columns.round, cell: ({ getValue }) => getValue() ?? '' }),
  helper.display({
    id: 'sourceRow',
    header: s.columns.sourceRow,
    cell: ({ row }) =>
      row.original.sheetName !== null && row.original.rowNo !== null
        ? s.sourceRow(row.original.sheetName, row.original.rowNo)
        : s.noSourceRow,
  }),
  helper.display({
    id: 'eventDate',
    header: s.columns.eventDate,
    cell: ({ row }) => (row.original.eventDate === null ? s.undated : formatBusinessDateTime(row.original.eventDate)),
  }),
  helper.display({
    id: 'amount',
    header: s.columns.amount,
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <span>{money(row.original.amount)}</span>
        {row.original.excludeAmount && <span className="text-xs text-muted-foreground">{s.excluded}</span>}
      </div>
    ),
  }),
  helper.display({
    id: 'fees',
    header: s.columns.fees,
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <span>{money(row.original.feeAmount)}</span>
        {row.original.fees.length > 0 && <FeeBreakdown fees={row.original.fees} />}
      </div>
    ),
  }),
  helper.display({
    id: 'reserveHeld',
    header: s.columns.reserveHeld,
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <span>{money(row.original.reserveHeldAmt)}</span>
        {row.original.expectedReserveReleaseAt && (
          <span className="text-xs text-muted-foreground">
            {s.releaseOn(formatBusinessDate(row.original.expectedReserveReleaseAt))}
          </span>
        )}
      </div>
    ),
  }),
  helper.display({
    id: 'reserveReleased',
    header: s.columns.reserveReleased,
    cell: ({ row }) => money(row.original.reserveReleasedAmt),
  }),
  helper.display({
    id: 'reserveEarlyReleased',
    header: s.columns.reserveEarlyReleased,
    cell: ({ row }) => money(row.original.reserveEarlyReleasedAmt),
  }),
  helper.display({
    id: 'settled',
    header: s.columns.settled,
    // From the API (true only when the attempt is paid), never from the status of the attempt on screen.
    cell: ({ row }) => (row.original.settled ? s.settled : s.pendingPayment),
  }),
])

const RIGHT = new Set(['amount', 'fees', 'reserveHeld', 'reserveReleased', 'reserveEarlyReleased'])

function MovementsTable({
  data,
  page,
  onPage,
}: {
  data: SettlementTransactionsPage
  page: number
  onPage: (page: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(data.total / MOVEMENTS_PAGE_SIZE))
  const table = useTable({
    features,
    columns,
    data: data.items,
    manualPagination: true,
    rowCount: data.total,
    state: { pagination: { pageIndex: page - 1, pageSize: MOVEMENTS_PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: MOVEMENTS_PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPage(next.pageIndex + 1)
    },
    getRowId: (row) => row.settlementTxnId,
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-md border bg-background">
        <Table aria-label={s.tableLabel} className="text-xs">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`whitespace-nowrap ${RIGHT.has(header.column.id) ? 'text-right' : ''}`}
                  >
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
                  <TableCell
                    key={cell.id}
                    className={`align-top ${RIGHT.has(cell.column.id) ? 'text-right tabular-nums' : 'whitespace-nowrap'}`}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
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
    </div>
  )
}

/**
 * The movements of one cycle of the attempt, as the API pages them (spec "Pantalla Settlement Summary: pestaña
 * Movements", design D11). The counter of each cycle is view.movements: nothing is counted here.
 */
export function SummaryMovements({
  view,
  cycle,
  page,
  onChange,
}: {
  view: SettlementView
  cycle: Cycle
  page: number
  onChange: (next: { cycle: Cycle; page: number }) => void
}) {
  const query = useQuery(settlementTransactionsQuery(view.batchId, cycle, page))

  return (
    <section className="flex flex-col gap-3">
      <div role="toolbar" aria-label={s.cycleLabel} className="flex flex-wrap items-center gap-1">
        <span className="pr-1 text-sm text-muted-foreground">{s.cycleLabel}</span>
        {CYCLES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={c === cycle ? 'secondary' : 'ghost'}
            aria-pressed={c === cycle}
            onClick={() => onChange({ cycle: c, page: 1 })}
          >
            {s.cycle(c, view.movements[c])}
          </Button>
        ))}
      </div>
      {query.isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span>{s.loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {strings.retry}
          </Button>
        </div>
      ) : query.data ? (
        <MovementsTable data={query.data} page={page} onPage={(next) => onChange({ cycle, page: next })} />
      ) : (
        <Skeleton className="h-40 w-full" aria-label={s.loading} />
      )}
    </section>
  )
}
