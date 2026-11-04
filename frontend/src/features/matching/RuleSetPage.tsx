import type { MatchingRuleSetDetail } from '@recon/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { useCanManageRules } from './permissions'
import { globalRulesQuery, ruleSetQuery } from './queries'
import { ColumnRulesTable, RowsToIgnore, RulesCard, SheetRulesTable } from './rule-tables'
import { strings } from './strings'

const s = strings.detail
const linkClass = 'text-primary underline underline-offset-4'

/** A malformed id (400) or a rule set missing or outside the scope (404): the same message, no data. */
const notAvailable = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 400)

function LinkedAccounts({ accounts }: { accounts: MatchingRuleSetDetail['accounts'] }) {
  return (
    <section aria-label={s.accounts}>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <h2 className="font-medium">{s.accounts}</h2>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{s.noAccounts}</p>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {accounts.map((account) => (
                <li key={account.accountId} className="flex items-center gap-1.5 [overflow-wrap:anywhere]">
                  <Link to="/accounts/$accountId" params={{ accountId: account.accountId }} className={linkClass}>
                    {account.name}
                  </Link>
                  {!account.isActive && <Badge variant="neutral">{strings.closed}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function HeaderActions({ ruleSet }: { ruleSet: MatchingRuleSetDetail }) {
  const canManage = useCanManageRules()
  if (!canManage) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm">
        {s.actions.rename}
      </Button>
      <Button variant="outline" size="sm">
        {ruleSet.isActive ? s.actions.deactivate : s.actions.activate}
      </Button>
    </div>
  )
}

/** Administration › Matching Rules › a rule set of a provider (web-admin-matching design D2, D3). */
export function RuleSetPage() {
  const { ruleSetId } = useParams({ from: '/app/matching-rules/$ruleSetId' })
  const ruleSet = useQuery(ruleSetQuery(ruleSetId))
  // The catalog of statuses only comes with the global rules; without it a status is shown by its id.
  const globals = useQuery(globalRulesQuery)
  const canManage = useCanManageRules()

  if (notAvailable(ruleSet.error)) return <p className="text-sm">{s.notAvailable}</p>
  if (ruleSet.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void ruleSet.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }

  const detail = ruleSet.data
  return (
    <section className="flex flex-col gap-4">
      <section aria-label={s.headerLabel} className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 text-2xl font-semibold [overflow-wrap:anywhere]">
              {detail ? detail.name : s.titleLoading}
            </h1>
            {detail && (
              <Badge variant={detail.isActive ? 'success' : 'neutral'}>
                {detail.isActive ? strings.active : strings.inactive}
              </Badge>
            )}
          </div>
          {detail ? (
            <p className="text-sm text-muted-foreground">{detail.provider.name}</p>
          ) : (
            <Skeleton className="h-4 w-48" aria-label={s.loading} />
          )}
        </div>
        {detail && <HeaderActions ruleSet={detail} />}
      </section>
      {detail ? (
        <>
          <LinkedAccounts accounts={detail.accounts} />
          <RulesCard
            title={strings.tables.sheets}
            actions={
              canManage && (
                <Button size="sm" variant="outline">
                  {s.actions.edit}
                </Button>
              )
            }
          >
            <SheetRulesTable rules={detail.sheetRules} statuses={globals.data?.statuses} />
          </RulesCard>
          <RulesCard title={strings.tables.columns}>
            <ColumnRulesTable rules={detail.columnRules} />
          </RulesCard>
          <RowsToIgnore rules={detail.rowIgnoreRules} />
        </>
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </section>
  )
}
