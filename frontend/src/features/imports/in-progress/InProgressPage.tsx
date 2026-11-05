import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { Pager, useLastPageLimit } from '@/components/Pager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useScopeSelection } from '@/features/accounts/scope-selection'
import type { ImportListItem, ImportListPage, ImportListQuery } from '@/lib/api/types'
import { auditInstant, formatAuditDateTime } from '@/lib/format'
import { ListHeading, requestListFocus } from '@/lib/list-focus'
import { IMPORT_STATUS_TONE, toneOf } from '@/lib/status-tone'
import { CancelImportDialog } from '../CancelImportDialog'
import { importListQuery } from '../queries'
import { strings } from '../strings'
import type { InProgressSearch } from '../validate-search'
import { InProgressFilters, type InProgressFiltersPatch } from './InProgressFilters'

const s = strings.inProgress
const PAGE_SIZE = 50
/** The name of the In Progress list for requestListFocus. */
const IN_PROGRESS_LIST = 'imports-in-progress'
/** A text cell that may wrap: the shadcn cell does not by default. */
const WRAP = 'whitespace-normal'

/** What the screen asks GET /imports for the address: always the page and its size (spec "Pantalla In Progress"). */
function listQueryOf(search: InProgressSearch): ImportListQuery {
  const query: ImportListQuery = { page: search.page ?? 1, pageSize: PAGE_SIZE }
  if (search.status) query.status = search.status
  if (search.merchantId !== undefined) query.merchantId = String(search.merchantId)
  if (search.providerId !== undefined) query.providerId = String(search.providerId)
  if (search.accountId) query.accountId = search.accountId
  if (search.mine) query.mine = 'true'
  return query
}

/**
 * Reconciliation › In Progress (README §1.3, HU1 CA8; import-in-progress design D5): the open imports of every
 * account in scope, one page of the server at a time, to resume or cancel them. Everything shown is in the address.
 */
export function InProgressPage() {
  const search = useSearch({ from: '/app/reconciliations/in-progress' })
  const navigate = useNavigate({ from: '/reconciliations/in-progress' })
  const scope = useScopeSelection(search)
  const list = useQuery(importListQuery(listQueryOf(search), scope.state === 'ready'))
  // Said by the page: the row that was cancelled by someone else leaves the list with its dialog (D6).
  const [notice, setNotice] = useState<string | null>(null)
  const page = search.page ?? 1

  // A new filter is a new list: back to its first page.
  const onFilters = (patch: InProgressFiltersPatch) =>
    void navigate({ search: (prev: InProgressSearch) => ({ ...prev, ...patch, page: undefined }), resetScroll: false })
  const onPage = (next: number, options?: { replace?: boolean }) =>
    void navigate({
      search: (prev: InProgressSearch) => ({ ...prev, page: next > 1 ? next : undefined }),
      replace: options?.replace,
      resetScroll: false,
    })
  // The list is asked again by the mutation (useCancelImport invalidates it); here only the notice changes.
  // The row and its button leave the list either way: the focus goes to the heading of the list (review-diff M4).
  const onCancelled = (notCancellableStatus?: string) => {
    setNotice(notCancellableStatus === undefined ? null : strings.cancel.notCancellable(notCancellableStatus))
    requestListFocus(IN_PROGRESS_LIST)
  }

  let body: ReactNode
  if (scope.state === 'not_available') body = <p className="text-sm">{s.notAvailable}</p>
  else if (scope.state === 'error' || list.isError) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void (scope.state === 'error' ? scope.retry() : list.refetch())}
        >
          {strings.retry}
        </Button>
      </div>
    )
  } else if (list.data) {
    body = <InProgressTable data={list.data} page={page} onPage={onPage} onCancelled={onCancelled} />
  } else body = <Skeleton className="h-40 w-full" aria-label={s.loading} />

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <InProgressFilters search={search} scope={scope} onChange={onFilters} />
          {/* Above the table, so it is there while the next page loads (ui-polish design D13). */}
          <ListHeading
            name={IN_PROGRESS_LIST}
            focusKey={`${JSON.stringify(listQueryOf(search))}|${list.dataUpdatedAt}`}
            as="h2"
            className="font-medium"
          >
            {s.heading}
          </ListHeading>
          {notice && (
            <p role="status" className="text-sm text-destructive">
              {notice}
            </p>
          )}
          {body}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{s.note}</p>
    </section>
  )
}

function InProgressTable({
  data,
  page,
  onPage,
  onCancelled,
}: {
  data: ImportListPage
  page: number
  onPage: (page: number, options?: { replace?: boolean }) => void
  onCancelled: (notCancellableStatus?: string) => void
}) {
  // The page size the API answered with, not the one asked for.
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))
  useLastPageLimit(page, pageCount, (last) => onPage(last, { replace: true }))

  if (data.total === 0) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>{s.empty}</p>
        <Link to="/reconciliations/new" className="text-primary underline underline-offset-4">
          {s.startNew}
        </Link>
      </div>
    )
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-md border bg-background">
        <Table aria-label={s.tableLabel} className="text-sm">
          <TableHeader>
            <TableRow>
              {Object.values(s.columns).map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item) => (
              <InProgressRow key={item.importId} item={item} onCancelled={onCancelled} />
            ))}
          </TableBody>
        </Table>
      </div>
      <Pager
        summary={s.summary(page, pageCount, data.total)}
        canPrevious={page > 1}
        canNext={page < pageCount}
        onPrevious={() => {
          requestListFocus(IN_PROGRESS_LIST)
          onPage(page - 1)
        }}
        onNext={() => {
          requestListFocus(IN_PROGRESS_LIST)
          onPage(page + 1)
        }}
      />
    </section>
  )
}

function InProgressRow({
  item,
  onCancelled,
}: {
  item: ImportListItem
  onCancelled: (notCancellableStatus?: string) => void
}) {
  return (
    <TableRow>
      <TableCell className={WRAP}>
        <div className="whitespace-nowrap font-medium">{item.account.name}</div>
        <div className="text-xs text-muted-foreground">{s.hierarchy(item.merchant.name, item.provider.name)}</div>
      </TableCell>
      <TableCell>{item.fileCount}</TableCell>
      <TableCell>{item.rowsTotal ?? s.noRows}</TableCell>
      <TableCell>
        <Badge variant={toneOf(IMPORT_STATUS_TONE, item.status)}>{item.status}</Badge>
      </TableCell>
      <TableCell className={WRAP}>{item.createdBy.userName}</TableCell>
      <TableCell className={WRAP}>
        <DateTime value={item.createdAt} />
      </TableCell>
      <TableCell className={WRAP}>
        <DateTime value={item.updatedAt} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-start gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/imports/$importId" params={{ importId: item.importId }}>
              {s.resume}
            </Link>
          </Button>
          <CancelImportDialog detail={item} cancellable disabled={false} label={s.cancel} onCancelled={onCancelled} />
        </div>
      </TableCell>
    </TableRow>
  )
}

/** A date and time that may wrap only between the date and the time, never inside the date. */
function DateTime({ value }: { value: string }) {
  const text = formatAuditDateTime(auditInstant(value))
  const space = text.indexOf(' ')
  if (space === -1) return <span className="whitespace-nowrap">{text}</span>
  return (
    <>
      <span className="whitespace-nowrap">{text.slice(0, space)}</span>{' '}
      <span className="whitespace-nowrap">{text.slice(space + 1)}</span>
    </>
  )
}
