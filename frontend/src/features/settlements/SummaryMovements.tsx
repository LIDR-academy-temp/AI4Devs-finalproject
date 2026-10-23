import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { type ReactNode, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBusinessDate, formatBusinessDateTime, formatDecimal } from '@/lib/format'
import { ListHeading, requestListFocus } from '@/lib/list-focus'
import type { AppliedFee, Cycle, SettlementMovement, SettlementTransactionsPage, SettlementView } from './contract'
import { Pager, useLastPageLimit } from './Pager'
import { settlementTransactionsQuery } from './queries'
import { strings } from './strings'

const s = strings.movements

/** The name of the movements list for requestListFocus. */
export const MOVEMENTS_LIST = 'movements'
const CYCLES = ['E', 'I', 'R'] as const satisfies readonly Cycle[]

const features = tableFeatures({ rowPaginationFeature })
const helper = createColumnHelper<typeof features, SettlementMovement>()

/** An amount of the API, grouped and kept on one line: the cells around it wrap, the figure never does. */
function Figure({ value }: { value: string }) {
  return <span className="whitespace-nowrap">{formatDecimal(value)}</span>
}

/**
 * A label and its value: the label may wrap between its words, the value never splits and stays with the last word
 * through a no-break space (`Released on` / `chargeback 0.0000`).
 */
function Labelled({ label, children }: { label: string; children: ReactNode }) {
  const words = label.split(' ')
  const last = words.pop()
  return (
    <>
      {words.length > 0 && `${words.join(' ')} `}
      <span className="whitespace-nowrap">
        {last}
        {' '}
        {children}
      </span>
    </>
  )
}

/**
 * The reserve figures of a movement, one labelled line each, as the API sent them. At 1024 px with a fee breakdown
 * open the labels must be able to wrap; the figures never do (design D11).
 */
function Reserves({ movement }: { movement: SettlementMovement }) {
  const lines = s.reserveLines
  return (
    <ul className="flex flex-col items-end">
      <li>
        <Labelled label={lines.held}>
          <Figure value={movement.reserveHeldAmt} />
        </Labelled>
      </li>
      <li>
        <Labelled label={lines.released}>
          <Figure value={movement.reserveReleasedAmt} />
        </Labelled>
      </li>
      <li>
        <Labelled label={lines.early}>
          <Figure value={movement.reserveEarlyReleasedAmt} />
        </Labelled>
      </li>
      {movement.expectedReserveReleaseAt && (
        <li className="text-muted-foreground">
          <Labelled label={lines.expected}>{formatBusinessDate(movement.expectedReserveReleaseAt)}</Labelled>
        </li>
      )}
    </ul>
  )
}

/** "2026-09-28 00:04 ET" as two whole pieces, date and time: at most two lines, never cut at a hyphen or a colon. */
function EventDate({ text }: { text: string }) {
  const [day, ...time] = text.split(' ')
  return (
    <>
      <span className="whitespace-nowrap">{day}</span> <span className="whitespace-nowrap">{time.join(' ')}</span>
    </>
  )
}

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
          <li key={fee.appliedFeeId}>{s.feeLine(fee.title, formatDecimal(fee.amountUsd))}</li>
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
    // One piece: "CHB · 2" is never split.
    cell: ({ row }) =>
      row.original.sheetName !== null && row.original.rowNo !== null ? (
        <span className="whitespace-nowrap">{s.sourceRow(row.original.sheetName, row.original.rowNo)}</span>
      ) : (
        s.noSourceRow
      ),
  }),
  helper.display({
    id: 'eventDate',
    header: s.columns.eventDate,
    cell: ({ row }) =>
      row.original.eventDate === null ? s.undated : <EventDate text={formatBusinessDateTime(row.original.eventDate)} />,
  }),
  helper.display({
    id: 'amount',
    header: s.columns.amount,
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <Figure value={row.original.amount} />
        {row.original.excludeAmount && <span className="text-xs text-muted-foreground">{s.excluded}</span>}
      </div>
    ),
  }),
  helper.display({
    id: 'fees',
    header: s.columns.fees,
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <Figure value={row.original.feeAmount} />
        {row.original.fees.length > 0 && <FeeBreakdown fees={row.original.fees} />}
      </div>
    ),
  }),
  helper.display({
    id: 'reserves',
    header: s.columns.reserves,
    cell: ({ row }) => <Reserves movement={row.original} />,
  }),
  helper.display({
    id: 'settled',
    header: s.columns.settled,
    // From the API (true only when the attempt is paid), never from the status of the attempt on screen.
    cell: ({ row }) => (row.original.settled ? s.settled : s.pendingPayment),
  }),
])

const RIGHT = new Set(['amount', 'fees', 'reserves'])

function MovementsTable({
  data,
  page,
  onPage,
}: {
  data: SettlementTransactionsPage
  page: number
  onPage: (page: number, options?: { replace?: boolean }) => void
}) {
  // The page size the API answered with, as in Settlement List.
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
                    className={`px-1.5 whitespace-normal ${RIGHT.has(header.column.id) ? 'text-right' : ''}`}
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
                    className={`align-top px-1.5 whitespace-normal ${RIGHT.has(cell.column.id) ? 'text-right tabular-nums' : ''}`}
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
        // Only the clicks ask for the focus: useLastPageLimit also changes the page, with no user action (design D13).
        onPrevious={() => {
          requestListFocus(MOVEMENTS_LIST)
          table.previousPage()
        }}
        onNext={() => {
          requestListFocus(MOVEMENTS_LIST)
          table.nextPage()
        }}
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
  onChange: (next: { cycle: Cycle; page: number }, options?: { replace?: boolean }) => void
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
            onClick={() => {
              if (c === cycle) return
              requestListFocus(MOVEMENTS_LIST)
              onChange({ cycle: c, page: 1 })
            }}
          >
            {s.cycle(c, view.movements[c])}
          </Button>
        ))}
      </div>
      {/* Outside the table: changing the cycle replaces the table with its placeholder (design D13). */}
      <ListHeading name={MOVEMENTS_LIST} focusKey={`${cycle}:${page}`} className="font-medium">
        {s.heading(cycle)}
      </ListHeading>
      {query.isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span>{s.loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {strings.retry}
          </Button>
        </div>
      ) : query.data ? (
        <MovementsTable
          data={query.data}
          page={page}
          onPage={(next, options) => onChange({ cycle, page: next }, options)}
        />
      ) : (
        <Skeleton className="h-40 w-full" aria-label={s.loading} />
      )}
    </section>
  )
}
