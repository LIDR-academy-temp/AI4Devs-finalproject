import { Link } from '@tanstack/react-router'
import { Pager, useLastPageLimit } from '@/components/Pager'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { auditInstant, formatAuditDate } from '@/lib/format'
import { requestListFocus } from '@/lib/list-focus'
import { FEE_STATUS_TONE, toneOf } from '@/lib/status-tone'
import type { FeePage } from './contract'
import { feeAppliesTo, formatFeeValue, formatValidFrom, formatValidTo } from './fee-display'
import { strings } from './strings'

const s = strings.global

/** A text cell that may wrap: the shadcn cell does not by default. */
const WRAP = 'whitespace-normal'

/** The name of the global fees list for requestListFocus. */
export const FEES_LIST = 'fees'

export interface FeeTypeInfo {
  feeTypeId: number
  isTransactional: boolean
  appliesToStatusId: number | null
  allowsFreeAmount: boolean
}

const COLUMNS = [
  s.columns.account,
  s.columns.type,
  s.columns.appliesTo,
  s.columns.value,
  s.columns.validFrom,
  s.columns.validTo,
  s.columns.status,
  s.columns.lastChange,
]

/**
 * One page of GET /fees in the order of the API (spec fees "Pantalla Fees: columnas y orden"): merchant and provider
 * go under the account in each row, never group headers that a page would cut. Every value is the text of the API.
 */
export function FeesTable({
  data,
  page,
  feeTypes,
  onPage,
}: {
  data: FeePage
  page: number
  feeTypes: readonly FeeTypeInfo[] | undefined
  onPage: (page: number, options?: { replace?: boolean }) => void
}) {
  // The page size the API answered with, not the one asked for.
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))
  useLastPageLimit(page, pageCount, (last) => onPage(last, { replace: true }))

  return (
    <section className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-md border bg-background">
        <Table aria-label={s.tableLabel} className="text-sm">
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead
                  key={column}
                  className={column === s.columns.value ? 'whitespace-normal text-right' : 'whitespace-normal'}
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((fee) => (
              // Merchant and provider under the account, and the type wrapping, so the table fits at 1024 px; names,
              // figures and days stay on one line.
              <TableRow key={fee.feeId}>
                <TableCell className={WRAP}>
                  <Link
                    to="/accounts/$accountId/fees"
                    params={{ accountId: fee.account.id }}
                    className="whitespace-nowrap font-medium text-primary underline underline-offset-4"
                  >
                    {fee.account.name}
                  </Link>
                  {/* Breaks only after the separator: each name stays whole. */}
                  <span className="block text-muted-foreground">
                    <span className="whitespace-nowrap">{`${fee.merchant.name} ${s.hierarchySeparator}`}</span>{' '}
                    <span className="whitespace-nowrap">{fee.provider.name}</span>
                  </span>
                </TableCell>
                <TableCell className={WRAP}>{fee.title}</TableCell>
                <TableCell className="whitespace-nowrap">{feeAppliesTo(fee.feeTypeId, feeTypes)}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{formatFeeValue(fee)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatValidFrom(fee.startDate)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatValidTo(fee.endDate)}</TableCell>
                <TableCell>
                  <Badge variant={toneOf(FEE_STATUS_TONE, fee.status)}>{strings.status[fee.status]}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatAuditDate(auditInstant(fee.updatedAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.total === 0 && <p className="text-sm text-muted-foreground">{s.empty}</p>}
      <Pager
        summary={s.pageOf(page, pageCount, data.total)}
        canPrevious={page > 1}
        canNext={page < pageCount}
        onPrevious={() => {
          requestListFocus(FEES_LIST)
          onPage(page - 1)
        }}
        onNext={() => {
          requestListFocus(FEES_LIST)
          onPage(page + 1)
        }}
      />
    </section>
  )
}
